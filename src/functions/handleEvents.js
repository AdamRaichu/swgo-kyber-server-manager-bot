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
      } else if (interaction.isStringSelectMenu()) {
        // Assume customId is the command name or starts with it
        const commandName = interaction.customId.split('_')[0]; 
        const command = client.commands.get(commandName);
        if (command && command.handleSelectMenu) {
            try {
                await command.handleSelectMenu(interaction);
            } catch (error) {
                console.error(error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: "There was an error handling this selection!", ephemeral: true });
                } else {
                    await interaction.followUp({ content: "There was an error handling this selection!", ephemeral: true });
                }
            }
        }
      }
    });

    client.once("clientReady", () => {
      console.log(`Ready! Logged in as ${client.user.tag}`);
    });
  };
};
