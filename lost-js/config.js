'use strict';
/** Lost Bot — global configuration & design tokens. */
require('dotenv').config();
const path = require('node:path');

const VERSION = '1.0';

module.exports = {
  BASE_DIR: __dirname,
  TOKEN: process.env.DISCORD_TOKEN || '',
  DEFAULT_PREFIX: process.env.DEFAULT_PREFIX || '!',
  DEFAULT_LANGUAGE: 'en',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, 'data', 'lost.db'),
  DEV_GUILD_ID: process.env.DEV_GUILD_ID || null,

  VERSION,
  MAX_PLAYERS: 99,
  DEFAULT_WIN_POINTS: 10,
  LOBBY_TIMEOUT: 300, // seconds

  AUTHOR_NAME: '🎮 LOST • Games Bot',
  FOOTER_TEXT: `Lost © 2026 • v${VERSION}`,

  EMBED_COLOR: 0xffffff, // لون البار الجانبي لكل الـ Embeds (أبيض)

  Colors: {
    PRIMARY: 0x5865f2,
    PURPLE: 0x7b2fbe,
    SUCCESS: 0x57f287,
    DANGER: 0xed4245,
    WARNING: 0xfee75c,
  },
};
