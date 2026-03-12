const { SlashCommandBuilder } = require("discord.js");
const kyberGrpc = require("../../utils/kyberGrpc");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mod_unban")
    .setDescription("Unbans a player from a Kyber server")
    .addStringOption(option =>
      option.setName("server_id")
        .setDescription("The alphanumeric ID of the server")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("user_id")
        .setDescription("The numeric ID of the user to unban")
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
    const userId = interaction.options.getString("user_id");

    await interaction.deferReply({ ephemeral: true });

    try {
      const authClient = kyberGrpc.getClient("Authentication");
      const metadata = kyberGrpc.getDefaultMetadata();

      // Step 1: Login to get Kyber Token
      authClient.Login({ token: eaToken }, metadata, (loginError, loginResponse) => {
        if (loginError) {
          console.error("[Unban] Login Error:", loginError);
          return interaction.editReply({ content: `Auth Error: ${loginError.message}` });
        }

        const kyberToken = loginResponse.token;
        const mgmtClient = kyberGrpc.getClient("ServerManagement");
        const mgmtMetadata = kyberGrpc.getDefaultMetadata();
        mgmtMetadata.add("authorization", kyberToken);

        const request = {
          userId: userId,
          serverId: serverId
        };

        // Step 2: Perform Unban
        mgmtClient.UnbanPlayer(request, mgmtMetadata, (unbanError, unbanResponse) => {
          if (unbanError) {
            console.error("[Unban] gRPC Error:", unbanError);
            return interaction.editReply({ content: `Unban Error: ${unbanError.message}` });
          }

          interaction.editReply({ content: `Successfully unbanned user \`${userId}\` from server \`${serverId}\`.` });
        });
      });
    } catch (err) {
      console.error("[Unban] Implementation Error:", err);
      await interaction.editReply({ content: `Unban failed: ${err.message}` });
    }
  },
};
