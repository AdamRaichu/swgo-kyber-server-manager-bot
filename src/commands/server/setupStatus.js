const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, "../../../user_config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_status")
    .setDescription("Creates the persistent server status embed in the specified channel")
    .addChannelOption(option => 
        option.setName('channel')
            .setDescription('The channel to post the status embed in')
            .setRequired(false)
    ),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    // Validate channel type (simple check)
    if (!targetChannel.isTextBased()) {
        return interaction.reply({ content: "Please select a text channel.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Create initial embed
        const initialEmbed = new EmbedBuilder()
            .setTitle('Kyber Server Status')
            .setColor(0xFF0000)
            .addFields({ name: 'Status', value: '🔴 **OFFLINE**', inline: true })
            .setTimestamp();

        const message = await targetChannel.send({ embeds: [initialEmbed] });

        // Save to config
        let config = {};
        if (fs.existsSync(configPath)) {
            try {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (ignored) {}
        }

        // Clean up old message if it exists (optional, but good for cleanup)
        if (config.STATUS_CHANNEL_ID && config.STATUS_MESSAGE_ID) {
            try {
                const oldChannel = await interaction.client.channels.fetch(config.STATUS_CHANNEL_ID);
                if (oldChannel) {
                    const oldMsg = await oldChannel.messages.fetch(config.STATUS_MESSAGE_ID);
                    if (oldMsg) await oldMsg.delete();
                }
            } catch (err) {
                 console.log("Could not delete old status message, likely already gone.");
            }
        }

        config.STATUS_CHANNEL_ID = targetChannel.id;
        config.STATUS_MESSAGE_ID = message.id;

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.editReply({ content: `Status embed created in ${targetChannel}. IDs saved to config.` });

    } catch (error) {
        console.error("Setup Status Error:", error);
        await interaction.editReply({ content: `Failed to set up status embed: ${error.message}` });
    }
  },
};
