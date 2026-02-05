const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// --- CONFIGURATION ---
const POLL_DELAY = parseInt(process.env.POLL_DELAY) || 1000;
const LUA_PLUGIN_URL = `http://localhost:${process.env.DISCORD_PORT}/messages`;
const EVENTLOG_CHANNEL_ID = process.env.EVENTLOG_CHANNEL_ID;
const CONTAINER_NAME = process.env.CONTAINER_NAME;

// --- STATE ---
let lastMessageId = 0;
let isPolling = false;
let timeoutId = null;

module.exports = (client) => {
    // Helper to check if server is running
    client.checkServerRunning = async () => {
        try {
            const { stdout } = await execPromise(`docker inspect --format="{{.State.Running}}" ${CONTAINER_NAME}`);
            return stdout.trim() === 'true';
        } catch (error) {
            return false;
        }
    };

    client.getHttpSecret = async () => {
        if (client.httpSecret) return client.httpSecret;
        try {
            // Fetch env vars from container
            const { stdout } = await execPromise(`docker inspect --format="{{range .Config.Env}}{{println .}}{{end}}" ${CONTAINER_NAME}`);
            const envVars = stdout.split('\n');
            const secretVar = envVars.find(v => v.startsWith('HTTP_SECRET='));
            if (secretVar) {
                client.httpSecret = secretVar.split('=')[1].trim();
                return client.httpSecret;
            }
        } catch (error) {
            console.error('Failed to fetch HTTP_SECRET from container:', error.message);
        }
        return null;
    };

    client.startPolling = async () => {
        if (isPolling) return; // Already polling
        console.log('Starting polling service...');
        isPolling = true;
        pollMessages(client);
    };

    client.stopPolling = () => {
        if (!isPolling) return;
        console.log('Stopping polling service...');
        isPolling = false;
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    // Auto-start if server is running on bot ready
    client.once('ready', async () => {
        const isRunning = await client.checkServerRunning();
        if (isRunning) {
            console.log('Server detected running on startup. Initiating polling.');
            await client.getHttpSecret(); // Recover secret if possible
            client.startPolling();
        } else {
            console.log('Server checked on startup: NOT running. Polling standby.');
        }
    });
};

async function pollMessages(client) {
    if (!isPolling) return;

    try {
        const secret = client.httpSecret || await client.getHttpSecret();
        const response = await axios.get(LUA_PLUGIN_URL, {
            headers: {
                'x-last-id': lastMessageId.toString(),
                'x-http-secret': secret || ''
            },
            timeout: 2000 
        });

        if (response.status === 200 && Array.isArray(response.data)) {
            const messages = response.data;
            if (messages.length > 0) {
                console.log(`Received ${messages.length} messages.`);
                const channel = await client.channels.fetch(EVENTLOG_CHANNEL_ID);

                if (!channel) {
                    console.error('Target channel not found!');
                } else {
                    for (const msg of messages) {
                        try {
                            const ts = Number.isFinite(Number(msg.timestamp)) ? Math.floor(Number(msg.timestamp)) : Math.floor(Date.now() / 1000);
                            await channel.send(`[<t:${ts}:T>] ${msg.content}`);

                            if (msg.id > lastMessageId) {
                                lastMessageId = msg.id;
                            }
                        } catch (sendErr) {
                            console.error('Failed to send message to Discord:', sendErr);
                        }
                    }
                }
            }
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            // Plugin likely not running, suppress spam
        } else if (error.response && error.response.status === 401) {
            console.error('Polling unauthorized: Invalid HTTP_SECRET.');
        } else {
            console.error('Error polling messages:', error.message);
        }
    }

    // Schedule next poll if still should be polling
    if (isPolling) {
        timeoutId = setTimeout(() => pollMessages(client), POLL_DELAY);
    }
}
