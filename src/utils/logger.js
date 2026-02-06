/**
 * Logs a message to the configured event log channel.
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @param {string} message - The message content to send.
 */
async function logToChannel(client, message) {
    if (!process.env.EVENTLOG_CHANNEL_ID) return;
    
    try {
        const channel = await client.channels.fetch(process.env.EVENTLOG_CHANNEL_ID);
        if (channel) {
            await channel.send(message);
        } else {
            console.error(`[Logger] Channel ${process.env.EVENTLOG_CHANNEL_ID} not found.`);
        }
    } catch (error) {
        console.error(`[Logger] Failed to log message: ${error.message}`);
    }
}

module.exports = {
    logToChannel
};
