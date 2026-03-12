const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const kyberGrpc = require("../../utils/kyberGrpc");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mod_getmods")
    .setDescription("Gets the list of moderators for a Kyber server")
    .addStringOption(option =>
      option.setName("server_id")
        .setDescription("The alphanumeric ID of the server")
        .setRequired(true)),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const eaToken = process.env.SECRET_EA_TOKEN;
    if (!eaToken) {
      return interaction.reply({ content: "Error: `SECRET_EA_TOKEN` not found in environment variables.", ephemeral: true });
    }

    const serverId = interaction.options.getString("server_id");

    await interaction.deferReply({ ephemeral: true });

    try {
      const authClient = kyberGrpc.getClient("Authentication");
      const metadata = kyberGrpc.getDefaultMetadata();

      // Step 1: Login to get Kyber Token
      authClient.Login({ token: eaToken }, metadata, (loginError, loginResponse) => {
        if (loginError) {
          console.error("[GetMods] Login Error:", loginError);
          return interaction.editReply({ content: `Auth Error: ${loginError.message}` });
        }

        const kyberToken = loginResponse.token;
        const mgmtClient = kyberGrpc.getClient("ServerManagement");
        const mgmtMetadata = kyberGrpc.getDefaultMetadata();
        mgmtMetadata.add("authorization", kyberToken);

        const request = {
          serverId: serverId
        };

        // Step 2: Get Moderators
        mgmtClient.GetModerators(request, mgmtMetadata, (getModError, getModResponse) => {
          if (getModError) {
            console.error("[GetMods] gRPC Error:", getModError);
            return interaction.editReply({ content: `Error: ${getModError.message}` });
          }

          const moderators = getModResponse.users || [];
          const moderatorList = moderators.length > 0 
            ? moderators.map(m => `• **${m.name}** (\`${m.id}\`)`).join("\n")
            : "No moderators found.";

          const embed = new EmbedBuilder()
            .setTitle(`Moderators for Server: ${serverId}`)
            .setDescription(moderatorList)
            .setColor(0x0099ff)
            .setTimestamp();

          interaction.editReply({ embeds: [embed] });
        });
      });
    } catch (err) {
      console.error("[GetMods] Implementation Error:", err);
      await interaction.editReply({ content: `Failed to fetch moderators: ${err.message}` });
    }
  },
};
