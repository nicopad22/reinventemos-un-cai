import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiHandler from '../api/t.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PORT = Number(process.env.PORT || 8080);

const STATIC_ROUTES = new Map([
  ['/', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/index.html', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/style.css', { file: 'style.css', type: 'text/css; charset=utf-8' }],
  ['/script.js', { file: 'script.js', type: 'text/javascript; charset=utf-8' }],
  ['/robots.txt', { file: 'robots.txt', type: 'text/plain; charset=utf-8' }]
]);

const server = http.createServer((req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/t') {
    apiHandler(req, res);
    return;
  }

  const route = STATIC_ROUTES.get(url.pathname);
  if (route && (req.method === 'GET' || req.method === 'HEAD')) {
    const filePath = path.join(PUBLIC_DIR, route.file);
    res.writeHead(200, {
      'Content-Type': route.type,
      'Cache-Control': 'no-cache'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const notFoundPath = path.join(PUBLIC_DIR, '404.html');
  res.writeHead(404, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(notFoundPath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
