const { SlashCommandBuilder } = require("discord.js");
const { logToChannel } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restarts the bot process"),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    await interaction.reply({ content: "Restarting bot...", ephemeral: true });
    
    console.log(`Restart initiated by ${interaction.user.tag}`);
    logToChannel(interaction.client, `User ${interaction.user.tag} restarted the bot.`);
    
    // Allow time for the reply to be sent
    setTimeout(() => {
        process.exit(1); // Exit with code 1 to ensure loop.sh restarts it
    }, 1000);
  },
};
