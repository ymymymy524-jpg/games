'use strict';
/** Two-player games: /rps, /connect4 (soon). (/xo @user lives in multiplayer.js) */
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags,
} = require('discord.js');

const { Colors } = require('../config');
const embeds = require('../core/embeds');
const fx = require('../core/fx');
const { tr, gameEnabled, sleep } = require('../core/utils');
const { sendChallenge } = require('../core/views');
const { BaseGame } = require('../games/base');
const log = require('../core/logger');

const CHOICES = { rock: '🪨', paper: '📄', scissors: '✂️' };
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const RPS_TIMEOUT = 30000;

class RPSGame extends BaseGame {
  constructor(bot, channel, guildId, p1, p2, lang = 'en') {
    super(bot, channel, guildId, [p1.id, p2.id], lang);
    this.key = 'rps';
    this.p1 = p1;
    this.p2 = p2;
    this.picks = {};
    this.collector = null;
  }

  embed() {
    let desc = tr(this.lang, 'rps_desc', { p1: `<@${this.p1.id}>`, p2: `<@${this.p2.id}>` });
    for (const p of [this.p1, this.p2]) {
      const k = this.picks[p.id] ? 'rps_waiting' : 'rps_pending';
      desc += '\n' + tr(this.lang, k, { p: `<@${p.id}>` });
    }
    return embeds.base(tr(this.lang, 'rps_title'), desc, Colors.PURPLE);
  }

  components() {
    return [
      new ActionRowBuilder().addComponents(
        ...Object.keys(CHOICES).map((c) =>
          new ButtonBuilder()
            .setCustomId(`rps:${c}`)
            .setEmoji(CHOICES[c])
            .setLabel(tr(this.lang, `rps_${c}`).slice(2).trim())
            .setStyle(ButtonStyle.Primary)),
      ),
    ];
  }

  async start(interaction = null) {
    if (interaction) {
      await interaction.update({ content: null, embeds: [this.embed()], components: this.components() });
      this.message = interaction.message;
    } else {
      this.message = await this.channel.send({ embeds: [this.embed()], components: this.components() });
    }
    this.collector = this.message.createMessageComponentCollector({ componentType: ComponentType.Button, idle: RPS_TIMEOUT });
    this.collector.on('collect', (i) => {
      if (!i.customId.startsWith('rps:')) return;
      this.onPick(i, i.customId.slice(4)).catch((err) => log.error('rps pick failed', err));
    });
    this.collector.on('end', (_c, reason) => {
      if ((reason === 'idle' || reason === 'time') && !this.finished) {
        this._resolve(null).catch((err) => log.error('rps timeout failed', err)); // whoever picked wins
      }
    });
  }

  async onPick(i, choice) {
    const uid = i.user.id;
    const eph = MessageFlags.Ephemeral;
    if (!this.players.includes(uid)) return i.reply({ embeds: [embeds.error(tr(this.lang, 'xo_not_in'))], flags: eph });
    if (this.picks[uid]) return i.reply({ embeds: [embeds.error(tr(this.lang, 'rps_already'))], flags: eph });
    this.picks[uid] = choice;
    if (Object.keys(this.picks).length < 2) {
      await i.reply({ embeds: [embeds.success(tr(this.lang, 'rps_you', { c: tr(this.lang, `rps_${choice}`) }))], flags: eph });
      return i.message.edit({ embeds: [this.embed()] });
    }
    return this._resolve(i);
  }

  async _resolve(interaction) {
    if (this.finished) return;
    this.finished = true;
    if (this.collector) this.collector.stop('resolved');
    const c1 = this.picks[this.p1.id];
    const c2 = this.picks[this.p2.id];
    let winner = null;
    if (c1 && !c2) winner = this.p1;
    else if (c2 && !c1) winner = this.p2;
    else if (c1 && c2 && c1 !== c2) winner = BEATS[c1] === c2 ? this.p1 : this.p2;

    const pts = await this.finish(winner ? [winner.id] : []);
    const lines = [];
    if (c1 && c2) {
      lines.push(tr(this.lang, 'rps_result', {
        p1: `<@${this.p1.id}>`, c1: CHOICES[c1], c2: CHOICES[c2], p2: `<@${this.p2.id}>`,
      }));
    }
    lines.push(winner ? tr(this.lang, 'rps_win', { w: `<@${winner.id}>`, pts }) : tr(this.lang, 'rps_draw'));
    if (winner) lines.push(fx.CONFETTI);
    const result = embeds.base(tr(this.lang, 'rps_title'), lines.join('\n'), winner ? Colors.SUCCESS : Colors.WARNING);

    // suspense animation: rock… paper… scissors… shoot!
    const title = tr(this.lang, 'rps_title');
    const frames = ['🪨 ◌ ◌', '🪨 📄 ◌', '🪨 📄 ✂️', '✦ SHOOT ✦'].map((t) => embeds.base(title, `# ${t}`, Colors.PURPLE));
    let msg;
    if (interaction) {
      await interaction.update({ embeds: [frames[0]], components: [] });
      msg = interaction.message;
    } else {
      msg = this.message;
      await msg.edit({ embeds: [frames[0]], components: [] });
    }
    for (const f of frames.slice(1)) {
      await sleep(800);
      await msg.edit({ embeds: [f] });
    }
    await sleep(800);
    await msg.edit({ embeds: [result], components: [this._replayRow()] });
    this._listenReplay(msg);
  }

  _replayRow() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rps:replay').setEmoji('🔁').setLabel(tr(this.lang, 'replay')).setStyle(ButtonStyle.Secondary),
    );
  }

  _listenReplay(msg) {
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 60000 });
    collector.on('collect', async (i) => {
      try {
        if (i.customId !== 'rps:replay') return;
        const eph = MessageFlags.Ephemeral;
        if (!this.players.includes(i.user.id)) {
          return await i.reply({ embeds: [embeds.error(tr(this.lang, 'not_involved'))], flags: eph });
        }
        if (this.bot.activeChannels.has(this.channel.id)) {
          return await i.reply({ embeds: [embeds.warning(tr(this.lang, 'channel_busy'))], flags: eph });
        }
        collector.stop('replay');
        this.bot.activeChannels.add(this.channel.id);
        await new RPSGame(this.bot, this.channel, this.guildId, this.p1, this.p2, this.lang).start(i);
      } catch (err) {
        this.bot.activeChannels.delete(this.channel.id);
        log.error('rps replay failed', err);
      }
    });
    collector.on('end', async (_c, reason) => {
      if (reason === 'idle' || reason === 'time') await msg.edit({ components: [] }).catch(() => {});
    });
  }
}

module.exports = [
  {
    key: 'rps', slash: 'rps', emoji: '✂️',
    names: { en: ['rps'], ar: ['حجر', 'حجر_ورقة'] },
    desc: { en: 'Rock Paper Scissors', ar: 'حجر ورقة مقص' },
    slashDescription: '✂️ Rock Paper Scissors vs a player',
    usage: 'rps @user',
    options: [{ name: 'opponent', type: 'user', required: true, description: 'Who do you want to challenge?' }],
    guildOnly: true,
    async run(ctx, { opponent }) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      if (!gameEnabled(bot.db, ctx.guildId, 'rps')) {
        return ctx.send({ embeds: [embeds.error(tr(lang, 'game_disabled'))], ephemeral: true });
      }
      const accept = (interaction) =>
        new RPSGame(bot, ctx.channel, ctx.guildId, ctx.author, opponent, lang).start(interaction);
      return sendChallenge(bot, ctx, opponent, 'Rock Paper Scissors', lang, accept);
    },
  },
  {
    key: 'connect4', slash: 'connect4', emoji: '🔴',
    names: { en: ['connect4'], ar: ['كونكت4', 'كونكت'] },
    desc: { en: 'Connect 4', ar: 'كونكت 4' },
    slashDescription: '🔴 Connect 4 vs a player',
    usage: 'connect4 @user',
    options: [{ name: 'opponent', type: 'user', required: true, description: 'Who do you want to challenge?' }],
    guildOnly: true,
    async run(ctx) {
      const lang = ctx.bot.getLang(ctx.guildId);
      return ctx.send({ embeds: [embeds.info(tr(lang, 'soon'), '🔴')] });
    },
  },
];
