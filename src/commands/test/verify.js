const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const kyberGrpc = require("../../utils/kyberGrpc");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verifies EA token and retrieves Kyber user info"),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const eaToken = process.env.SECRET_EA_TOKEN;
    if (!eaToken) {
      return interaction.reply({ content: "Error: `SECRET_EA_TOKEN` not found in environment variables.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const client = kyberGrpc.getClient("Authentication");
      const metadata = kyberGrpc.getDefaultMetadata();

      client.Login({ token: eaToken }, metadata, (error, response) => {
        if (error) {
          console.error("[Verify] gRPC Error:", error);
          const errorMsg = error.code === 13 ? `gRPC Error: 13 INTERNAL (Failed to validate token). \n**Note:** This often means the EA token is malformed, expired, or requires a specific format (e.g. Auth Code from EA).` : `gRPC Error: ${error.message}`;
          return interaction.editReply({ content: errorMsg });
        }

        if (!response) {
          return interaction.editReply({ content: "Received an empty response from Kyber API." });
        }

        const embed = new EmbedBuilder()
          .setTitle("Kyber User Verification")
          .setColor(0x00ff00)
          .addFields(
            { name: "User ID", value: response.id || "N/A", inline: true },
            { name: "Username", value: response.name || "N/A", inline: true },
            { name: "Patreon", value: response.isPatreon ? "✅ Yes" : "❌ No", inline: true },
            { name: "Entitlements", value: response.entitlements && response.entitlements.length > 0 ? response.entitlements.join(", ") : "None" }
          )
          .setFooter({ text: "Information retrieved via Kyber RPC API" })
          .setTimestamp();

        interaction.editReply({ embeds: [embed] });
      });
    } catch (err) {
      console.error("[Verify] Implementation Error:", err);
      await interaction.editReply({ content: `Verification failed: ${err.message}` });
    }
  },
};
