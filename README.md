# openclaw-kiro-bridge

Integrates [kiro-cli](https://kiro.dev) as an ACP agent into [OpenClaw](https://openclaw.ai), allowing OpenClaw to relay all conversations through kiro-cli (backed by AWS Bedrock).

## Architecture

```
Telegram
  ↓
OpenClaw (Chloe agent, gpt-5.2 executes SOUL instructions)
  ↓ acpx kiro
kiro-cli acp --trust-all-tools
  ↓
Kiro LLM (AWS Bedrock)
  ↓ answer
Telegram
```

## Files

| File | Purpose |
|------|---------|
| `acpx/config.json` | Register kiro as an acpx agent |
| `acp-bridge/config.json` | acp-bridge daemon config with kiro agent |
| `mcp-server/index.js` | MCP server wrapping acp-bridge HTTP API for kiro-cli |
| `kiro-cli/cli.json` | kiro-cli MCP server registration |
| `openclaw/hooks/kiro-relay-hook/HOOK.md` | Hook metadata (disabled, replaced by SOUL) |
| `openclaw/hooks/kiro-relay-hook/handler.ts` | Hook handler (disabled) |
| `openclaw/SOUL-patch.md` | SOUL.md patch to relay answers through kiro |

## Setup

### Prerequisites

- [kiro-cli](https://kiro.dev) installed
- [OpenClaw](https://openclaw.ai) installed and running
- Node.js

### 1. Install acp-bridge

```bash
npm install -g acp-bridge
cp acp-bridge/config.json ~/.config/acp-bridge/config.json
acp-bridge daemon start
```

### 2. Register kiro in acpx

```bash
cp acpx/config.json ~/.acpx/config.json
```

Install acpx locally in openclaw extensions:

```bash
cd ~/.local/lib/node_modules/openclaw/extensions/acpx
npm install --omit=dev --no-save acpx
```

### 3. Setup kiro-cli MCP server

```bash
mkdir -p ~/.local/lib/acp-bridge-mcp
cp mcp-server/index.js ~/.local/lib/acp-bridge-mcp/index.js
cp kiro-cli/cli.json ~/.kiro/settings/cli.json
```

### 4. Patch OpenClaw SOUL

Prepend the contents of `openclaw/SOUL-patch.md` to `~/.openclaw/workspace/SOUL.md`.

### 5. Restart OpenClaw gateway

```bash
systemctl --user restart openclaw-gateway.service
```

## Usage

Send any message to your OpenClaw Telegram bot — Chloe will relay it to kiro and return the answer.

Send `/new` to reset the kiro session.
