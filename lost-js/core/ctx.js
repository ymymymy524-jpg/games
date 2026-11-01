'use strict';
/**
 * Ctx — one wrapper for both slash interactions and text messages, so every command
 * is written once and works everywhere (same idea as discord.py's hybrid_command).
 */
const { MessageFlags } = require('discord.js');

class CommandError extends Error {
  /** @param {'guild'|'perms'|'args'} kind */
  constructor(kind, message) {
    super(message || kind);
    this.kind = kind;
  }
}

class Ctx {
  constructor(bot, { interaction = null, message = null, channel, noPrefix = false }) {
    this.bot = bot;
    this.interaction = interaction;
    this.message = message;
    this.channel = channel;
    this.noPrefix = noPrefix; // text command typed without a prefix → be silent on errors
  }

  static async fromInteraction(bot, interaction) {
    const channel = interaction.channel || (await bot.channels.fetch(interaction.channelId).catch(() => null));
    return new Ctx(bot, { interaction, channel });
  }

  static fromMessage(bot, message, opts = {}) {
    return new Ctx(bot, { message, channel: message.channel, ...opts });
  }

  get isInteraction() { return !!this.interaction; }
  get author() { return this.interaction ? this.interaction.user : this.message.author; }
  get guild() { return this.interaction ? this.interaction.guild : this.message.guild; }
  get guildId() { return this.guild ? this.guild.id : null; }
  get member() { return this.interaction ? this.interaction.member : this.message.member; }
  get permissions() {
    return this.interaction ? this.interaction.memberPermissions : (this.message.member && this.message.member.permissions);
  }

  /**
   * Send a message. `ephemeral: true` only has an effect for slash commands
   * (text commands can't be ephemeral). Returns the sent Message.
   */
  async send(options) {
    const { ephemeral, ...rest } = options;
    if (this.interaction) {
      const i = this.interaction;
      const payload = ephemeral ? { ...rest, flags: MessageFlags.Ephemeral } : rest;
      if (i.replied || i.deferred) return i.followUp(payload);
      await i.reply(payload);
      return i.fetchReply();
    }
    return this.channel.send(rest);
  }
}

module.exports = { Ctx, CommandError };
