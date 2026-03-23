import { execSync } from "child_process";

const ACPX = "/home/vboxuser/.local/lib/node_modules/openclaw/extensions/acpx/node_modules/.bin/acpx";
const BOT_TOKEN = "7896590993:AAG1qJe8CJ_oA-ypQTQRO0WjJ7Y9uEdcSWM";

async function sendTelegram(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

const handler = async (event: any) => {
  if (event.type !== "message" || event.action !== "received") return;

  const content = event.context?.content;
  if (!content) return;

  const chatId = event.sessionKey?.split(":").pop();
  if (!chatId) return;

  const sessionName = `oc-kiro-${chatId}`;

  if (content.trim() === "/new") {
    try { execSync(`${ACPX} kiro sessions close ${sessionName} 2>/dev/null`); } catch {}
    return;
  }

  try {
    // ensure session exists
    try {
      execSync(`${ACPX} kiro sessions show ${sessionName} 2>/dev/null`);
    } catch {
      execSync(`${ACPX} kiro sessions new --name ${sessionName}`);
    }

    const result = execSync(
      `${ACPX} kiro -s ${sessionName} --format quiet -f -`,
      { input: content, timeout: 120000, encoding: "utf8" }
    );

    const reply = result.trim().split("\n").filter((l: string) => l && !l.startsWith("[")).join("\n");
    if (reply) await sendTelegram(chatId, reply);
  } catch (err: any) {
    // silent fail
  }
};

export default handler;
