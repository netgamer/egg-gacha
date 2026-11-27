import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

/** Minimal static server for the built `dist/`. */
export function startServer(root, port = 0) {
  const base = path.resolve(root);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let file = path.join(base, decodeURIComponent(url.pathname));
      if (!file.startsWith(base)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      let info = await stat(file).catch(() => null);
      if (info?.isDirectory()) {
        file = path.join(file, 'index.html');
        info = await stat(file).catch(() => null);
      }
      if (!info) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': body.length,
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const { port: p } = server.address();
      resolve({ server, port: p, url: `http://127.0.0.1:${p}/` });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] || 'dist';
  const port = Number(process.argv[3] || 4173);
  const { url } = await startServer(root, port);
  console.log(`serving ${root} at ${url}`);
}
