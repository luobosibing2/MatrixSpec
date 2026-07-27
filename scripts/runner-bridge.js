const argv = process.argv.slice(2);
const option = (name, fallback = null) => argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback;
const runner = option("--runner");
const url = option("--url");
const model = option("--model");
const prompt = await readStdin();

try {
  if (runner !== "opencode-serve") throw new Error(`Unsupported bridge runner: ${runner}`);
  const content = await runOpenCode(url, prompt, model);
  process.stdout.write(`${JSON.stringify({ content })}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

async function runOpenCode(base, text, selectedModel) {
  const sessionResponse = await fetch(`${base.replace(/\/$/, "")}/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(10000)
  });
  if (!sessionResponse.ok) throw new Error(`opencode-serve session HTTP ${sessionResponse.status}`);
  const session = await sessionResponse.json();
  const id = session.id || session.sessionID || session.data?.id;
  if (!id) throw new Error("opencode-serve did not return a session id");
  const response = await fetch(`${base.replace(/\/$/, "")}/session/${encodeURIComponent(id)}/message`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ parts: [{ type: "text", text }], ...(selectedModel ? { model: selectedModel } : {}) }),
    signal: AbortSignal.timeout(30 * 60 * 1000)
  });
  if (!response.ok) throw new Error(`opencode-serve task HTTP ${response.status}`);
  const body = await response.json();
  return extract(body);
}

function extract(value) {
  if (typeof value === "string") return value;
  for (const candidate of [value.content, value.markdown, value.final, value.result, value.text, value.message?.content, value.data?.content]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (Array.isArray(candidate)) {
      const joined = candidate.map((item) => item?.text || item?.content || "").join("");
      if (joined.trim()) return joined;
    }
  }
  throw new Error("runner returned no content");
}

async function readStdin() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value;
}
