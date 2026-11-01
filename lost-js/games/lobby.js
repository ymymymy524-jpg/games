'use strict';
/** Lobby system — Join / Leave / Start / Cancel (max 99 players). */
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags, PermissionFlagsBits,
} = require('discord.js');

const config = require('../config');
const embeds = require('../core/embeds');
const { tr } = require('../core/utils');
const log = require('../core/logger');

const GLYPHS = { join: '✚', leave: '✖', start: '▶', cancel: '■' };

class Lobby {
  constructor(bot, host, channel, { title, description, onStart, minPlayers = 2, maxPlayers = config.MAX_PLAYERS, lang = 'en' }) {
    this.bot = bot;
    this.channel = channel;
    this.guildId = channel.guild.id;
    this.title = title;
    this.description = description;
    this.lang = lang;
    this.onStart = onStart;
    this.minPlayers = minPlayers;
    this.maxPlayers = Math.min(maxPlayers, config.MAX_PLAYERS);
    this.hostId = host.id;
    this.players = [host.id]; // host auto-joins
    this.started = false;
    this.message = null;
    this.collector = null;
  }

  // ---------- rendering ----------
  embed() {
    return embeds.lobbyEmbed(this.lang, {
      title: this.title, description: this.description, hostId: this.hostId,
      players: this.players, maxPlayers: this.maxPlayers, started: this.started,
    });
  }

  components() {
    const full = this.players.length >= this.maxPlayers;
    const btn = (id, key, style) =>
      new ButtonBuilder().setCustomId(`lobby:${id}`).setLabel(`${GLYPHS[key]} ${tr(this.lang, key)}`).setStyle(style);
    return [
      new ActionRowBuilder().addComponents(
        btn('join', 'join', ButtonStyle.Success).setDisabled(this.started || full), // auto-disable at max
        btn('leave', 'leave', ButtonStyle.Danger).setDisabled(this.started),
        btn('start', 'start', ButtonStyle.Primary).setDisabled(this.started),
        btn('cancel', 'cancel', ButtonStyle.Secondary).setDisabled(this.started),
      ),
    ];
  }

  release() {
    this.bot.activeChannels.delete(this.channel.id);
  }

  async _err(i, key, vars) {
    await i.reply({ embeds: [embeds.error(tr(this.lang, key, vars))], flags: MessageFlags.Ephemeral });
  }

  _refresh(i) {
    return i.update({ embeds: [this.embed()], components: this.components() });
  }

  // ---------- open ----------
  /** Post the lobby (via ctx.send) and start listening to its buttons. */
  async open(ctx) {
    this.message = await ctx.send({ embeds: [this.embed()], components: this.components() });
    this.collector = this.message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      idle: config.LOBBY_TIMEOUT * 1000,
    });
    this.collector.on('collect', (i) => {
      this._handle(i).catch((err) => log.error('lobby handler failed', err));
    });
    this.collector.on('end', async (_c, reason) => {
      if ((reason !== 'idle' && reason !== 'time') || this.started) return;
      this.release();
      await this.message.delete().catch(() => {});
    });
  }

  // ---------- buttons ----------
  async _handle(i) {
    const action = i.customId.replace('lobby:', '');
    const uid = i.user.id;

    if (action === 'join') {
      if (this.started) return this._err(i, 'lobby_began');
      if (this.players.includes(uid)) return this._err(i, 'lobby_already');
      if (this.players.length >= this.maxPlayers) return this._err(i, 'lobby_full');
      this.players.push(uid);
      return this._refresh(i);
    }

    if (action === 'leave') {
      if (!this.players.includes(uid)) return this._err(i, 'lobby_not_in');
      this.players = this.players.filter((p) => p !== uid);
      if (!this.players.length) { // empty room -> close it
        this.collector.stop('empty');
        this.release();
        await i.deferUpdate();
        return this.message.delete().catch(() => {});
      }
      if (uid === this.hostId) this.hostId = this.players[0]; // transfer host
      return this._refresh(i);
    }

    if (action === 'start') {
      if (uid !== this.hostId) return this._err(i, 'host_only');
      if (this.players.length < this.minPlayers) return this._err(i, 'lobby_need', { n: this.minPlayers });
      this.started = true;
      this.collector.stop('started');
      await this._refresh(i);
      try {
        await this.onStart(this);
      } catch (err) {
        log.error('Game failed to start', err);
        this.release();
        await this.channel.send({ embeds: [embeds.error(tr(this.lang, 'err_generic'))] }).catch(() => {});
      }
      return undefined;
    }

    if (action === 'cancel') {
      const isAdmin = i.memberPermissions && i.memberPermissions.has(PermissionFlagsBits.Administrator);
      if (uid !== this.hostId && !isAdmin) return this._err(i, 'host_only');
      this.collector.stop('cancelled');
      this.release();
      await i.deferUpdate();
      return this.message.delete().catch(() => {});
    }
    return undefined;
  }
}

module.exports = { Lobby };
