const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { logToChannel } = require('../../utils/logger');

const PLUGINS_DIR = path.join(__dirname, '../../../plugins');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("plugins")
    .setDescription("Manage Kyber Server Plugins"),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    await this.sendPluginInterface(interaction);
  },

  async handleSelectMenu(interaction) {
     if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    // Acknowledge usually, but here we want to update the UI
    await interaction.deferUpdate();

    const selectedFile = interaction.values[0];
    const fullPath = path.join(PLUGINS_DIR, selectedFile);
    
    // Check if it exists (security: prevent path traversal or stale data)
    // We strictly use basename in logic below, but fullPath construct uses selectedFile
    if (!fs.existsSync(fullPath)) {
        return interaction.followUp({ content: `File not found: ${selectedFile}`, ephemeral: true });
    }

    // Toggle logic
    let newName;
    if (selectedFile.endsWith('.disabled')) {
        newName = selectedFile.replace('.disabled', '');
    } else {
        newName = selectedFile + '.disabled';
    }

    const newFullPath = path.join(PLUGINS_DIR, newName);

    try {
        fs.renameSync(fullPath, newFullPath);
        // Re-render the interface
        await this.sendPluginInterface(interaction, true); // true = edit
        
        // Log to event channel
        // Log to event channel
        const action = newName.endsWith('.disabled') ? 'Disabled' : 'Enabled';
        const pluginName = newName.replace('.disabled', '');
        await logToChannel(interaction.client, `🔌 **Plugin ${action}** by ${interaction.user.tag}: \`${pluginName}\``);

    } catch (err) {
        console.error("Plugin rename error:", err);
        await interaction.followUp({ content: `Failed to rename plugin: ${err.message}`, ephemeral: true });
    }
  },

  async sendPluginInterface(interaction, isUpdate = false) {
    // 1. Scan directory
    let files = [];
    try {
        if (!fs.existsSync(PLUGINS_DIR)) {
            fs.mkdirSync(PLUGINS_DIR, { recursive: true });
        }
        files = fs.readdirSync(PLUGINS_DIR);
    } catch (err) {
        console.error("Failed to read plugins dir:", err);
        const content = "Error reading plugins directory.";
        if (isUpdate) return interaction.editReply({ content, components: [] });
        return interaction.editReply({ content });
    }

    // 2. Filter plugins
    const plugins = files.filter(f => f.endsWith('.kbplugin') || f.endsWith('.kbplugin.disabled'));

    if (plugins.length === 0) {
        const content = "No plugins found in the `plugins` directory.";
        if (isUpdate) return interaction.editReply({ content, components: [] });
        return interaction.editReply({ content });
    }

    // 3. Build Options and Status List
    const options = plugins.map(file => {
        const isDisabled = file.endsWith('.disabled');
        const name = isDisabled ? file.replace('.disabled', '') : file;
        const statusIcon = isDisabled ? '🔴' : '🟢';
        
        return new StringSelectMenuOptionBuilder()
            .setLabel(`${name} [${isDisabled ? 'DISABLED' : 'ENABLED'}]`)
            .setDescription(isDisabled ? 'Click to Enable' : 'Click to Disable')
            .setValue(file)
            .setEmoji(statusIcon);
    });

    // 4. Build Select Menu
    const select = new StringSelectMenuBuilder()
        .setCustomId('plugins_manage') // Start with 'plugins' for routing
        .setPlaceholder('Select a plugin to toggle status...')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    // 5. Build Status Embed
    const embed = new EmbedBuilder()
        .setTitle("Kyber Server Plugins")
        .setDescription("Manage the active plugins for the server.\n**Note:** Changes require a server restart to take effect.")
        .setColor(0x0099FF);

    const enabledList = plugins.filter(f => !f.endsWith('.disabled')).map(f => `🟢 ${f}`).join('\n') || "*None*";
    const disabledList = plugins.filter(f => f.endsWith('.disabled')).map(f => `🔴 ${f.replace('.disabled', '')}`).join('\n') || "*None*";

    embed.addFields(
        { name: 'Enabled', value: enabledList, inline: true },
        { name: 'Disabled', value: disabledList, inline: true }
    );

    // 6. Send/Edit
    const payload = { content: null, embeds: [embed], components: [row], ephemeral: true };
    
    if (isUpdate) {
        await interaction.editReply(payload);
    } else {
        await interaction.editReply(payload);
    }
  }
};
