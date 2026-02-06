const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, "../../user_config.json");

/**
 * Updates the persistent status embed.
 * @param {import('discord.js').Client} client 
 * @param {'ONLINE' | 'OFFLINE' | 'STARTING' | 'STOPPING'} status 
 * @param {object} details - Extra info like serverId
 */
async function updateStatus(client, status, details = {}) {
    // Load config
    let config = {};
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (err) {
        console.error('[StatusEmbed] Error reading config:', err);
        return;
    }

    const { STATUS_CHANNEL_ID, STATUS_MESSAGE_ID } = config;

    if (!STATUS_CHANNEL_ID || !STATUS_MESSAGE_ID) {
        // Not configured yet
        return; 
    }

    try {
        const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
        if (!channel) return;

        const message = await channel.messages.fetch(STATUS_MESSAGE_ID);
        if (!message) return;

        const embed = new EmbedBuilder()
            .setTitle('Kyber Server Status')
            .setTimestamp();

        // Configure based on status
        switch (status) {
            case 'ONLINE':
                embed.setColor(0x00FF00) // Green
                    .addFields(
                        { name: 'Status', value: '🟢 **ONLINE**', inline: true },
                        { name: 'Server ID', value: details.serverId || 'Unknown', inline: true }
                    );
                
                if (details.serverId) {
                    embed.addFields({ name: 'Join Link', value: `[Click to Join](https://api.prod.kyber.gg/redirect?target=join_server?server_id=${details.serverId})` });
                }
                break;

            case 'OFFLINE':
                embed.setColor(0xFF0000) // Red
                    .addFields({ name: 'Status', value: '🔴 **OFFLINE**', inline: true });
                break;

            case 'STARTING':
                embed.setColor(0xFFFF00) // Yellow
                    .addFields({ name: 'Status', value: '🟡 **STARTING...**', inline: true });
                break;
                
            case 'STOPPING':
                embed.setColor(0xFFA500) // Orange
                    .addFields({ name: 'Status', value: '🟠 **STOPPING...**', inline: true });
                break;
        }

        await message.edit({ embeds: [embed] });

    } catch (error) {
        console.error('[StatusEmbed] Failed to update status:', error.message);
    }
}

module.exports = { updateStatus };
