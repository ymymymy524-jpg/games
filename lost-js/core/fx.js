'use strict';
/** Visual effects helpers: modern shapes, progress bars, countdown, confetti. */
const { Colors } = require('../config');
const { sleep } = require('./utils');

const FILLED = '▰';
const EMPTY = '▱';
const SPINNER = ['◐', '◓', '◑', '◒'];
const CONFETTI = '✦ ･ﾟ✧ 🎉 ✧ﾟ･ ✦';
const DIVIDER = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

/** Modern progress bar: ▰▰▰▱▱▱ */
function bar(value, total, width = 12) {
  const n = total ? Math.round((width * value) / total) : 0;
  return FILLED.repeat(n) + EMPTY.repeat(width - n);
}

const spinner = (i) => SPINNER[((i % SPINNER.length) + SPINNER.length) % SPINNER.length];

/** Animated 3 → 2 → 1 → GO. Returns the message so the caller can edit it. */
async function countdown(ctx, title, n = 3) {
  const embeds = require('./embeds'); // lazy: avoids circular import
  const msg = await ctx.send({ embeds: [embeds.base(title, `# ◖ ${n} ◗`, Colors.PURPLE)] });
  for (let i = n - 1; i > 0; i--) {
    await sleep(1000);
    await msg.edit({ embeds: [embeds.base(title, `# ◖ ${i} ◗`, Colors.PURPLE)] });
  }
  await sleep(1000);
  await msg.edit({ embeds: [embeds.base(title, '# ✦ GO ✦', Colors.SUCCESS)] });
  await sleep(500);
  return msg;
}

module.exports = { FILLED, EMPTY, SPINNER, CONFETTI, DIVIDER, bar, spinner, countdown };
