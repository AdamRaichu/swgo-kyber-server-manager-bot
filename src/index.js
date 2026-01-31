require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const functionsPath = path.join(__dirname, "functions");
const functionFiles = fs.readdirSync(functionsPath).filter((file) => file.endsWith(".js"));

for (const file of functionFiles) {
  require(`./functions/${file}`)(client);
}

client.handleEvents();
client.handleCommands();

client.login(process.env.DISCORD_TOKEN);
