'use strict';
/** Administration: /about /help /settings /language /prefix /reset_points  (/dashboard lives in dashboard.js) */
const path = require('node:path');
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType,
  MessageFlags, AttachmentBuilder, PermissionFlagsBits,
} = require('discord.js');

const config = require('../config');
const { Colors } = config;
const embeds = require('../core/embeds');
const { buildSettingsEmbed } = require('../core/settings');
const { confirmRow, waitConfirm } = require('../core/views');
const { tr, SECTIONS, SECTION_EMOJI, DETAILS } = require('../core/utils');
const log = require('../core/logger');

const EPH = MessageFlags.Ephemeral;
const helpFile = () => new AttachmentBuilder(path.join(config.BASE_DIR, 'assets', 'help.png'), { name: 'help.png' });

// ───────────────────────── /help ─────────────────────────
class HelpView {
  constructor(bot, authorId, guildId, lang, prefix) {
    this.bot = bot;
    this.authorId = authorId;
    this.guildId = guildId;
    this.lang = lang;
    this.prefix = prefix;
    this.current = null; // null = home
    this.message = null;
  }

  /** Text explanation on top, black & white banner underneath. */
  build() {
    const { bot, lang, guildId } = this;
    let e;
    if (this.current === null) {
      e = embeds.base(tr(lang, 'help_title'), tr(lang, 'help_intro', { prefix: this.prefix }));
    } else {
      const sec = this.current;
      const lines = bot.cmds.inSection(sec).map((def) => {
        const eff = bot.cmds.effective(guildId, def.key);
        const desc = bot.cmds.describe(guildId, def.key, lang, sec);
        const alias = eff.noPrefix ? `  ·  \`${bot.cmds.displayName(guildId, def.key, lang)}\`` : '';
        return `\`/${bot.cmds.usage(def, sec)}\` — ${desc}${alias}`;
      });
      e = embeds.base(`${SECTION_EMOJI[sec]} ${tr(lang, `sec_${sec}`)}`, lines.join('\n'));
    }
    return e.setImage('attachment://help.png');
  }

  components(disabled = false) {
    const sectionRow = new ActionRowBuilder();
    for (const key of Object.keys(SECTION_EMOJI)) {
      sectionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`help:${key}`)
          .setLabel(tr(this.lang, `sec_${key}`))
          .setEmoji(SECTION_EMOJI[key])
          .setStyle(this.current === key ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(disabled),
      );
    }
    const homeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help:home')
        .setLabel(`⌂ ${tr(this.lang, 'help_home')}`)
        .setStyle(this.current === null ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(disabled),
    );
    return [sectionRow, homeRow];
  }

  async open(ctx) {
    this.message = await ctx.send({ embeds: [this.build()], files: [helpFile()], components: this.components() });
    const collector = this.message.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 180000 });
    collector.on('collect', async (i) => {
      try {
        if (!i.customId.startsWith('help:')) return;
        if (i.user.id !== this.authorId) {
          return await i.reply({ embeds: [embeds.error(tr(this.lang, 'not_yours'))], flags: EPH });
        }
        const key = i.customId.slice(5);
        this.current = key === 'home' ? null : key;
        await i.update({ embeds: [this.build()], components: this.components() });
      } catch (err) {
        log.error('help view failed', err);
      }
    });
    collector.on('end', () => this.message.edit({ components: this.components(true) }).catch(() => {}));
  }
}

async function commandHelp(ctx, lang, prefix, query) {
  const { bot } = ctx;
  const word = query.trim().replace(/^[/!]+/, '').split(/\s+/)[0] || '';
  const def = bot.cmds.lookup(ctx.guildId, word);
  if (!def) {
    if (ctx.noPrefix) return undefined; // someone just chatting — stay quiet
    return ctx.send({ embeds: [embeds.error(tr(lang, 'help_unknown', { q: word }))], ephemeral: true });
  }
  const eff = bot.cmds.effective(ctx.guildId, def.key);
  const sec = Object.keys(SECTIONS).find((s) => SECTIONS[s].includes(def.key));
  const isAr = lang === 'ar';

  const customDesc = isAr ? eff.descAr !== def.desc.ar : eff.descEn !== def.desc.en;
  const detail = DETAILS[def.key];
  const text = customDesc || !detail ? (isAr ? eff.descAr : eff.descEn) : detail[isAr ? 1 : 0];

  const usage = bot.cmds.usage(def, sec);
  const argsPart = usage.split(' ').slice(1).join(' ');
  const usageLines = [`\`/${usage}\``, `\`${prefix}${usage}\``];
  if (eff.noPrefix) {
    usageLines.push(`\`${bot.cmds.displayName(ctx.guildId, def.key, lang)}${argsPart ? ` ${argsPart}` : ''}\``);
  }
  const names = [...eff.namesEn, ...eff.namesAr].map((n) => `\`${n}\``).join(' ');

  const e = embeds.base(`/${def.slash}`, text)
    .addFields(
      { name: tr(lang, 'help_usage'), value: usageLines.join('\n'), inline: true },
      { name: tr(lang, 'help_names'), value: names, inline: true },
      { name: tr(lang, 'help_section'), value: `${SECTION_EMOJI[sec]} ${tr(lang, `sec_${sec}`)}`, inline: true },
    )
    .setImage('attachment://help.png');
  return ctx.send({ embeds: [e], files: [helpFile()] });
}

// ───────────────────────── /language ─────────────────────────
async function languageMenu(ctx, lang) {
  const { bot } = ctx;
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('lang:select')
      .setPlaceholder(tr(lang, 'lang_prompt'))
      .addOptions(
        { label: 'English', value: 'en', emoji: { name: '🇬🇧' }, default: lang === 'en' },
        { label: 'العربية', value: 'ar', emoji: { name: '🇸🇦' }, default: lang === 'ar' },
      ),
  );
  const message = await ctx.send({ embeds: [embeds.info(tr(lang, 'lang_prompt'), '🌐')], components: [row] });
  const collector = message.createMessageComponentCollector({ componentType: ComponentType.StringSelect, idle: 60000 });
  collector.on('collect', async (i) => {
    try {
      if (i.user.id !== ctx.author.id) {
        return await i.reply({ embeds: [embeds.error(tr(lang, 'not_yours'))], flags: EPH });
      }
      const next = i.values[0];
      bot.db.setLanguage(ctx.guildId, next);
      const name = next === 'ar' ? 'العربية' : 'English';
      collector.stop('done');
      await i.update({ embeds: [embeds.success(tr(next, 'lang_changed', { lang: name }))], components: [] });
    } catch (err) {
      log.error('language menu failed', err);
    }
  });
  collector.on('end', (_c, reason) => {
    if (reason === 'idle' || reason === 'time') message.edit({ components: [] }).catch(() => {});
  });
}

// ───────────────────────── commands ─────────────────────────
module.exports = [
  {
    key: 'about', slash: 'about', emoji: 'ℹ️',
    names: { en: ['about'], ar: ['عن_البوت'] },
    desc: { en: 'About Lost', ar: 'عن البوت' },
    slashDescription: 'ℹ️ About Lost',
    usage: 'about',
    async run(ctx) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      const e = embeds.base(tr(lang, 'about_title'), tr(lang, 'about_desc'), Colors.PURPLE)
        .addFields(
          { name: tr(lang, 'about_version'), value: `v${config.VERSION}`, inline: true },
          { name: tr(lang, 'about_servers'), value: String(bot.guilds.cache.size), inline: true },
          { name: tr(lang, 'about_ping'), value: `${Math.round(bot.ws.ping)}ms`, inline: true },
          { name: '©', value: tr(lang, 'about_rights'), inline: false },
        );
      await ctx.send({ embeds: [e] });
    },
  },
  {
    key: 'help', slash: 'help', emoji: '📖',
    names: { en: ['help'], ar: ['مساعدة', 'اوامر'] },
    desc: { en: 'This menu', ar: 'هذه القائمة' },
    slashDescription: '📖 Command list, or details about one command',
    usage: 'help [command]',
    options: [{ name: 'command', type: 'string', required: false, description: 'Optional: a command name, e.g. xo' }],
    async run(ctx, { command }) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      const prefix = ctx.guildId ? bot.db.ensureGuild(ctx.guildId).prefix : config.DEFAULT_PREFIX;
      if (command && command.trim()) return commandHelp(ctx, lang, prefix, command);
      return new HelpView(bot, ctx.author.id, ctx.guildId, lang, prefix).open(ctx);
    },
  },
  {
    key: 'settings', slash: 'settings', emoji: '⚙️',
    names: { en: ['settings'], ar: ['اعدادات', 'الاعدادات'] },
    desc: { en: 'View server settings', ar: 'عرض إعدادات السيرفر' },
    slashDescription: '⚙️ View server settings',
    usage: 'settings',
    guildOnly: true,
    async run(ctx) {
      const lang = ctx.bot.getLang(ctx.guildId);
      await ctx.send({ embeds: [buildSettingsEmbed(ctx.bot, ctx.guildId, lang)] });
    },
  },
  {
    key: 'language', slash: 'language', emoji: '🌐',
    names: { en: ['language'], ar: ['لغة', 'اللغة'] },
    desc: { en: 'Change language', ar: 'تغيير اللغة' },
    slashDescription: '🌐 Change the server language',
    usage: 'language',
    guildOnly: true,
    permissions: PermissionFlagsBits.ManageGuild,
    async run(ctx) {
      return languageMenu(ctx, ctx.bot.getLang(ctx.guildId));
    },
  },
  {
    key: 'prefix', slash: 'prefix', emoji: '✏️',
    names: { en: ['prefix'], ar: ['بادئة', 'بريفكس'] },
    desc: { en: 'Change prefix', ar: 'تغيير البريفكس' },
    slashDescription: '✏️ Change the prefix',
    usage: 'prefix [new]',
    options: [{ name: 'new_prefix', type: 'string', required: false, description: 'New prefix (1-5 chars)' }],
    guildOnly: true,
    permissions: PermissionFlagsBits.Administrator,
    async run(ctx, { new_prefix: newPrefix }) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      if (newPrefix == null) {
        const cur = bot.db.ensureGuild(ctx.guildId).prefix;
        return ctx.send({ embeds: [embeds.info(tr(lang, 'prefix_current', { p: cur }))] });
      }
      if (newPrefix.length < 1 || newPrefix.length > 5 || /\s/.test(newPrefix)) {
        return ctx.send({ embeds: [embeds.error(tr(lang, 'prefix_invalid'))], ephemeral: true });
      }
      bot.db.setPrefix(ctx.guildId, newPrefix);
      return ctx.send({ embeds: [embeds.success(tr(lang, 'prefix_changed', { p: newPrefix }))] });
    },
  },
  {
    key: 'reset_points', slash: 'reset_points', emoji: '🗑️',
    names: { en: ['reset_points'], ar: ['تصفير', 'تصفير_النقاط'] },
    desc: { en: 'Reset all points', ar: 'تصفير النقاط' },
    slashDescription: '🗑️ Reset all points (Admin)',
    usage: 'reset_points',
    guildOnly: true,
    permissions: PermissionFlagsBits.Administrator,
    async run(ctx) {
      const { bot } = ctx;
      const lang = bot.getLang(ctx.guildId);
      const msg = await ctx.send({ embeds: [embeds.warning(tr(lang, 'reset_confirm'))], components: [confirmRow(lang)] });
      const ok = await waitConfirm(msg, ctx.author.id, lang);
      if (ok) {
        bot.db.resetPoints(ctx.guildId);
        await msg.edit({ embeds: [embeds.success(tr(lang, 'reset_done'))], components: [] });
      } else {
        await msg.edit({ embeds: [embeds.info(tr(lang, 'reset_cancel'))], components: [] });
      }
    },
  },
];
