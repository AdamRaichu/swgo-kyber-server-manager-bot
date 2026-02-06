const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { scanLogLine } = require('./logScanner');

class DockerLogStreamer {
    constructor() {
        this.process = null;
        this.client = null;
        this.containerName = null;
        this.shouldStream = false;
        this.retryTimeout = null;
        this.partialLine = '';
    }

    /**
     * Starts streaming logs for the specified container.
     * @param {import('discord.js').Client} client 
     * @param {string} containerName 
     */
    start(client, containerName) {
        this.client = client;
        this.containerName = containerName || process.env.CONTAINER_NAME;
        this.shouldStream = true;

        if (this.process) return; // Already running

        this.connect();
    }

    /**
     * Stops the log streamer.
     */
    stop() {
        this.shouldStream = false;
        if (this.retryTimeout) clearTimeout(this.retryTimeout);
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }

    connect() {
        if (!this.shouldStream || !this.containerName) return;

        console.log(`[DockerLogStreamer] Connecting to logs for ${this.containerName}...`);

        // Prepare logging to file
        const logsDir = path.join(__dirname, "../../logs");
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        // Use a daily log file or similar to avoid huge files? 
        // For now, let's use a consistent session file or rotate based on connect time
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const streamLogFile = path.join(logsDir, `container_${timestamp}.log`);
        const fileStream = fs.createWriteStream(streamLogFile, { flags: 'a' });

        const processName = process.platform === 'win32' ? 'docker.exe' : 'docker';
        this.process = spawn(processName, ['logs', '-f', '--tail', '0', this.containerName], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => {
            const text = data.toString();
            fileStream.write(text);
            this.processChunk(text);
        });

        this.process.stderr.on('data', (data) => {
            const text = data.toString();
            fileStream.write(text);
            // Stderr might also contain relevant info for triggers?
            // Usually game servers output vital info to stdout, but let's scan stderr too just in case
            this.processChunk(text);
        });

        this.process.on('close', (code) => {
            console.log(`[DockerLogStreamer] Log stream ended with code ${code}.`);
            this.process = null;
            fileStream.end();

            if (this.shouldStream) {
                console.log(`[DockerLogStreamer] Attempting reconnect in 5 seconds...`);
                this.retryTimeout = setTimeout(() => this.connect(), 5000);
            }
        });
    }

    processChunk(text) {
        if (!this.client) return;

        const lines = (this.partialLine + text).split(/\r?\n/);
        this.partialLine = lines.pop(); // Keep the last incomplete part

        for (const line of lines) {
            scanLogLine(this.client, line).catch(err => console.error('[DockerLogStreamer] Scan error:', err));
        }
    }
}

// Export a singleton instance
module.exports = new DockerLogStreamer();
