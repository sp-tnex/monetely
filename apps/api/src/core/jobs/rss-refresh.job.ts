import { Feed } from '../../modules/rss/feed.model';
import { rssService } from '../../modules/rss/rss.service';
import { getIO } from '../socket/socket';
import logger from '../../utils/logger';

export class RssRefreshJob {
  private isRunning = false;

  async runRefresh() {
    if (this.isRunning) {
      logger.info('RSS Refresh Job is already running, skipping this tick.');
      return;
    }

    this.isRunning = true;
    logger.info('Starting RSS Feeds Background Auto-Refresh Job...');

    try {
      const now = Date.now();
      const feeds = await Feed.find({ enabled: true }).exec();
      
      const dueFeeds = feeds.filter(feed => {
        if (!feed.lastFetched) return true;
        
        const elapsedMs = now - feed.lastFetched.getTime();
        
        switch (feed.refreshInterval) {
          case '15m':
            return elapsedMs >= 15 * 60 * 1000;
          case '1h':
            return elapsedMs >= 60 * 60 * 1000;
          case '1d':
            return elapsedMs >= 24 * 60 * 60 * 1000;
          default:
            return elapsedMs >= 60 * 60 * 1000;
        }
      });

      if (dueFeeds.length === 0) {
        logger.info('No RSS feeds are due for refresh.');
        this.isRunning = false;
        return;
      }

      logger.info(`Found ${dueFeeds.length} feeds due for auto-refresh.`);

      const batchSize = 5;
      for (let i = 0; i < dueFeeds.length; i += batchSize) {
        const batch = dueFeeds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (feed) => {
            try {
              logger.info(`Auto-refreshing feed: ${feed.title} (${feed.url})`);
              const newArticles = await rssService.fetchAndSyncFeed(feed);
              
              if (newArticles && newArticles.length > 0) {
                logger.info(`Feed "${feed.title}" received ${newArticles.length} new articles.`);
                
                try {
                  const io = getIO();
                  io.to(`user:${feed.userId.toString()}`).emit('rss:update', {
                    feedId: feed._id.toString(),
                    feedTitle: feed.title,
                    newCount: newArticles.length,
                    message: `New articles available for "${feed.title}"!`,
                  });
                } catch (ioErr) {
                }
              }
            } catch (feedErr: any) {
              logger.error(`Error auto-refreshing feed "${feed.title}":`, feedErr.message || feedErr);
            }
          })
        );
      }
    } catch (err: any) {
      logger.error('Error in RSS Refresh Job:', err.message || err);
    } finally {
      this.isRunning = false;
      logger.info('RSS Feeds Background Auto-Refresh Job finished.');
    }
  }

  startScheduler() {
    setInterval(() => {
      this.runRefresh().catch((err) => logger.error('Error in periodic RSS refresh runner:', err));
    }, 60 * 1000);
    setTimeout(() => {
      this.runRefresh().catch((err) => logger.error('Error in startup RSS refresh runner:', err));
    }, 15000);
  }
}

export const rssRefreshJob = new RssRefreshJob();
