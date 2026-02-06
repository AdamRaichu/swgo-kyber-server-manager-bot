const { logToChannel } = require('./logger');

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
        }
    },
    // Add more triggers here like:
    // {
    //     regex: /Player (.*) joined/,
    //     handler: async (client, matches) => { ... }
    // }
];

module.exports = triggers;
