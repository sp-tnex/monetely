import { readabilityService } from '../readability.service';
import { articleRepository } from '../article.repository';
import mongoose from 'mongoose';

jest.mock('../article.repository', () => ({
  articleRepository: {
    findById: jest.fn(),
    updateById: jest.fn(),
  },
}));

const originalFetch = global.fetch;

describe('ReadabilityService', () => {
  const articleId = new mongoose.Types.ObjectId().toString();
  const articleLink = 'https://techcrunch.com/2026/06/21/monetely-rss-reader';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('fetchAndExtract', () => {
    it('should return already cached full article content if it exists and looks valid', async () => {
      const existingFullContent = '<p>This is a cached full article text with paragraph tags and is long enough.</p>' + 'a'.repeat(1000);
      (articleRepository.findById as jest.Mock).mockResolvedValue({
        _id: articleId,
        link: articleLink,
        content: existingFullContent,
      });

      const result = await readabilityService.fetchAndExtract(articleId);

      expect(result).toBe(existingFullContent);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(articleRepository.updateById).not.toHaveBeenCalled();
    });

    it('should fetch original URL, parse clean HTML, cache it, and return sanitized content', async () => {
      const mockHtml = `
        <html>
          <body>
            <header>
              <nav>Header Nav</nav>
            </header>
            <main class="main-content">
              <article>
                <h1>Monetely Launch</h1>
                <p>Welcome to Monetely RSS Reader. We support beautiful ad-free layouts. This is a very long paragraph to ensure that the content extraction heuristic meets the required length threshold of 300 characters. We want to verify that our article extractor successfully parses, purifies, and formats our text while discarding all tracking elements and promotional links. By writing a long body, we can easily satisfy the minimum text length requirement and prevent fallback behavior in the test environment.</p>
                <div class="newsletter-signup-container">Subscribe to our newsletter!</div>
                <div class="ad-banner">Sponsored Ad</div>
                <script>console.log('tracker');</script>
                <img src="https://example.com/pixel.png" width="1" height="1" />
                <img src="https://example.com/hero.jpg" alt="Hero image" />
                <a href="https://example.com/ad-click?id=123" class="ad-link">Click here</a>
                <a href="https://example.com/story">Read more details</a>
              </article>
            </main>
            <footer>Footer details</footer>
          </body>
        </html>
      `;

      (articleRepository.findById as jest.Mock).mockResolvedValue({
        _id: articleId,
        link: articleLink,
        title: 'Monetely Launch',
        content: '',
        description: 'Short desc',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const result = await readabilityService.fetchAndExtract(articleId);

      expect(global.fetch).toHaveBeenCalledWith(articleLink, expect.any(Object));
      expect(articleRepository.updateById).toHaveBeenCalledWith(articleId, {
        content: expect.any(String),
      });

      expect(result).toContain('Welcome to Monetely RSS Reader');
      expect(result).toContain('hero.jpg');
      expect(result).toContain('Read more details');

      expect(result).not.toContain('Header Nav');
      expect(result).not.toContain('Footer details');
      expect(result).not.toContain('newsletter-signup-container');
      expect(result).not.toContain('ad-banner');
      expect(result).not.toContain('console.log');
      expect(result).not.toContain('pixel.png');
      expect(result).not.toContain('ad-click');

      expect(result).toContain('class="max-w-full h-auto my-4 rounded-lg shadow-sm mx-auto object-cover"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should resolve Google News URL and update the article link before fetching content', async () => {
      const googleNewsUrl = 'https://news.google.com/articles/CBMi_some_base64_id?oc=5';
      const resolvedUrl = 'https://resolved-real-publisher.com/article';
      const mockArticle = {
        _id: articleId,
        link: googleNewsUrl,
        content: '',
        description: 'Google News article description',
      };

      (articleRepository.findById as jest.Mock).mockResolvedValue(mockArticle);
      (articleRepository.updateById as jest.Mock).mockResolvedValue({});

      const mockGoogleHtml = `
        <html>
          <body>
            <c-wiz>
              <div jscontroller="wiz" data-n-a-sg="AVvZt-signature" data-n-a-ts="1782000000"></div>
            </c-wiz>
          </body>
        </html>
      `;

      const mockBatchExecuteResponse = `
)j]}'\n\n[
  [
    "wrb.fr",
    "Fbv4je",
    "[\\"garturlres\\",\\"${resolvedUrl}\\\",1]",
    null,
    null,
    null,
    ""
  ]
]
      `;

      const mockRealArticleHtml = `
        <html>
          <body>
            <article>
              <p>This is the resolved article content. It is long enough to satisfy our extraction heuristic and verify that Google News redirects are resolved correctly before readability cleaning. We need to write a very long text here because the readability parser requires at least 300 characters in the main container to match the selector, otherwise it will try a fallback which requires 400 characters. By making this mock text sufficiently long, we ensure the article parser successfully detects the article content and saves it to the database.</p>
            </article>
          </body>
        </html>
      `;

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('news.google.com/articles/')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockGoogleHtml),
          } as any);
        } else if (url.includes('batchexecute')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockBatchExecuteResponse),
          } as any);
        } else if (url === resolvedUrl) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRealArticleHtml),
          } as any);
        }
        return Promise.reject(new Error('Unknown url: ' + url));
      });

      const result = await readabilityService.fetchAndExtract(articleId);

      expect(articleRepository.updateById).toHaveBeenCalledWith(articleId, { link: resolvedUrl });
      expect(articleRepository.updateById).toHaveBeenCalledWith(articleId, { content: expect.any(String) });
      expect(result).toContain('This is the resolved article content');
    });

    it('should fall back to description if fetch fails', async () => {
      (articleRepository.findById as jest.Mock).mockResolvedValue({
        _id: articleId,
        link: articleLink,
        title: 'Failed Fetch Article',
        content: '',
        description: 'Existing description fallback text.',
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      const result = await readabilityService.fetchAndExtract(articleId);

      expect(result).toBe('Existing description fallback text.');
      expect(articleRepository.updateById).not.toHaveBeenCalled();
    });
  });
});
