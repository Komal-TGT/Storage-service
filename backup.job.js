const cron = require('node-cron');
const logger = require('../utils/logger');
const { runBackupOnce } = require('../services/blob.service');

function scheduleBackupJob() {
  // Run every hour at minute 10. Adjust as needed.
  cron.schedule('10 * * * *', async () => {
    try {
      logger.info('Backup job started');
      await runBackupOnce();
      logger.info('Backup job finished');
    } catch (e) {
      logger.error('Backup job error: ' + e.message);
    }
  });
}

module.exports = { scheduleBackupJob };
