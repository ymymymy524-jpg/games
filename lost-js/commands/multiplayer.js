'use strict';
/** Multiplayer: /xo (duel with @user OR team lobby up to 99), /roulette, /race */
const config = require('../config');
const embeds = require('../core/embeds');
const { tr, gameEnabled, shuffle } = require('../core/utils');
const { sendChallenge } = require('../core/views');
const { Lobby } = require('../games/lobby');
const { RouletteGame } = require('../games/roulette');
const { XOGame } = require('../games/xo');

async function openLobby(ctx, lang, { title, description, onStart }) {
  const { bot } = ctx;
  if (bot.activeChannels.has(ctx.channel.id)) {
    return ctx.send({ embeds: [embeds.warning(tr(lang, 'channel_busy'))], ephemeral: true });
  }
  const maxP = parseInt(bot.db.getSetting(ctx.guildId, 'max_players', String(config.MAX_PLAYERS)), 10);
  bot.activeChannels.add(ctx.channel.id);
  try {
    const lobby = new Lobby(bot, ctx.author, ctx.channel, { title, description, onStart, maxPlayers: maxP, lang });
    await lobby.open(ctx);
  } catch (err) {
    bot.activeChannels.delete(ctx.channel.id);
    throw err;
  }
  return undefined;
}

module.exports = [
  {
    key: 'xo', slash: 'xo', emoji: '❌',
    names: { en: ['xo'], ar: ['اكس_او', 'اكس'] },
    desc: { en: 'Tic-tac-toe duel', ar: 'إكس أو ثنائي' },
    descBySection: { multi: { en: 'Team XO lobby (up to 99)', ar: 'إكس أو جماعي (حتى 99)' } },
    slashDescription: '❌⭕ XO — duel a player, or open a team lobby (up to 99)',
    usage: 'xo @user',
    usageBySection: { multi: 'xo' },
    options: [{ name: 'opponent', type: 'user', required: false, description: 'Optional: challenge this player 1v1. Leave empty for a lobby.' }],
    guildOnly: true,
    async run(ctx, { opponent }) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      const key = opponent ? 'xo' : 'xo_multi';
      if (!gameEnabled(bot.db, ctx.guildId, key)) {
        return ctx.send({ embeds: [embeds.error(tr(lang, 'game_disabled'))], ephemeral: true });
      }

      if (opponent) { // ---- 1v1 duel ----
        const accept = (interaction) =>
          new XOGame(bot, ctx.channel, ctx.guildId, { X: [ctx.author.id], O: [opponent.id] }, lang).start(interaction);
        return sendChallenge(bot, ctx, opponent, 'XO', lang, accept);
      }

      // ---- team lobby ----
      const onStart = async (lobby) => {
        const ids = shuffle(lobby.players);
        const teams = { X: ids.filter((_, i) => i % 2 === 0), O: ids.filter((_, i) => i % 2 === 1) };
        await new XOGame(bot, lobby.channel, lobby.guildId, teams, lang).start();
      };
      return openLobby(ctx, lang, { title: 'XO — Team Battle', description: tr(lang, 'xo_lobby_desc'), onStart });
    },
  },
  {
    key: 'roulette', slash: 'roulette', emoji: '🎡',
    names: { en: ['roulette'], ar: ['عجلة', 'روليت'] },
    desc: { en: 'Lucky wheel lobby', ar: 'عجلة الحظ' },
    slashDescription: '🎡 Lucky wheel lobby',
    usage: 'roulette',
    guildOnly: true,
    async run(ctx) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      if (!gameEnabled(bot.db, ctx.guildId, 'roulette')) {
        return ctx.send({ embeds: [embeds.error(tr(lang, 'game_disabled'))], ephemeral: true });
      }
      const onStart = (lobby) => new RouletteGame(bot, lobby.channel, lobby.guildId, [...lobby.players], lang).start();
      return openLobby(ctx, lang, { title: tr(lang, 'roulette_title'), description: tr(lang, 'roulette_desc'), onStart });
    },
  },
  {
    key: 'race', slash: 'race', emoji: '🏁',
    names: { en: ['race'], ar: ['سباق'] },
    desc: { en: 'Race lobby', ar: 'سباق' },
    slashDescription: '🏁 Race lobby',
    usage: 'race',
    guildOnly: true,
    async run(ctx) {
      const lang = ctx.bot.getLang(ctx.guildId);
      return ctx.send({ embeds: [embeds.info(tr(lang, 'soon'), '🏁')] });
    },
  },
];
