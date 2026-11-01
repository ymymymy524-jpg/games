'use strict';
/** Utility: /points /top /store */
const { Colors } = require('../config');
const embeds = require('../core/embeds');
const { tr } = require('../core/utils');

module.exports = [
  {
    key: 'points', slash: 'points', emoji: '💰',
    names: { en: ['points'], ar: ['نقاط', 'رصيد'] },
    desc: { en: 'Check balance', ar: 'رصيد اللاعب' },
    slashDescription: "💰 Check a player's balance",
    usage: 'points [@user]',
    options: [{ name: 'member', type: 'user', required: false, description: 'Player to look up (default: you)' }],
    guildOnly: true,
    async run(ctx, { member }) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      const target = member || ctx.member;
      const p = bot.db.getPlayer(target.id, ctx.guildId);
      const rank = bot.db.getRank(target.id, ctx.guildId);
      const e = embeds.base(tr(lang, 'points_title', { name: target.displayName }), null, Colors.PRIMARY)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: `🏆 ${tr(lang, 'f_points')}`, value: `**${p.points}**`, inline: true },
          { name: `🪙 ${tr(lang, 'f_coins')}`, value: `**${p.coins}**`, inline: true },
          { name: `📊 ${tr(lang, 'f_rank')}`, value: `**#${rank}**`, inline: true },
        );
      await ctx.send({ embeds: [e] });
    },
  },
  {
    key: 'top', slash: 'top', emoji: '🏆',
    names: { en: ['top'], ar: ['توب', 'ترتيب'] },
    desc: { en: 'Leaderboard', ar: 'التوب' },
    slashDescription: '🏆 Server leaderboard',
    usage: 'top',
    guildOnly: true,
    async run(ctx) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      const rows = bot.db.top(ctx.guildId, 10);
      if (!rows.length) return ctx.send({ embeds: [embeds.info(tr(lang, 'top_empty'), tr(lang, 'top_title'))] });
      const medals = ['🥇', '🥈', '🥉'];
      const lines = rows.map((r, i) => `${i < 3 ? medals[i] : `\`#${i + 1}\``} <@${r.user_id}> — **${r.points}** 🏆`);
      return ctx.send({ embeds: [embeds.base(tr(lang, 'top_title'), lines.join('\n'), Colors.PURPLE)] });
    },
  },
  {
    key: 'store', slash: 'store', emoji: '🛒',
    names: { en: ['store'], ar: ['متجر', 'المتجر'] },
    desc: { en: 'Browse the store', ar: 'المتجر' },
    slashDescription: '🛒 Browse the store',
    usage: 'store',
    guildOnly: true,
    async run(ctx) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      const items = bot.db.storeItems();
      if (!items.length) return ctx.send({ embeds: [embeds.info(tr(lang, 'store_empty'), tr(lang, 'store_title'))] });
      const e = embeds.base(tr(lang, 'store_title'), null, Colors.PURPLE);
      for (const it of items) {
        e.addFields({
          name: `${it.name} — ${tr(lang, 'store_price', { p: it.price })}`,
          value: it.description || '—',
          inline: false,
        });
      }
      return ctx.send({ embeds: [e] });
    },
  },
];
