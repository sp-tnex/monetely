import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import http from 'http';
import app from './app';
import { env } from './config';
import { connectDB } from './config/db';
import { cleanupJob } from './core/jobs/cleanup.job';
import { reminderJob } from './core/jobs/reminder.job';
import { rssRefreshJob } from './core/jobs/rss-refresh.job';
import { initSocket } from './core/socket/socket';

const startServer = async () => {
  await connectDB();
  
  // Start background retention scheduler
  cleanupJob.startScheduler();

  // Start background automated UPI settlement reminder scheduler
  reminderJob.startScheduler();

  rssRefreshJob.startScheduler();
  
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer();
