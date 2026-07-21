import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 8888);
const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".svg":"image/svg+xml", ".md":"text/markdown; charset=utf-8" };

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const safe = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  let file = join(root, safe === "/" ? "index.html" : safe);
  if (!file.startsWith(root) || !existsSync(file)) file = join(root, "index.html");
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Data Matters: http://localhost:${port}`));
