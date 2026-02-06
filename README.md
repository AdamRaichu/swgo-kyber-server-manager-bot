# SWGO Kyber Server Manager Bot

This is a purpose-built Discord bot for managing the SWGO Kyber server. It allows users to start, stop, and monitor the server through Discord commands.

This bot is intended to be used with the lua component of my [KyberDiscordBridgePlugin](https://github.com/AdamRaichu/KyberDiscordBridgePlugin).

## Usage

This bot acts as a bridge between Discord and your Dockerized game server. It manages the Docker container lifecycle, streams logs, and communicates with the game via a Lua plugin.

### Commands

| Command | Description |
| :--- | :--- |
| `/start` | Starts the game server. Opens a modal to configure environment variables, ports, and flags. |
| `/stop` | Stops the game server container. |
| `/update_git` | Updates the bot from the git repository. Changes will take effect on next restart. |
| `/restart` | Restarts the Discord bot process itself. |
| `/broadcast` | Broadcasts a message to all players in-game. Supports an optional prefix (defaults to `**Admin:**`). |
| `/execute` | Executes a raw console command on the server. |
| `/plugins` | Opens an interactive menu to Enable or Disable server plugins. |
| `/setup_status` | Creates a persistent, real-time server status dashboard in the specified channel. |

### Advanced Features

- **Auto-Restart on Crash**: The bot monitors server logs in real-time. If it detects a known crash pattern (e.g., "Redirecting crash to Sentry"), it automatically restarts the container to minimize downtime.
- **Live Status Dashboard**: A persistent message that automatically updates to reflect the server's state (🟢 Online, 🔴 Offline, 🟡 Starting). When online, it provides a clickable link to join the server.
- **Persistent Log Streaming**: Docker logs are continuously streamed to timestamped files in the `logs/` directory. The bot is designed to auto-reconnect to the log stream if the container restarts.
- **Event Logging**: All administrative actions and significant server events are logged to the configured event channel.
