import app from './app';
import { env } from './config';
import { connectDB } from './config/db';
import { cleanupJob } from './core/jobs/cleanup.job';

const startServer = async () => {
  await connectDB();
  
  // Start background retention scheduler
  cleanupJob.startScheduler();
  
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer();
