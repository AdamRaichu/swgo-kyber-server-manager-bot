const { SlashCommandBuilder } = require("discord.js");
const kyberGrpc = require("../../utils/kyberGrpc");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mod_set_rotation")
    .setDescription("Sets the map rotation for a Kyber server")
    .addStringOption(option =>
      option.setName("server_id")
        .setDescription("The ID of the server")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("map")
        .setDescription("The level/map ID (e.g., Levels/MP/Abyss/Abyss)")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("mode")
        .setDescription("The game mode ID (e.g., Conquest)")
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
    const map = interaction.options.getString("map");
    const mode = interaction.options.getString("mode");

    await interaction.deferReply({ ephemeral: true });

    try {
      const authClient = kyberGrpc.getClient("Authentication");
      const metadata = kyberGrpc.getDefaultMetadata();

      // Step 1: Login to get Kyber Token
      authClient.Login({ token: eaToken }, metadata, (loginError, loginResponse) => {
        if (loginError) {
          console.error("[Rotation] Login Error:", loginError);
          return interaction.editReply({ content: `Auth Error: ${loginError.message}` });
        }

        const kyberToken = loginResponse.token;
        const mgmtClient = kyberGrpc.getClient("ServerManagement");
        const mgmtMetadata = kyberGrpc.getDefaultMetadata();
        mgmtMetadata.add("authorization", kyberToken);

        const request = {
          id: serverId,
          rotation: [
            {
              map: map,
              mode: mode
            }
          ],
          current: 0
        };

        // Step 2: Set Rotation
        mgmtClient.SetMapRotation(request, mgmtMetadata, (rotError, rotResponse) => {
          if (rotError) {
            console.error("[Rotation] gRPC Error:", rotError);
            return interaction.editReply({ content: `Rotation Error: ${rotError.message}` });
          }

          interaction.editReply({ 
            content: `Successfully updated map rotation for server \`${serverId}\` to: \`${map}\` (\`${mode}\`)` 
          });
        });
      });
    } catch (err) {
      console.error("[Rotation] Implementation Error:", err);
      await interaction.editReply({ content: `Rotation failed: ${err.message}` });
    }
  },
};
