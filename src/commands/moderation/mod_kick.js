const { SlashCommandBuilder } = require("discord.js");
const kyberGrpc = require("../../utils/kyberGrpc");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mod_kick")
    .setDescription("Kicks a player from a Kyber server")
    .addStringOption(option =>
      option.setName("server_id")
        .setDescription("The alphanumeric ID of the server")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("user_id")
        .setDescription("The numeric ID of the user to kick")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("The reason for kicking")
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
    const reason = interaction.options.getString("reason");

    await interaction.deferReply({ ephemeral: true });

    try {
      const authClient = kyberGrpc.getClient("Authentication");
      const metadata = kyberGrpc.getDefaultMetadata();

      // Step 1: Login to get Kyber Token
      authClient.Login({ token: eaToken }, metadata, (loginError, loginResponse) => {
        if (loginError) {
          console.error("[Kick] Login Error:", loginError);
          return interaction.editReply({ content: `Auth Error: ${loginError.message}` });
        }

        const kyberToken = loginResponse.token;
        const mgmtClient = kyberGrpc.getClient("ServerManagement");
        const mgmtMetadata = kyberGrpc.getDefaultMetadata();
        mgmtMetadata.add("authorization", kyberToken);

        const request = {
          id: serverId,
          userId: userId,
          reason: reason
        };

        // Step 2: Perform Kick
        mgmtClient.KickPlayer(request, mgmtMetadata, (kickError, kickResponse) => {
          if (kickError) {
            console.error("[Kick] gRPC Error:", kickError);
            return interaction.editReply({ content: `Kick Error: ${kickError.message}` });
          }

          interaction.editReply({ content: `Successfully kicked user \`${userId}\` from server \`${serverId}\` for: \`${reason}\`` });
        });
      });
    } catch (err) {
      console.error("[Kick] Implementation Error:", err);
      await interaction.editReply({ content: `Kick failed: ${err.message}` });
    }
  },
};
