'use strict';
/** LostBot — main bot class: slash + text (prefix / no-prefix) command dispatching. */
const { Client, GatewayIntentBits, Events, ActivityType } = require('discord.js');

const config = require('../config');
const { LostDB } = require('../database/db');
const embeds = require('./embeds');
const { tr } = require('./utils');
const { Ctx, CommandError } = require('./ctx');
const { CommandManager } = require('./commandManager');
const log = require('./logger');

class LostBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // privileged
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // privileged
      ],
      presence: { activities: [{ name: '🎮 /help • Lost', type: ActivityType.Playing }] },
    });
    this.db = new LostDB(config.DB_PATH);
    this.cmds = new CommandManager(this);
    this.activeChannels = new Set(); // channels with a running lobby/game
    this.pendingAnswers = new Set(); // "channel:user" waiting for a solo-game answer
    this.mentionRe = null;
  }

  getLang(guildId) {
    return guildId ? this.db.ensureGuild(guildId).language : config.DEFAULT_LANGUAGE;
  }

  // ───────────── lifecycle ─────────────
  async start() {
    this.db.connect();
    for (const def of require('../commands')) this.cmds.register(def);
    this.cmds.verify();
    log.info(`Loaded ${this.cmds.defs.size} commands`);

    this.once(Events.ClientReady, () => this.onReady().catch((e) => log.error('ready failed', e)));
    this.on(Events.InteractionCreate, (i) => this.onInteraction(i).catch((e) => log.error('interaction failed', e)));
    this.on(Events.MessageCreate, (m) => this.onMessage(m).catch((e) => log.error('message failed', e)));
    this.on(Events.GuildCreate, (g) => this.db.ensureGuild(g.id));
    this.on(Events.Error, (e) => log.error('client error', e));

    await this.login(config.TOKEN);
  }

  async onReady() {
    this.mentionRe = new RegExp(`^<@!?${this.user.id}>\\s*`);
    const body = this.cmds.slashJSON();
    if (config.DEV_GUILD_ID) { // instant sync for the dev guild
      await this.application.commands.set(body, config.DEV_GUILD_ID);
    } else {
      await this.application.commands.set(body);
    }
    log.info(`Lost is online as ${this.user.tag} (${this.guilds.cache.size} guilds)`);
  }

  async shutdown() {
    await this.destroy();
    this.db.close();
  }

  // ───────────── slash commands ─────────────
  async onInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return; // buttons/menus are handled by collectors
    const def = this.cmds.bySlash(interaction.commandName);
    if (!def) return;
    const ctx = await Ctx.fromInteraction(this, interaction);
    await this.execute(def, ctx, () => this.argsFromInteraction(def, interaction));
  }

  argsFromInteraction(def, interaction) {
    const args = {};
    for (const o of def.options || []) {
      if (o.type === 'user') {
        const member = interaction.options.getMember(o.name);
        if (!member && interaction.options.get(o.name)) throw new CommandError('args'); // not in this server
        args[o.name] = member || null;
      } else {
        args[o.name] = interaction.options.getString(o.name);
      }
    }
    return args;
  }

  // ───────────── text commands (prefix / mention / NO prefix) ─────────────
  async onMessage(message) {
    if (message.author.bot || message.webhookId || !message.content) return;
    if (this.pendingAnswers.has(`${message.channelId}:${message.author.id}`)) return; // a game answer
    const parsed = this.parseMessage(message);
    if (!parsed) return;
    const ctx = Ctx.fromMessage(this, message, { noPrefix: parsed.noPrefix });
    await this.execute(parsed.def, ctx, () => this.argsFromTokens(parsed.def, parsed.rest, ctx));
  }

  /**
   * Decide whether a message is a command:
   *   • "!help"   (server prefix)        • "@Lost help"  (mention)
   *   • "help" / "مساعدة"  (no prefix — only if enabled for that command in /dashboard)
   */
  parseMessage(message) {
    const guildId = message.guildId;
    const prefix = guildId ? this.db.ensureGuild(guildId).prefix : config.DEFAULT_PREFIX;
    let text = message.content.trim();
    let prefixed = false;
    const mention = this.mentionRe && text.match(this.mentionRe);
    if (mention) {
      text = text.slice(mention[0].length);
      prefixed = true;
    } else if (text.startsWith(prefix)) {
      text = text.slice(prefix.length);
      prefixed = true;
    }
    const tokens = text.split(/\s+/).filter(Boolean);
    if (!tokens.length) return null;

    const def = this.cmds.match(guildId, tokens[0]);
    if (!def) return null;
    const rest = tokens.slice(1);
    if (!prefixed) {
      if (!this.cmds.effective(guildId, def.key).noPrefix) return null;
      // "help me with this" is just chatting, not a command: no-prefix commands never take extra words
      if (rest.length > (def.options || []).length) return null;
    }
    return { def, rest, noPrefix: !prefixed };
  }

  async argsFromTokens(def, tokens, ctx) {
    const args = {};
    let idx = 0;
    for (const o of def.options || []) {
      const tok = tokens[idx];
      if (tok === undefined) {
        if (o.required) throw new CommandError('args');
        args[o.name] = null;
        continue;
      }
      if (o.type === 'user') {
        const m = tok.match(/^<@!?(\d{15,25})>$/) || tok.match(/^(\d{15,25})$/);
        if (!m) throw new CommandError('args');
        const member = ctx.guild ? await ctx.guild.members.fetch(m[1]).catch(() => null) : null;
        if (!member) throw new CommandError('args');
        args[o.name] = member;
      } else {
        args[o.name] = tok;
      }
      idx++;
    }
    return args;
  }

  // ───────────── shared execution + unified error handler ─────────────
  async execute(def, ctx, getArgs) {
    try {
      if (def.guildOnly && !ctx.guild) throw new CommandError('guild');
      if (def.permissions && !(ctx.permissions && ctx.permissions.has(def.permissions))) throw new CommandError('perms');
      const args = await getArgs();
      await def.run(ctx, args);
    } catch (err) {
      await this.handleError(ctx, err);
    }
  }

  async handleError(ctx, err) {
    const lang = this.getLang(ctx.guildId);
    let msg;
    if (err instanceof CommandError) {
      if (ctx.noPrefix) return; // someone just chatting — stay quiet
      msg = tr(lang, { guild: 'err_guild', perms: 'err_perms', args: 'err_args' }[err.kind]);
    } else {
      log.error('Unhandled command error', err);
      msg = tr(lang, 'err_generic');
    }
    try {
      await ctx.send({ embeds: [embeds.error(msg)], ephemeral: true });
    } catch (e) {
      log.warn(`could not report error: ${e.message}`);
    }
  }
}

module.exports = { LostBot };
