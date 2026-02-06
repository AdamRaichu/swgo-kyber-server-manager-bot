const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const DISCORD_PORT = process.env.DISCORD_PORT || 3060;
const CONTAINER_NAME = process.env.CONTAINER_NAME;

async function getHttpSecret(client) {
    if (client.httpSecret) return client.httpSecret;
    try {
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
}

/**
 * Calls the Lua plugin with the specified method, endpoint, headers, and body.
 * @param {Object} client - Discord client instance
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} endpoint - API endpoint (e.g., '/messages', '/broadcast')
 * @param {Object} headers - Additional headers
 * @param {any} body - Request body
 */
async function callPlugin(client, method, endpoint, headers = {}, body = null) {
    const secret = await getHttpSecret(client);
    
    // Construct base URL from DISCORD_PORT
    const baseUrl = `http://localhost:${DISCORD_PORT}`;
    const url = `${baseUrl}${endpoint}`;
    
    const config = {
        method,
        url,
        headers: {
            'x-http-secret': secret || '',
            ...headers
        },
        data: body,
        timeout: 2000
    };

    return axios(config);
}

module.exports = {
    callPlugin,
    getHttpSecret
};
