const pool = require('../config/db');
const os = require('os');

const PLACEHOLDER_MSG = 'Backup tools are UI-only in Phase 3 and are not active yet.';

async function health(req, res, next) {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      data: {
        api_status: 'healthy',
        database_status: 'connected',
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        node_version: process.version,
        platform: os.platform(),
        environment: process.env.NODE_ENV || 'development',
        last_backup: null,
        placeholder: true,
      },
    });
  } catch (err) {
    res.json({
      success: true,
      data: {
        api_status: 'degraded',
        database_status: 'disconnected',
        error: err.message,
        placeholder: true,
      },
    });
  }
}

function backupStatus(req, res) {
  res.json({
    success: true,
    placeholder: true,
    message: PLACEHOLDER_MSG,
    data: {
      last_backup: null,
      last_backup_size: null,
      auto_backup_enabled: false,
      backup_schedule: 'Not configured',
      available_backups: [],
    },
  });
}

function createBackup(req, res) {
  res.status(200).json({
    success: false,
    placeholder: true,
    message: PLACEHOLDER_MSG,
  });
}

function restoreBackup(req, res) {
  res.status(200).json({
    success: false,
    placeholder: true,
    message: PLACEHOLDER_MSG,
  });
}

module.exports = { health, backupStatus, createBackup, restoreBackup };
