module.exports = (client) => {
  client.handleEvents = async () => {
    client.on("interactionCreate", async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
          await command.execute(interaction);
        } catch (error) {
          console.error(error);
          await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
        }
      } else if (interaction.isModalSubmit()) {
        const command = client.commands.get(interaction.customId);
        if (command && command.handleModal) {
          try {
            await command.handleModal(interaction);
          } catch (error) {
            console.error(error);
            await interaction.reply({ content: "There was an error handling this modal!", ephemeral: true });
          }
        }
      }
    });

    client.once("ready", () => {
      console.log(`Ready! Logged in as ${client.user.tag}`);
    });
  };
};
