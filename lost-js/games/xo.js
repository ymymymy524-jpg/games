'use strict';
/** XO (Tic-Tac-Toe) — works for 1v1 and team mode (up to 99 players). */
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags,
} = require('discord.js');

const { Colors } = require('../config');
const embeds = require('../core/embeds');
const fx = require('../core/fx');
const { tr, mentions } = require('../core/utils');
const log = require('../core/logger');
const { BaseGame } = require('./base');

const WINS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const SYMBOLS = { X: '✕', O: '◯' };
const TURN_TIMEOUT = 30000; // ms

class XOGame extends BaseGame {
  /** @param {{X: string[], O: string[]}} teams */
  constructor(bot, channel, guildId, teams, lang = 'en') {
    super(bot, channel, guildId, [...teams.X, ...teams.O], lang);
    this.key = this.players.length > 2 ? 'xo_multi' : 'xo';
    this.teams = teams;
    this.board = Array(9).fill(null);
    this.sym = 'X';
    this.winLine = null;
    this.ptr = { X: 0, O: 0 }; // rotating player index per team
    this.timer = null;
    this.collector = null;
  }

  get current() {
    const team = this.teams[this.sym];
    return team[this.ptr[this.sym] % team.length];
  }

  embed(status = null, color = Colors.PRIMARY) {
    let desc = tr(this.lang, 'xo_teams', { x: mentions(this.teams.X, 900), o: mentions(this.teams.O, 900) });
    desc += '\n\n' + (status || tr(this.lang, 'xo_turn', { uid: this.current, sym: SYMBOLS[this.sym] }));
    return embeds.base(tr(this.lang, 'xo_title'), desc, color);
  }

  /** 3×3 button grid built from the current state. */
  components() {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const row = new ActionRowBuilder();
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const cell = this.board[idx];
        let style = ButtonStyle.Secondary;
        if (cell) style = cell === 'X' ? ButtonStyle.Danger : ButtonStyle.Primary;
        if (this.finished && this.winLine && this.winLine.includes(idx)) style = ButtonStyle.Success; // glowing line
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`xo:${idx}`)
            .setLabel(cell ? SYMBOLS[cell] : '\u200b')
            .setStyle(style)
            .setDisabled(!!cell || this.finished),
        );
      }
      rows.push(row);
    }
    return rows;
  }

  async start(interaction = null) {
    if (interaction) { // 1v1: replace the challenge message with the board
      await interaction.update({ content: null, embeds: [this.embed()], components: this.components() });
      this.message = interaction.message;
    } else {
      this.message = await this.channel.send({ embeds: [this.embed()], components: this.components() });
    }
    this.collector = this.message.createMessageComponentCollector({ componentType: ComponentType.Button });
    this.collector.on('collect', (i) => {
      if (!i.customId.startsWith('xo:')) return;
      this.onMove(i, parseInt(i.customId.slice(3), 10)).catch((err) => log.error('xo move failed', err));
    });
    this._armTimer();
  }

  // ---------- timer ----------
  _armTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.finished) return;
      const winner = this.sym === 'X' ? 'O' : 'X';
      this._end(null, winner, this.current).catch((err) => log.error('xo timeout failed', err));
    }, TURN_TIMEOUT);
  }

  // ---------- moves ----------
  _winner() {
    for (const line of WINS) {
      const [a, b, c] = line;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        this.winLine = line;
        return this.board[a];
      }
    }
    return null;
  }

  _deny(i, key) {
    return i.reply({ embeds: [embeds.error(tr(this.lang, key))], flags: MessageFlags.Ephemeral });
  }

  async onMove(i, idx) {
    if (this.finished) return this._deny(i, 'xo_over');
    const uid = i.user.id;
    if (!this.players.includes(uid)) return this._deny(i, 'xo_not_in');
    if (uid !== this.current) return this._deny(i, 'xo_not_turn');
    if (this.board[idx]) return i.deferUpdate();
    this.board[idx] = this.sym;
    const winner = this._winner();
    if (winner) return this._end(i, winner);
    if (this.board.every(Boolean)) return this._end(i, null);
    this.ptr[this.sym] += 1;
    this.sym = this.sym === 'X' ? 'O' : 'X';
    this._armTimer();
    return i.update({ embeds: [this.embed()], components: this.components() });
  }

  async _end(i, winner, timeoutUid = null) {
    if (this.finished) return;
    clearTimeout(this.timer);
    this.finished = true; // (finish() sets it too — set early so late clicks are rejected)
    if (this.collector) this.collector.stop('over');

    let embed;
    if (winner) {
      const pts = await this.finish(this.teams[winner]);
      const text = timeoutUid
        ? tr(this.lang, 'xo_timeout', { uid: timeoutUid, sym: SYMBOLS[winner], pts })
        : tr(this.lang, 'xo_win', { sym: SYMBOLS[winner], pts });
      embed = this.embed(`${text}\n${fx.CONFETTI}`, Colors.SUCCESS);
    } else {
      await this.finish([]);
      embed = this.embed(tr(this.lang, 'xo_draw'), Colors.WARNING);
    }
    const payload = { embeds: [embed], components: this.components() };
    if (i) await i.update(payload);
    else if (this.message) await this.message.edit(payload);
  }
}

module.exports = { XOGame, SYMBOLS };
