#!/usr/bin/env node
// kiro-openai-proxy: OpenAI-compatible API proxy backed by kiro-cli via acp-bridge
const http = require("http");

const ACP_URL = process.env.ACP_BRIDGE_URL || "http://127.0.0.1:7800";
const AGENT = process.env.ACP_AGENT || "kiro-agent";
const PORT = process.env.PROXY_PORT || 4099;

function acpAsk(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ prompt });
    const url = new URL(`${ACP_URL}/agents/${AGENT}/ask`);
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error(data)); }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ object: "list", data: [{ id: "kiro", object: "model", owned_by: "kiro" }] }));
  }

  if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
    res.writeHead(404); return res.end();
  }

  let body = "";
  const MAX_BODY = 64 * 1024; // 64KB limit
  req.on("data", (c) => {
    body += c;
    if (body.length > MAX_BODY) { res.writeHead(413); res.end(); req.destroy(); }
  });
  req.on("end", async () => {
    try {
      const { messages = [] } = JSON.parse(body);
      // Flatten conversation into a single prompt
      const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
      const result = await acpAsk(prompt);
      const reply = result.response || result.error || "no response";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id: `chatcmpl-kiro-${Date.now()}`,
        object: "chat.completion",
        model: "kiro",
        choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, "127.0.0.1", () => console.log(`kiro-openai-proxy listening on http://127.0.0.1:${PORT}`));
