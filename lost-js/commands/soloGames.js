'use strict';
/** Solo games: /math /typing /flags */
const config = require('../config');
const { Colors } = config;
const embeds = require('../core/embeds');
const fx = require('../core/fx');
const { tr, gameEnabled, norm, isAscii } = require('../core/utils');

const WORDS = ['python', 'discord', 'keyboard', 'galaxy', 'lightning', 'adventure', 'champion', 'rocket',
  'ثعلب', 'مغامرة', 'صاروخ', 'بطولة', 'كيبورد', 'مجرة'];
const FLAGS = [
  ['🇪🇬', ['egypt', 'مصر']], ['🇸🇦', ['saudi arabia', 'السعودية']], ['🇫🇷', ['france', 'فرنسا']],
  ['🇯🇵', ['japan', 'اليابان']], ['🇧🇷', ['brazil', 'البرازيل']], ['🇩🇪', ['germany', 'ألمانيا', 'المانيا']],
  ['🇹🇷', ['turkey', 'تركيا']], ['🇺🇸', ['united states', 'usa', 'america', 'أمريكا', 'امريكا']],
  ['🇮🇹', ['italy', 'إيطاليا', 'ايطاليا']], ['🇪🇸', ['spain', 'إسبانيا', 'اسبانيا']],
  ['🇨🇦', ['canada', 'كندا']], ['🇮🇳', ['india', 'الهند']],
];
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** Shared round logic: countdown → question → wait for the player's next message. */
async function runSolo(ctx, key, question, title, isCorrect, answerText, timeoutSec = 15) {
  const { bot } = ctx;
  const lang = bot.getLang(ctx.guildId);
  if (!gameEnabled(bot.db, ctx.guildId, key)) {
    return ctx.send({ embeds: [embeds.error(tr(lang, 'game_disabled'))], ephemeral: true });
  }
  const msg = await fx.countdown(ctx, title, 3);
  await msg.edit({ embeds: [embeds.base(title, question, Colors.PRIMARY)] });
  const started = Date.now();

  // the answer must not be treated as a command by the dispatcher
  const pendingKey = `${ctx.channel.id}:${ctx.author.id}`;
  bot.pendingAnswers.add(pendingKey);
  let answer;
  try {
    const got = await ctx.channel.awaitMessages({
      filter: (m) => m.author.id === ctx.author.id,
      max: 1,
      time: timeoutSec * 1000,
    });
    answer = got.first();
  } finally {
    bot.pendingAnswers.delete(pendingKey);
  }
  if (!answer) return ctx.send({ embeds: [embeds.warning(tr(lang, 'solo_timeout'))] });

  if (isCorrect(answer.content.trim().toLowerCase())) {
    const pts = parseInt(bot.db.getSetting(ctx.guildId, 'win_points', String(config.DEFAULT_WIN_POINTS)), 10);
    bot.db.addPoints(ctx.author.id, ctx.guildId, pts, Math.floor(pts / 2));
    bot.db.logGame(ctx.guildId, key, ctx.author.id);
    const t = ((Date.now() - started) / 1000).toFixed(1);
    return ctx.send({ embeds: [embeds.success(tr(lang, 'solo_right', { t, pts }))] });
  }
  bot.db.logGame(ctx.guildId, key, null);
  return ctx.send({ embeds: [embeds.error(tr(lang, 'solo_wrong', { a: answerText }))] });
}

module.exports = [
  {
    key: 'math', slash: 'math', emoji: '🧮',
    names: { en: ['math'], ar: ['رياضيات', 'حساب'] },
    desc: { en: 'Solve an equation', ar: 'حل معادلة' },
    slashDescription: '🧮 Solve the equation',
    usage: 'math',
    guildOnly: true,
    async run(ctx) {
      const lang = ctx.bot.getLang(ctx.guildId);
      const a = randInt(2, 20);
      const b = randInt(2, 20);
      const op = pick(['+', '-', '×']);
      const ans = { '+': a + b, '-': a - b, '×': a * b }[op];
      return runSolo(ctx, 'math', tr(lang, 'solo_math', { q: `${a} ${op} ${b}` }), '🧮 Math',
        (t) => t === String(ans), String(ans));
    },
  },
  {
    key: 'typing', slash: 'typing', emoji: '⌨️',
    names: { en: ['typing'], ar: ['كتابة', 'اكتب'] },
    desc: { en: 'Type the word fast', ar: 'اكتب الكلمة بسرعة' },
    slashDescription: '⌨️ Type the word fast',
    usage: 'typing',
    guildOnly: true,
    async run(ctx) {
      const lang = ctx.bot.getLang(ctx.guildId);
      const word = pick(WORDS.filter((w) => isAscii(w) === (lang === 'en')));
      return runSolo(ctx, 'typing', tr(lang, 'solo_typing', { w: word }), '⌨️ Typing',
        (t) => t === word, word, 10);
    },
  },
  {
    key: 'flags', slash: 'flags', emoji: '🏳️',
    names: { en: ['flags'], ar: ['اعلام', 'علم'] },
    desc: { en: 'Guess the flag', ar: 'خمّن العلم' },
    slashDescription: '🏳️ Guess the country from the flag',
    usage: 'flags',
    guildOnly: true,
    async run(ctx) {
      const lang = ctx.bot.getLang(ctx.guildId);
      const [flag, names] = pick(FLAGS);
      const aliases = new Set(names.map(norm));
      return runSolo(ctx, 'flags', tr(lang, 'solo_flags', { f: flag }), '🏳️ Flags',
        (t) => aliases.has(norm(t)), lang === 'ar' ? names[1] : titleCase(names[0]));
    },
  },
];
