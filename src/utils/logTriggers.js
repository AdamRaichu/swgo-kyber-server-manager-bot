const { logToChannel } = require('./logger');
const { exec } = require("child_process");
const { updateStatus } = require('./statusEmbed');

/**
 * A map of regex patterns to handler functions for log scanning.
 * Each trigger should have a 'regex' and an 'async handler(client, matches)'.
 */
const triggers = [
    {
        // Kyber Server ID Registration
        // Example: [2026-02-06 16:36:33.014] [KYBER] [info] [Server] Registered server, id: 33dbed541433344c4d592ce17cbb8d77
        regex: /Registered server, id: ([a-f0-9]+)/,
        handler: async (client, matches) => {
            const serverId = matches[1];
            console.log(`[LogScanner] Detected Server ID: ${serverId}`);
            await logToChannel(client, `🌐 **Server Registered on Kyber**\nLink: https://api.prod.kyber.gg/redirect?target=join_server?server_id=${serverId}`);
            
            // Update Status Embed
            const { updateStatus } = require('./statusEmbed');
            updateStatus(client, 'ONLINE', { serverId });
        }
    },
    {
      regex: /Redirecting crash to Sentry/,
      handler: async (client, matches) => {
        // 856566725890146325: adamraichu
        await logToChannel(client, `❌ **Server Crashed!** Attempting to restart...\n<@856566725890146325> maybe you should look into this.`);
        updateStatus(client, 'STARTING');
        exec(`docker restart ${process.env.CONTAINER_NAME}`);
      }
    },
    {
      regex: /\[Console\] > (.+)/,
      handler: async (client, matches) => {
        const command = matches[1];
        await logToChannel(client, `**Console Command:** \`${command}\``);
      }
    }
    // Add more triggers here like:
    // {
    //     regex: /Player (.*) joined/,
    //     handler: async (client, matches) => { ... }
    // }
];

module.exports = triggers;
