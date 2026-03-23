# openclaw-kiro-bridge

Integrates [kiro-cli](https://kiro.dev) as the underlying LLM for [OpenClaw](https://openclaw.ai), while keeping your agent's SOUL personality fully intact.

## How It Works

```
Telegram / any channel
  ↓
OpenClaw agent (SOUL personality preserved)
  ↓ POST /v1/chat/completions  (OpenAI-compatible)
kiro-openai-proxy  (port 4099, local)
  ↓ acp-bridge HTTP API
kiro-cli acp
  ↓
Kiro LLM (AWS Bedrock)
```

OpenClaw thinks it's calling OpenAI. The proxy transparently forwards requests to kiro-cli. Your SOUL is untouched.

## Prerequisites

- [kiro-cli](https://kiro.dev) installed and authenticated (`kiro-cli --version` should work)
- [OpenClaw](https://openclaw.ai) installed and running
- Node.js >= 18
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))

## Quick Start

```bash
git clone https://github.com/masami-agent/openclaw-kiro-bridge.git
cd openclaw-kiro-bridge
```

## Setup

### 1. Install acp-bridge

```bash
npm install -g acp-bridge
mkdir -p ~/.config/acp-bridge
cp acp-bridge/config.json ~/.config/acp-bridge/config.json
acp-bridge daemon start
# Verify: curl http://127.0.0.1:7800/agents
```

### 2. Install kiro-openai-proxy

```bash
mkdir -p ~/.local/lib/kiro-openai-proxy
cp kiro-openai-proxy/index.js ~/.local/lib/kiro-openai-proxy/index.js

# Install as a systemd user service
cp systemd/kiro-openai-proxy.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now kiro-openai-proxy.service

# Verify
curl http://127.0.0.1:4099/v1/models
```

### 3. Register kiro as a model in OpenClaw

Add the following to your `~/.openclaw/openclaw.json` under `agents.defaults`:

```json
"model": {
  "primary": "kiro/kiro"
},
"models": {
  "kiro/kiro": {}
}
```

And add this at the top level of `openclaw.json`:

```json
"models": {
  "kiro/kiro": {
    "api": "openai-completions",
    "baseUrl": "http://127.0.0.1:4099/v1",
    "apiKeyEnv": "KIRO_PROXY_KEY"
  }
}
```

### 4. Set environment variable

```bash
echo 'export KIRO_PROXY_KEY=your-random-secret' >> ~/.bashrc
source ~/.bashrc
```

### 5. Restart OpenClaw gateway

```bash
systemctl --user restart openclaw-gateway.service
systemctl --user is-active openclaw-gateway.service   # should print: active
```

## Test

Send any message to your OpenClaw Telegram bot:

```
You:   "What is the capital of France?"
Agent: "The capital of France is Paris."   ← answered by kiro, delivered as your SOUL persona
```

## File Structure

```
.
├── .env.example                              # Environment variable template
├── acp-bridge/config.json                    # acp-bridge daemon config
├── acpx/config.json                          # (legacy) acpx agent config
├── kiro-openai-proxy/index.js                # OpenAI-compatible proxy → kiro-cli
├── systemd/kiro-openai-proxy.service         # systemd user service for the proxy
├── kiro-cli/cli.json                         # kiro-cli MCP server registration
└── openclaw/
    ├── SOUL-patch.md                         # (legacy) SOUL relay patch — not needed with proxy
    └── hooks/kiro-relay-hook/
        ├── HOOK.md
        └── handler.ts
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KIRO_PROXY_KEY` | Yes | Any non-empty string (proxy doesn't validate, but OpenClaw requires it) |
| `ACP_BRIDGE_URL` | No | acp-bridge URL (default: `http://127.0.0.1:7800`) |
| `ACP_AGENT` | No | acp-bridge agent name (default: `kiro-agent`) |
| `PROXY_PORT` | No | Proxy listen port (default: `4099`) |

## Troubleshooting

**`curl http://127.0.0.1:4099/v1/models` returns nothing**

Check proxy logs:
```bash
systemctl --user status kiro-openai-proxy.service
journalctl --user -u kiro-openai-proxy.service -n 20
```

**acp-bridge not running**

```bash
acp-bridge daemon status
acp-bridge daemon start
```

**Can't find openclaw directory (for acp-bridge agent path)**

```bash
# Try these to locate openclaw
npm root -g
ls ~/.local/lib/node_modules/openclaw 2>/dev/null
ls /usr/local/lib/node_modules/openclaw 2>/dev/null
```

**kiro-cli not authenticated**

```bash
kiro-cli auth login
```

**Port 4099 already in use**

Change `PROXY_PORT` in the systemd service file and update `baseUrl` in `openclaw.json` accordingly.

## Security Notes

### `--trust-all-tools` ⚠️ High Risk if misused
Auto-approves all kiro tool calls (file read/write, shell commands, web search) without prompting. Any message sent to your agent can potentially trigger system-level operations.
- Only run on a machine you fully control
- Remove this flag if you want manual approval per tool call in production
- Never expose port 7800 or 4099 to the public internet

### Token & Key Handling
- Never commit `.env` or any file containing real tokens/keys
- Set `KIRO_PROXY_KEY` in `~/.bashrc`, not in the systemd service file

### Input Validation
- Proxy enforces a 64KB request body limit
- Hook handler validates `chatId` is numeric only (prevents shell injection)

## License

MIT
