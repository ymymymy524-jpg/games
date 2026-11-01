'use strict';
/** Lucky wheel — animated slot-style reel that slows down on the winner. */
const { Colors } = require('../config');
const embeds = require('../core/embeds');
const fx = require('../core/fx');
const { tr, sleep, mod, shuffle } = require('../core/utils');
const { BaseGame } = require('./base');

const DELAYS = [800, 800, 800, 800, 1000, 1200, 1500]; // slows down like a real wheel

class RouletteGame extends BaseGame {
  constructor(...args) {
    super(...args);
    this.key = 'roulette';
  }

  async start(_interaction = null) {
    const { lang } = this;
    const title = tr(lang, 'roulette_title');
    const order = shuffle(this.players);
    const n = order.length;
    const winner = order[Math.floor(Math.random() * n)];
    const w = order.indexOf(winner);
    const frames = DELAYS.length + 1;
    const begin = mod(w - (frames - 1), n); // last frame lands exactly on the winner

    const frame = (k) => {
      const top = order[mod(k - 1, n)];
      const mid = order[mod(k, n)];
      const bot = order[mod(k + 1, n)];
      const body =
        `${fx.spinner(k)} ${tr(lang, 'roulette_spin')}\n\n` +
        `◇ <@${top}>\n**◆ <@${mid}>**  ◀\n◇ <@${bot}>`;
      return embeds.base(title, body, Colors.PURPLE);
    };

    const msg = await this.channel.send({ embeds: [frame(begin)] });
    for (let i = 1; i <= DELAYS.length; i++) {
      await sleep(DELAYS[i - 1]);
      await msg.edit({ embeds: [frame(begin + i)] });
    }
    await sleep(800);
    const pts = await this.finish([winner]);
    const text = `${tr(lang, 'roulette_win', { uid: winner, pts })}\n${fx.CONFETTI}`;
    await msg.edit({ embeds: [embeds.base(title, text, Colors.SUCCESS)] });
  }
}

module.exports = { RouletteGame };
