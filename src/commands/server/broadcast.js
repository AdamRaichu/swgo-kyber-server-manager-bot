const { SlashCommandBuilder } = require("discord.js");
const { callPlugin } = require("../../utils/pluginApi");
const { logToChannel } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("Broadcasts a message to the Kyber server")
    .addStringOption((option) => option.setName("message").setDescription("The message to broadcast").setRequired(true))
    .addStringOption((option) => option.setName("prefix").setDescription("The prefix to use for the broadcast").setRequired(false)),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const message = (interaction.options.getString("prefix") ?? process.env.BROADCAST_MESSAGE_PREFIX) + " " + interaction.options.getString("message");

    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await callPlugin(interaction.client, "GET", "/broadcast", {
        "x-message": message,
      });

      if (response.status === 204 || response.status === 200) {
        await interaction.editReply({ content: `Broadcast sent: "${message}"` });

        // Log to event channel
        // Log to event channel
        await logToChannel(interaction.client, `📢 **Broadcast** by ${interaction.user.tag}: ${message}`);
      } else {
        await interaction.editReply({ content: `Failed to broadcast message. Status: ${response.status}` });
      }
    } catch (error) {
      console.error("Broadcast error:", error);
      await interaction.editReply({ content: `Error broadcasting message: ${error.message}` });
    }
  },
};
