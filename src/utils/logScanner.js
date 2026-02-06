const triggers = require('./logTriggers');

/**
 * Scans a line of text for specific patterns defined in logTriggers.js.
 * @param {import('discord.js').Client} client 
 * @param {string} line 
 */
async function scanLogLine(client, line) {
    if (!line) return;

    for (const trigger of triggers) {
        const matches = line.match(trigger.regex);
        if (matches) {
            try {
                await trigger.handler(client, matches);
            } catch (err) {
                console.error(`[LogScanner] Error in trigger handler for regex ${trigger.regex}:`, err);
            }
        }
    }
}

module.exports = {
    scanLogLine
};
