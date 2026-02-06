const { SlashCommandBuilder } = require("discord.js");
const { exec } = require("child_process");
const { logToChannel } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Stops and removes the game server container"),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const containerName = process.env.CONTAINER_NAME;
    const dockerCommand = `docker stop ${containerName} && docker rm ${containerName}`;

    await interaction.reply({ content: `Stopping server...\nExecuting: \`${dockerCommand}\``, ephemeral: true });

    // Log to event channel
    // Log to event channel
    await logToChannel(interaction.client, `User ${interaction.user.tag} stopped server.`);

    exec(dockerCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        interaction.followUp({ content: `Error stopping server (it might not be running):\n\`\`\`${stderr || error.message}\`\`\``, ephemeral: true });
        return;
      }
      interaction.followUp({ content: `Server stopped and container removed successfully.`, ephemeral: true });
      if (interaction.client.stopPolling) interaction.client.stopPolling();
    });
  },
};
