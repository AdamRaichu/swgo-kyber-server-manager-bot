const { SlashCommandBuilder } = require("discord.js");
const { callPlugin } = require("../../utils/pluginApi");
const { logToChannel } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("execute")
    .setDescription("Executes a console command on the server")
    .addStringOption((option) => option.setName("command").setDescription("The command to execute").setRequired(true)),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const command = interaction.options.getString("command");

    await interaction.deferReply({ ephemeral: true });

    try {
        // Lua endpoint expects 'x-command' header
        const response = await callPlugin(interaction.client, 'GET', '/other-command', {
            'x-command': command
        });

        if (response.status === 204 || response.status === 200) {
            await interaction.editReply({ content: `Command sent: \`${command}\`` });
            logToChannel(interaction.client, `User ${interaction.user.tag} executed command: \`${command}\``);
        } else {
            await interaction.editReply({ content: `Failed to send command. Status: ${response.status}` });
        }
    } catch (error) {
        let errorMessage = "Error executing command.";
        if (error.response) {
            errorMessage += ` Server responded with ${error.response.status}`;
        } else {
            errorMessage += ` ${error.message}`;
        }
        await interaction.editReply({ content: errorMessage });
    }
  },
};
