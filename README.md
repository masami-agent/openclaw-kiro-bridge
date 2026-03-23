# openclaw-kiro-bridge

Integrates [kiro-cli](https://kiro.dev) as an ACP agent into [OpenClaw](https://openclaw.ai), allowing OpenClaw to relay all conversations through kiro-cli (backed by AWS Bedrock).

## Architecture

```
Telegram / any channel
  ↓
OpenClaw agent (executes SOUL instructions)
  ↓ acpx kiro
kiro-cli acp --trust-all-tools
  ↓
Kiro LLM (AWS Bedrock)
  ↓ answer
Telegram / any channel
```

## File Structure

```
.
├── acpx/config.json                          # Register kiro as acpx agent
├── acp-bridge/config.json                    # acp-bridge daemon config
├── mcp-server/index.js                       # MCP server wrapping acp-bridge for kiro-cli
├── kiro-cli/cli.json                         # kiro-cli MCP server registration
└── openclaw/
    ├── SOUL-patch.md                         # Prepend this to your SOUL.md
    └── hooks/kiro-relay-hook/
        ├── HOOK.md                           # Hook metadata (alternative approach)
        └── handler.ts                        # Hook handler (alternative approach)
```

## Prerequisites

- [kiro-cli](https://kiro.dev) installed and authenticated
- [OpenClaw](https://openclaw.ai) installed and running
- Node.js >= 18
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))

## Setup

### 1. Install acp-bridge

```bash
npm install -g acp-bridge
cp acp-bridge/config.json ~/.config/acp-bridge/config.json
acp-bridge daemon start
```

### 2. Register kiro in acpx

```bash
cp acpx/config.json ~/.acpx/config.json

# Install acpx locally inside openclaw extensions
cd ~/.local/lib/node_modules/openclaw/extensions/acpx
npm install --omit=dev --no-save acpx

# Verify
./node_modules/.bin/acpx kiro --help
```

### 3. Setup kiro-cli MCP server

```bash
mkdir -p ~/.local/lib/acp-bridge-mcp
cp mcp-server/index.js ~/.local/lib/acp-bridge-mcp/index.js
cp kiro-cli/cli.json ~/.kiro/settings/cli.json
```

### 4. Patch your OpenClaw SOUL

Prepend `openclaw/SOUL-patch.md` to your agent's `SOUL.md`:

```bash
cat openclaw/SOUL-patch.md | cat - ~/.openclaw/workspace/SOUL.md > /tmp/SOUL.md
mv /tmp/SOUL.md ~/.openclaw/workspace/SOUL.md
```

### 5. Set environment variable

```bash
export TELEGRAM_BOT_TOKEN=your_bot_token_here
# or add to ~/.bashrc
```

### 6. Restart OpenClaw gateway

```bash
systemctl --user restart openclaw-gateway.service
openclaw hooks list  # should show kiro-relay-hook ✓ ready
```

## Test

Send any message to your OpenClaw Telegram bot. The agent will relay it to kiro and return the answer.

```
You:   "What is the capital of France?"
Agent: "The capital of France is Paris."   ← answered by kiro
```

Send `/new` to reset the kiro session.

## Alternative: Hook-based approach

Instead of patching SOUL.md, you can use the hook in `openclaw/hooks/kiro-relay-hook/`:

```bash
cp -r openclaw/hooks/kiro-relay-hook ~/.openclaw/hooks/
```

Then enable it in `~/.openclaw/openclaw.json`:

```json
"hooks": {
  "internal": {
    "enabled": true,
    "entries": {
      "kiro-relay-hook": { "enabled": true }
    }
  }
}
```

> Note: Use either SOUL patch **or** hook, not both, to avoid duplicate replies.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token from @BotFather |
| `ACP_BRIDGE_URL` | acp-bridge daemon URL (default: `http://127.0.0.1:7800`) |

## License

MIT
