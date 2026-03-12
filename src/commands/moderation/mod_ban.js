const { SlashCommandBuilder } = require("discord.js");
const kyberGrpc = require("../../utils/kyberGrpc");
const {getAuthToken} = require("../../utils/maximaBridge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mod_ban")
    .setDescription("Bans a player from a Kyber server")
    .addStringOption(option =>
      option.setName("server_id")
        .setDescription("The alphanumeric ID of the server")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("user_id")
        .setDescription("The numeric ID of the user to ban")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("The reason for banning")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("duration")
        .setDescription("Ban duration in <increment (defaults to seconds)> (0 for permanent)")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("increment")
        .setDescription("Increment to use for duration")
        .setRequired(false)
        .addChoices(
          { name: "Second(s)", value: 1 },
          { name: "Minute(s)", value: 60 },
          { name: "Hour(s)", value: 3600 },
          { name: "Day(s)", value: 86400 },
          { name: "Week(s)", value: 604800 },
          { name: "Month(s)", value: 2592000 },
          { name: "Year(s)", value: 31536000 },
        )
    ),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const eaToken = await getAuthToken();;
    if (!eaToken) {
      return interaction.reply({ content: "Error: `SECRET_EA_TOKEN` not found in environment variables.", ephemeral: true });
    }

    const serverId = interaction.options.getString("server_id");
    const userId = interaction.options.getString("user_id");
    const reason = interaction.options.getString("reason");
    const duration = interaction.options.getInteger("duration") || 0;
    const increment = interaction.options.getInteger("increment") || 1;

    await interaction.deferReply({ ephemeral: true });

    try {
      const authClient = kyberGrpc.getClient("Authentication");
      const metadata = kyberGrpc.getDefaultMetadata();

      // Step 1: Login to get Kyber Token
      authClient.Login({ token: eaToken }, metadata, (loginError, loginResponse) => {
        if (loginError) {
          console.error("[Ban] Login Error:", loginError);
          return interaction.editReply({ content: `Auth Error: ${loginError.message}` });
        }

        const kyberToken = loginResponse.token;
        const mgmtClient = kyberGrpc.getClient("ServerManagement");
        const mgmtMetadata = kyberGrpc.getDefaultMetadata();
        mgmtMetadata.add("authorization", kyberToken);

        const request = {
          id: serverId,
          userId: userId,
          reason: reason,
          duration: duration > 0 ? duration * increment : null // Handle optional field
        };

        // Step 2: Perform Ban
        mgmtClient.BanPlayer(request, mgmtMetadata, (banError, banResponse) => {
          if (banError) {
            console.error("[Ban] gRPC Error:", banError);
            return interaction.editReply({ content: `Ban Error: ${banError.message}` });
          }

          interaction.editReply({ 
            content: `Successfully banned user \`${userId}\` from server \`${serverId}\` for: \`${reason}\`${duration > 0 ? ` (Duration: ${duration}s)` : " (Permanent)"}` 
          });
        });
      });
    } catch (err) {
      console.error("[Ban] Implementation Error:", err);
      await interaction.editReply({ content: `Ban failed: ${err.message}` });
    }
  },
};
