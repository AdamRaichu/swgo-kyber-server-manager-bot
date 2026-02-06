const { SlashCommandBuilder } = require("discord.js");
const { exec } = require("child_process");
const { logToChannel } = require("../../utils/logger");
const dockerLogStreamer = require("../../utils/dockerLogStreamer");

module.exports = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Stops the game server container"),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const containerName = process.env.CONTAINER_NAME;
    const dockerCommand = `docker stop ${containerName} && docker rm ${containerName}`;

    await interaction.reply({ content: "Stopping server...", ephemeral: true });

    // Stop log streaming
    dockerLogStreamer.stop();
    // Log to event channel
    await logToChannel(interaction.client, `User ${interaction.user.tag} stopped the server.`);

    // Update Status Embed
    const { updateStatus } = require('../../utils/statusEmbed');
    updateStatus(interaction.client, 'STOPPING');

    exec(dockerCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        interaction.followUp({ content: `Error stopping server:\n\`\`\`${stderr || error.message}\`\`\``, ephemeral: true });
        return;
      }
      interaction.followUp({ content: "Server stopped successfully!", ephemeral: true });
      
      updateStatus(interaction.client, 'OFFLINE');
      if (interaction.client.stopPolling) interaction.client.stopPolling();
    });
  },
};
