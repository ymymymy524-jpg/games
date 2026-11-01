'use strict';
/** Lost Bot entry point. */
const config = require('./config');
const log = require('./core/logger');

if (!config.TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing. Copy .env.example to .env and fill it.');
  process.exit(1);
}

const { LostBot } = require('./core/bot');
const bot = new LostBot();

// a failed Discord call must never crash the whole bot
process.on('unhandledRejection', (err) => log.error('Unhandled rejection', err));
process.on('uncaughtException', (err) => log.error('Uncaught exception', err));

const stop = async () => {
  log.info('Shutting down…');
  try { await bot.shutdown(); } finally { process.exit(0); }
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

bot.start().catch((err) => {
  log.error('Failed to start', err);
  process.exit(1);
});
