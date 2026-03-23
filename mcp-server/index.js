#!/usr/bin/env node
// MCP server wrapping acp-bridge HTTP API for kiro-cli
const http = require("http");
const readline = require("readline");

const ACP_URL = process.env.ACP_BRIDGE_URL || "http://127.0.0.1:7800";

function acpRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(ACP_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { "Content-Type": "application/json", ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}) }
    };
    const req = http.request(opts, res => {
      let buf = "";
      res.on("data", d => buf += d);
      res.on("end", () => { try { resolve(JSON.parse(buf)); } catch { resolve(buf); } });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const TOOLS = [
  { name: "acp_daemon_health", description: "Check acp-bridge daemon health", inputSchema: { type: "object", properties: {} } },
  { name: "acp_list_agents", description: "List all running agents", inputSchema: { type: "object", properties: {} } },
  { name: "acp_start_agent", description: "Start a coding agent (opencode/codex/claude/gemini)", inputSchema: { type: "object", required: ["type", "name"], properties: { type: { type: "string" }, name: { type: "string" }, cwd: { type: "string" } } } },
  { name: "acp_ask_agent", description: "Send a prompt to an agent and get response", inputSchema: { type: "object", required: ["name", "prompt"], properties: { name: { type: "string" }, prompt: { type: "string" } } } },
  { name: "acp_agent_status", description: "Get status of a specific agent", inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } },
  { name: "acp_stop_agent", description: "Stop a running agent", inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } },
  { name: "acp_approve", description: "Approve a pending permission request", inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } },
  { name: "acp_deny", description: "Deny a pending permission request", inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } },
];

async function handleTool(name, args) {
  switch (name) {
    case "acp_daemon_health": return acpRequest("GET", "/health");
    case "acp_list_agents": return acpRequest("GET", "/agents");
    case "acp_start_agent": return acpRequest("POST", "/agents", { type: args.type, name: args.name, cwd: args.cwd || process.cwd() });
    case "acp_ask_agent": return acpRequest("POST", `/agents/${args.name}/ask`, { prompt: args.prompt });
    case "acp_agent_status": return acpRequest("GET", `/agents/${args.name}`);
    case "acp_stop_agent": return acpRequest("DELETE", `/agents/${args.name}`);
    case "acp_approve": return acpRequest("POST", `/agents/${args.name}/approve`);
    case "acp_deny": return acpRequest("POST", `/agents/${args.name}/deny`);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async line => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const { id, method, params } = msg;

  let result;
  try {
    if (method === "initialize") {
      result = { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "acp-bridge-mcp", version: "1.0.0" } };
    } else if (method === "tools/list") {
      result = { tools: TOOLS };
    } else if (method === "tools/call") {
      const data = await handleTool(params.name, params.arguments || {});
      result = { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } else {
      result = {};
    }
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
  } catch (e) {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message: e.message } }) + "\n");
  }
});
