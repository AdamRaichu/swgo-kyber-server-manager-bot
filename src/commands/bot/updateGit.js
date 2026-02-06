const { SlashCommandBuilder } = require("discord.js");
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("update_git")
    .setDescription("Pulls the latest changes from git"),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const { stdout, stderr } = await execPromise('git pull');
        let output = `**Git Pull Output:**\n\`\`\`\n${stdout}\n\`\`\``;
        if (stderr) {
            output += `\n**Stderr:**\n\`\`\`\n${stderr}\n\`\`\``;
        }
        await interaction.editReply({ content: output });
    } catch (error) {
        console.error('Git pull failed:', error);
        await interaction.editReply({ content: `Failed to pull changes:\n\`\`\`\n${error.message}\n\`\`\`` });
    }
  },
};
