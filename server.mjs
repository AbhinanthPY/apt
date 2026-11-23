import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url)).replace(/[/\\]$/, '');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif' };
const server = http.createServer((req, res) => {
  let path;
  try { path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400).end(); return; }
  if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  if (path === root) path = resolve(root, 'index.html');
  const requested = path.slice(root.length + 1).split(sep);
  const publicFile = requested.length === 1 && extname(path).toLowerCase() === '.html';
  const publicFolder = ['assets', 'css', 'js'].includes(requested[0]);
  if (!publicFile && !publicFolder) { res.writeHead(404).end('Not found'); return; }
  let stat;
  try { stat = statSync(path); if (!stat.isFile()) throw Error(); } catch { res.writeHead(404).end('Not found'); return; }
  const headers = { 'Content-Type': mime[extname(path).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if (range) {
    const start = Number(range[1]);
    const end = Math.min(range[2] ? Number(range[2]) : stat.size - 1, stat.size - 1);
    if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end(); return; }
    res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${stat.size}` });
    createReadStream(path, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...headers, 'Content-Length': stat.size });
    if (req.method === 'HEAD') res.end(); else createReadStream(path).pipe(res);
  }
});
server.listen(Number(process.env.PORT || 4174), '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}`));
