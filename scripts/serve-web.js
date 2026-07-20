import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../packages/web/static");
const argv = process.argv.slice(2);
const value = (name, fallback) => argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback;
const host = value("--host", process.env.HOST || "127.0.0.1");
const port = Number(value("--port", process.env.PORT || 4173));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };

const server = http.createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) return send(response, 405, "Method Not Allowed");
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname); }
  catch { return send(response, 400, "Bad Request"); }
  if (pathname === "/" || pathname === "/index.html") pathname = "/matspec-home.html";
  const file = path.resolve(root, `.${path.normalize(pathname)}`);
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return send(response, 403, "Forbidden");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(response, 404, "Not Found");
  response.writeHead(200, { "content-type": mime[path.extname(file).toLowerCase()] || "application/octet-stream", "content-length": fs.statSync(file).size });
  if (request.method === "HEAD") return response.end();
  fs.createReadStream(file).pipe(response);
});

server.listen(port, host, () => console.log(`MatSpec web: http://${host}:${port}`));

function send(response, status, body) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(body);
}
