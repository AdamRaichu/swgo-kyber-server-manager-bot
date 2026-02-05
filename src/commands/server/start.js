const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField } = require("discord.js");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../../../user_config.json");

module.exports = {
  data: new SlashCommandBuilder().setName("start").setDescription("Starts the game server container with configuration"),
  async execute(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const containerName = process.env.CONTAINER_NAME;
    try {
      const { stdout } = await execPromise(`docker inspect --format="{{.State.Running}}" ${containerName}`);
      if (stdout.trim() === "true") {
        return interaction.reply({ content: "The server is already running. Please use `/stop` first.", ephemeral: true });
      }
    } catch (error) {
      // Container mostly likely doesn't exist, which is fine, we can proceed
    }

    let savedConfig = {};
    if (fs.existsSync(configPath)) {
      try {
        savedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      } catch (err) {
        console.error("Error reading config file:", err);
      }
    }

    const modal = new ModalBuilder().setCustomId("start").setTitle("Server Configuration");

    const envInput = new TextInputBuilder().setCustomId("envInput").setLabel("Environment Variables (e.g., -e FOO=bar)").setStyle(TextInputStyle.Paragraph).setRequired(false);
    if (savedConfig.env) envInput.setValue(savedConfig.env);

    const portInput = new TextInputBuilder().setCustomId("portInput").setLabel("Port Mappings (e.g., -p 8080:80)").setStyle(TextInputStyle.Short).setRequired(false);
    if (savedConfig.ports) portInput.setValue(savedConfig.ports);

    const volumeInput = new TextInputBuilder().setCustomId("volumeInput").setLabel("Volume Mounts (e.g., -v /host:/container)").setStyle(TextInputStyle.Paragraph).setRequired(false);
    if (savedConfig.volumes) volumeInput.setValue(savedConfig.volumes);

    const flagsInput = new TextInputBuilder().setCustomId("flagsInput").setLabel("Extra Flags (e.g., --restart unless-stopped)").setStyle(TextInputStyle.Short).setRequired(false);
    if (savedConfig.flags) flagsInput.setValue(savedConfig.flags);

    const firstActionRow = new ActionRowBuilder().addComponents(envInput);
    const secondActionRow = new ActionRowBuilder().addComponents(portInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(volumeInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(flagsInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

    await interaction.showModal(modal);
  },
  async handleModal(interaction) {
    if (process.env.SYSADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.SYSADMIN_ROLE_ID)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    const env = interaction.fields.getTextInputValue("envInput") || "";
    const ports = interaction.fields.getTextInputValue("portInput") || "";
    const volumes = interaction.fields.getTextInputValue("volumeInput") || "";
    const flags = interaction.fields.getTextInputValue("flagsInput") || "";

    // Save config
    try {
      fs.writeFileSync(configPath, JSON.stringify({ env, ports, volumes, flags }, null, 2));
    } catch (err) {
      console.error("Error writing config file:", err);
    }

    // Clean inputs to remove newlines if they were entered in paragraph fields but meant as single line args
    // Actually docker run args need to be space separated.
    const cleanEnv = env.replace(/\n/g, " ");
    const cleanPorts = ports.replace(/\n/g, " ");
    const cleanVolumes = volumes.replace(/\n/g, " ");
    const cleanFlags = flags.replace(/\n/g, " ");

    const containerName = process.env.CONTAINER_NAME;
    const imageName = process.env.IMAGE_NAME;

    // Construct command
    // docker run -d --name <name> <args> <image>
    // Use separate commands for display (logging) and execution (secrets)
    const secretArgs = process.env.SECRET_ARGS || "";
    const httpSecret = require("crypto").randomUUID();
    const displayCommand = `docker run -d --name ${containerName} <CREDENTIALS> ${cleanEnv} ${cleanPorts} ${cleanVolumes} ${cleanFlags} ${imageName}`;
    const executionCommand = `docker run -d --name ${containerName} ${secretArgs} -e HTTP_SECRET=${httpSecret} ${cleanEnv} ${cleanPorts} ${cleanVolumes} ${cleanFlags} ${imageName}`;

    await interaction.reply({ content: `Starting server...\nExecuting: \`${displayCommand}\``, ephemeral: true });

    // Log to event channel
    if (process.env.EVENTLOG_CHANNEL_ID) {
      const channel = interaction.guild.channels.cache.get(process.env.EVENTLOG_CHANNEL_ID);
      if (channel) {
        channel.send(`User ${interaction.user.tag} started server with command:\n\`${displayCommand}\``);
      }
    }

    exec(executionCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        interaction.followUp({ content: `Error starting server:\n\`\`\`${stderr || error.message}\`\`\``, ephemeral: true });
        return;
      }
      console.log(`stdout: ${stdout}`);
      
      interaction.client.httpSecret = httpSecret;
      
      interaction.followUp({ content: `Server started successfully! Container ID: ${stdout.substring(0, 12)}`, ephemeral: true });
      if (interaction.client.startPolling) interaction.client.startPolling();
    });
  },
};
