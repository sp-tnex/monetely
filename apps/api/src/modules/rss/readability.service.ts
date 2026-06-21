import * as cheerio from 'cheerio';
import { articleRepository } from './article.repository';
import logger from '../../utils/logger';

export class ReadabilityService {
  /**
   * Fetch original article webpage, extract clean body content, and cache it.
   */
  async fetchAndExtract(articleId: string): Promise<string> {
    const article = await articleRepository.findById(articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    if (article.content && article.content.length > 1000 && article.content.includes('<p>')) {
      return article.content;
    }

    let targetLink = article.link;
    if (targetLink.includes('news.google.com')) {
      try {
        logger.info(`Detected Google News URL, resolving redirect: ${targetLink}`);
        const resolved = await this.resolveGoogleNewsUrl(targetLink);
        if (resolved && resolved !== targetLink) {
          logger.info(`Successfully resolved Google News URL to: ${resolved}`);
          targetLink = resolved;
          await articleRepository.updateById(articleId, { link: resolved });
        }
      } catch (err: any) {
        logger.error(`Failed to resolve Google News URL: ${err.message || err}`);
      }
    }

    logger.info(`Fetching full article content from: ${targetLink}`);
    try {
      const response = await fetch(targetLink, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const html = await response.text();
      const cleanHtml = this.extractReadableContent(html);

      if (cleanHtml && cleanHtml.length > 150) {
        await articleRepository.updateById(articleId, { content: cleanHtml });
        logger.info(`Successfully cached full article text for: "${article.title}" (${cleanHtml.length} chars)`);
        return cleanHtml;
      }
    } catch (err: any) {
      logger.error(`Failed to extract full article text from ${article.link}:`, err.message || err);
    }

    return article.content || article.description || 'Full article text could not be extracted.';
  }

  /**
   * Extract and sanitize the core news content from raw HTML
   */
  private extractReadableContent(html: string): string {
    const $ = cheerio.load(html);

    $('script, style, iframe, noscript, embed, object, svg, canvas, form, input, button, nav, header, footer, aside').remove();

    const selectors = [
      'article',
      '[itemprop="articleBody"]',
      '.article-content',
      '.entry-content',
      '.post-content',
      '.post-entry',
      '.article-body',
      '#article-body',
      '.story-content',
      '.main-content',
      'main'
    ];

    let contentContainer: cheerio.Cheerio<any> | null = null;

    for (const selector of selectors) {
      const el = $(selector);
      if (el.length > 0) {
        let bestEl = el.first();
        let maxPCount = bestEl.find('p').length;
        
        el.each((_, item) => {
          const currentPCount = $(item).find('p').length;
          if (currentPCount > maxPCount) {
            maxPCount = currentPCount;
            bestEl = $(item);
          }
        });

        if (bestEl.text().trim().length > 300) {
          contentContainer = bestEl;
          break;
        }
      }
    }

    if (!contentContainer) {
      let bestDiv: cheerio.Cheerio<any> | null = null;
      let maxScore = 0;

      $('div').each((_, div) => {
        const pCount = $(div).find('p').length;
        const textLength = $(div).text().trim().length;
        
        const score = pCount * 10 + Math.min(100, textLength / 50);
        
        if (score > maxScore && textLength > 400) {
          maxScore = score;
          bestDiv = $(div);
        }
      });

      if (bestDiv) {
        contentContainer = bestDiv;
      }
    }

    if (!contentContainer) {
      return '';
    }

    const cleanContainer = contentContainer.clone();

    const trashKeywords = [
      'ad', 'advertisement', 'social-share', 'share-buttons', 'newsletter', 
      'popup', 'banner', 'tracking', 'sidebar', 'promo', 'sponsored', 
      'recommended', 'outbrain', 'taboola', 'disqus', 'comment', 
      'subscribe', 'related', 'widget', 'author-bio'
    ];

    cleanContainer.find('*').each((_, child) => {
      const id = $(child).attr('id')?.toLowerCase() || '';
      const className = $(child).attr('class')?.toLowerCase() || '';

      const isTrash = trashKeywords.some(keyword => {
        const regex = new RegExp(`(^|[-_])${keyword}([-_]|$)`, 'i');
        return regex.test(id) || regex.test(className);
      });

      if (isTrash) {
        $(child).remove();
      }
    });

    cleanContainer.find('img').each((_, img) => {
      const width = $(img).attr('width');
      const height = $(img).attr('height');
      const src = $(img).attr('src') || '';

      if (
        width === '1' || 
        height === '1' || 
        src.includes('pixel') || 
        src.startsWith('data:image/gif;base64,R0lGODlhAQ')
      ) {
        $(img).remove();
      } else {
        $(img).addClass('max-w-full h-auto my-4 rounded-lg shadow-sm mx-auto object-cover');
        $(img).removeAttr('style');
      }
    });

    cleanContainer.find('*').each((_, node) => {
      const attribs = node.attribs;
      if (attribs) {
        Object.keys(attribs).forEach(attr => {
          if (attr.startsWith('on') || attr === 'style' || attr === 'align') {
            $(node).removeAttr(attr);
          }
        });
      }
    });

    cleanContainer.find('a').each((_, link) => {
      const text = $(link).text().trim();
      const href = $(link).attr('href') || '';
      
      if (!href || href.includes('doubleclick') || href.includes('adclick') || (text.length === 0 && $(link).find('img').length === 0)) {
        $(link).remove();
      } else {
        $(link).attr('target', '_blank');
        $(link).attr('rel', 'noopener noreferrer');
        $(link).addClass('text-primary hover:underline font-medium');
      }
    });

    cleanContainer.find('p, div, span').each((_, node) => {
      if ($(node).text().trim().length === 0 && $(node).find('img, iframe').length === 0) {
        $(node).remove();
      }
    });

    cleanContainer.find('p').addClass('my-3.5 leading-relaxed text-xs text-foreground/90');
    cleanContainer.find('h1, h2, h3, h4').addClass('font-bold text-foreground mt-6 mb-3 leading-snug');
    cleanContainer.find('ul, ol').addClass('list-disc list-inside my-4 pl-4 text-xs text-foreground/90 space-y-1.5');
    cleanContainer.find('li').addClass('leading-relaxed');
    cleanContainer.find('blockquote').addClass('border-l-4 border-primary/40 pl-4 py-1 my-4 italic text-muted-foreground bg-secondary/10 rounded-r-md');

    return cleanContainer.html() || '';
  }

  /**
   * Resolves a Google News redirect URL to the original publisher URL.
   */
  private async resolveGoogleNewsUrl(sourceUrl: string): Promise<string> {
    try {
      const url = new URL(sourceUrl);
      const path = url.pathname.split('/');
      
      if (
        url.hostname !== 'news.google.com' ||
        path.length < 2 ||
        (path[path.length - 2] !== 'articles' && path[path.length - 2] !== 'read')
      ) {
        return sourceUrl;
      }
      
      const base64Str = path[path.length - 1];
      
      const params = await this.fetchDecodingParams(base64Str);
      if (!params.signature || !params.timestamp) {
        logger.warn(`Could not extract signature parameters for Google News base64: ${base64Str}`);
        return sourceUrl;
      }
      
      const decodedUrl = await this.executeDecodeRpc(base64Str, params.timestamp, params.signature);
      if (decodedUrl) {
        return decodedUrl;
      }
      
      return sourceUrl;
    } catch (err: any) {
      logger.error(`Error in resolveGoogleNewsUrl: ${err.message || err}`);
      return sourceUrl;
    }
  }

  /**
   * Fetches signature and timestamp required for decoding from Google News article page.
   */
  private async fetchDecodingParams(base64Str: string): Promise<{ signature?: string; timestamp?: string }> {
    const urls = [
      `https://news.google.com/articles/${base64Str}`,
      `https://news.google.com/rss/articles/${base64Str}`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          }
        });
        if (!response.ok) continue;

        const html = await response.text();
        const $ = cheerio.load(html);
        const dataElement = $('c-wiz div[jscontroller]');
        if (dataElement.length > 0) {
          const signature = dataElement.attr('data-n-a-sg');
          const timestamp = dataElement.attr('data-n-a-ts');
          if (signature && timestamp) {
            return { signature, timestamp };
          }
        }
      } catch (err: any) {
        logger.debug(`fetchDecodingParams failed for URL ${url}: ${err.message || err}`);
      }
    }

    return {};
  }

  /**
   * Executes the batchexecute RPC request to resolve the URL.
   */
  private async executeDecodeRpc(base64Str: string, timestamp: string, signature: string): Promise<string | null> {
    try {
      const url = 'https://news.google.com/_/DotsSplashUi/data/batchexecute';
      const innerPayload = [
        'Fbv4je',
        `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${base64Str}",${timestamp},"${signature}"]`
      ];
      const payloadStr = JSON.stringify([[innerPayload]]);
      const body = `f.req=${encodeURIComponent(payloadStr)}`;

      const response = await fetch(`${url}?rpcids=Fbv4je`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body
      });

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const text = await response.text();
      const parts = text.split('\n\n');
      if (parts.length < 2) {
        throw new Error('Invalid batchexecute response structure');
      }

      const parsedData = JSON.parse(parts[1]);
      const rpcResponse = parsedData.find((item: any) => Array.isArray(item) && item[1] === 'Fbv4je');
      if (!rpcResponse || !rpcResponse[2]) {
        throw new Error('RPC response or payload not found in batch execute result');
      }

      const decodedPayload = JSON.parse(rpcResponse[2]);
      const decodedUrl = decodedPayload[1];
      if (typeof decodedUrl === 'string' && decodedUrl.startsWith('http')) {
        return decodedUrl;
      }

      return null;
    } catch (err: any) {
      logger.error(`executeDecodeRpc error: ${err.message || err}`);
      return null;
    }
  }
}

export const readabilityService = new ReadabilityService();
