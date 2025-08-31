require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { ensureContainers, ensurePermanentPolicyIfNeeded } = require('./config/azure');
const { apiKeyAuth } = require('./middleware/auth');
const storageRoutes = require('./routes/storage.routes');
const logger = require('./utils/logger');
const { scheduleBackupJob } = require('./jobs/backup.job');

const app = express();

// Security & perf middleware
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// CORS
const allowed = (process.env.ALLOW_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowed.length ? allowed : true }));

// Health
app.get('/health', (req, res) => res.json({ ok: true }));
// Auth + routes
app.use('/api', apiKeyAuth, storageRoutes);

const port = process.env.PORT || 4004;

(async () => {
  try {
    await ensureContainers();

    // Create stored access policy if you plan to use permanent SAS
    await ensurePermanentPolicyIfNeeded();

    // Start cron for backups
    scheduleBackupJob();

    app.listen(port, () => logger.info(`Storage Service listening on :${port}`));
  } catch (err) {
    logger.error('Startup error', err);
    process.exit(1);
  }
})();
