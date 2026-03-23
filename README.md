# openclaw-kiro-bridge

Integrates [kiro-cli](https://kiro.dev) as an ACP agent into [OpenClaw](https://openclaw.ai), allowing OpenClaw to relay all conversations through kiro-cli (backed by AWS Bedrock).

## Architecture

```
Telegram / any channel
  ↓
OpenClaw agent (SOUL instructions)
  ↓ acpx kiro
kiro-cli acp --trust-all-tools
  ↓
Kiro LLM (AWS Bedrock)
  ↓ answer
Telegram / any channel
```

## Prerequisites

- [kiro-cli](https://kiro.dev) installed and authenticated (`kiro-cli --version` should work)
- [OpenClaw](https://openclaw.ai) installed and running (`openclaw --version` should work)
- Node.js >= 18
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))

## Quick Start

```bash
git clone https://github.com/masami-agent/openclaw-kiro-bridge.git
cd openclaw-kiro-bridge
```

Then follow the steps below.

## Setup

### 1. Install acp-bridge

```bash
npm install -g acp-bridge
mkdir -p ~/.config/acp-bridge
cp acp-bridge/config.json ~/.config/acp-bridge/config.json
acp-bridge daemon start
# Verify: acp-bridge daemon status
```

### 2. Register kiro in acpx

```bash
mkdir -p ~/.acpx
cp acpx/config.json ~/.acpx/config.json

# Find your openclaw extensions directory
OPENCLAW_DIR=$(npm root -g)/openclaw
echo "openclaw is at: $OPENCLAW_DIR"

# Install acpx inside openclaw extensions
mkdir -p $OPENCLAW_DIR/extensions/acpx
cd $OPENCLAW_DIR/extensions/acpx
npm install --omit=dev --no-save acpx

# Verify
./node_modules/.bin/acpx --version
```

### 3. Setup kiro-cli MCP server

```bash
cd ~/openclaw-kiro-bridge   # back to repo root

mkdir -p ~/.local/lib/acp-bridge-mcp
cp mcp-server/index.js ~/.local/lib/acp-bridge-mcp/index.js

mkdir -p ~/.kiro/settings
cp kiro-cli/cli.json ~/.kiro/settings/cli.json
```

### 4. Set environment variables

```bash
cp .env.example .env
# Edit .env and fill in your values:
#   TELEGRAM_BOT_TOKEN=your_bot_token_here
#   ACPX_BIN=/path/to/acpx   (only if acpx is not in PATH)
```

### 5. Patch your OpenClaw SOUL

```bash
cat openclaw/SOUL-patch.md | cat - ~/.openclaw/workspace/SOUL.md > /tmp/SOUL.md
mv /tmp/SOUL.md ~/.openclaw/workspace/SOUL.md
```

### 6. Restart OpenClaw gateway

```bash
systemctl --user restart openclaw-gateway.service
systemctl --user is-active openclaw-gateway.service   # should print: active
```

## Test

Send any message to your OpenClaw Telegram bot:

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

Enable it in `~/.openclaw/openclaw.json`:

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

Then set `TELEGRAM_BOT_TOKEN` and `ACPX_BIN` in your environment before restarting the gateway.

> **Note:** Use either SOUL patch **or** hook — not both — to avoid duplicate replies.

## Troubleshooting

**Can't find openclaw directory (Step 2)**

`npm root -g` only works if openclaw was installed via npm globally. Try these alternatives:

```bash
# Option A: which/whereis
which openclaw && ls $(dirname $(which openclaw))/../lib/node_modules/openclaw

# Option B: find common locations
ls ~/.local/lib/node_modules/openclaw 2>/dev/null
ls /usr/local/lib/node_modules/openclaw 2>/dev/null
ls /usr/lib/node_modules/openclaw 2>/dev/null

# Option C: ask openclaw directly
openclaw --config-dir 2>/dev/null || openclaw config --show 2>/dev/null
```

Once found, replace `$OPENCLAW_DIR` in Step 2 with the actual path.

---

**`acp-bridge daemon start` fails**

Check if port 7800 is already in use:
```bash
lsof -i :7800
# If occupied, change port in ~/.config/acp-bridge/config.json and kiro-cli/cli.json
```

---

**`systemctl --user` not available (macOS / non-systemd Linux)**

Manually start the gateway:
```bash
openclaw gateway start &
```

---

**kiro-cli not authenticated**

```bash
kiro-cli auth login
# Follow the prompts to connect your AWS Bedrock account
```

---

**acpx can't find kiro after setup**

Ensure `kiro-cli` is in PATH:
```bash
which kiro-cli   # should return a path
# If not, add its install location to PATH in ~/.bashrc
```

## File Structure

```
.
├── .env.example                              # Environment variable template
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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Your Telegram bot token from @BotFather |
| `ACPX_BIN` | No | Full path to acpx binary (if not in PATH) |
| `ACP_BRIDGE_URL` | No | acp-bridge URL (default: `http://127.0.0.1:7800`) |

## Security Notes

- `--trust-all-tools` auto-approves all kiro tool permission requests. Only use in a trusted local environment. Remove this flag if you want manual approval per tool call.
- Never commit `.env` or any file containing real tokens/keys.
- acp-bridge binds to `127.0.0.1` by default — do not expose port 7800 publicly.

## License

MIT
