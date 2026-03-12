const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const kyberGrpc = require("../../utils/kyberGrpc");
const {getAuthToken} = require("../../utils/maximaBridge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mod_getbans")
    .setDescription("Gets the list of active punishments (bans/kicks) for a Kyber server")
    .addStringOption(option =>
      option.setName("server_id")
        .setDescription("The alphanumeric ID of the server")
        .setRequired(true)),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const eaToken = await getAuthToken();;
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
          console.error("[GetBans] Login Error:", loginError);
          return interaction.editReply({ content: `Auth Error: ${loginError.message}` });
        }

        const kyberToken = loginResponse.token;
        const mgmtClient = kyberGrpc.getClient("ServerManagement");
        const mgmtMetadata = kyberGrpc.getDefaultMetadata();
        mgmtMetadata.add("authorization", kyberToken);

        const request = {
          serverId: serverId
        };

        // Step 2: Get Punishments
        mgmtClient.GetPunishments(request, mgmtMetadata, (getBanError, getBanResponse) => {
          if (getBanError) {
            console.error("[GetBans] gRPC Error:", getBanError);
            return interaction.editReply({ content: `Error: ${getBanError.message}` });
          }

          const punishments = getBanResponse.punishments || [];
          const punishmentList = punishments.length > 0 
            ? punishments.map(p => {
                const type = p.type === 0 ? "KICK" : "BAN";
                const user = p.user ? `${p.user.name} (\`${p.user.id}\`)` : "Unknown User";
                const expires = p.expires_at ? ` (Expires: <t:${Math.floor(Number(p.expires_at) / 1000)}:R>)` : " (Permanent)";
                return `• [${type}] **${user}**: ${p.reason}${expires}`;
              }).join("\n")
            : "No active punishments found.";

          const embed = new EmbedBuilder()
            .setTitle(`Punishments for Server: ${serverId}`)
            .setDescription(punishmentList.length > 2000 ? punishmentList.substring(0, 1997) + "..." : punishmentList)
            .setColor(0xff0000)
            .setTimestamp();

          interaction.editReply({ embeds: [embed] });
        });
      });
    } catch (err) {
      console.error("[GetBans] Implementation Error:", err);
      await interaction.editReply({ content: `Failed to fetch punishments: ${err.message}` });
    }
  },
};
