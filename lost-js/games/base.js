'use strict';
/** BaseGame — shared logic for every game (DRY). */
const config = require('../config');

class BaseGame {
  constructor(bot, channel, guildId, playerIds, lang = 'en') {
    this.bot = bot;
    this.channel = channel;
    this.guildId = guildId;
    this.players = [...playerIds];
    this.lang = lang;
    this.finished = false;
    this.message = null;
    this.key = 'game';
  }

  /** Start the game. If `interaction` is given, reuse its message. */
  async start(_interaction) {
    throw new Error('start() must be implemented');
  }

  /** Free the channel so a new lobby/game can start. */
  release() {
    this.bot.activeChannels.delete(this.channel.id);
  }

  /** Mark finished, award points to winners, log the game. Returns points per winner. */
  async finish(winnerIds) {
    this.finished = true;
    this.release();
    const pts = parseInt(this.bot.db.getSetting(this.guildId, 'win_points', String(config.DEFAULT_WIN_POINTS)), 10);
    for (const uid of winnerIds) this.bot.db.addPoints(uid, this.guildId, pts, Math.floor(pts / 2));
    this.bot.db.logGame(this.guildId, this.key, winnerIds.length ? winnerIds[0] : null);
    return pts;
  }
}

module.exports = { BaseGame };
