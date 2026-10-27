// One local server for the exported web app AND its API. Node 22+, no separate install.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { coachHandler, MAX_REQUEST_BYTES } = require('./coach');
const { healthHandler } = require('./health');
const DIST = path.resolve(__dirname, '../dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
function decorate(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); return res; };
  return res;
}
function createServer() {
  return http.createServer(async (req, rawRes) => {
    const res = decorate(rawRes);
    const origin = req.headers.origin;
    const allowed = !origin || origin === process.env.APP_URL || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (origin && allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (!allowed) return res.status(403).json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' });
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch (_) { return res.status(400).json({ error: 'INVALID_URL' }); }
    if (['/api/health', '/health'].includes(url.pathname)) return healthHandler(req, res);
    if (['/api/coach', '/coach', '/meal-analysis'].includes(url.pathname)) {
      if (req.method !== 'POST') return coachHandler(req, res);
      let bytes = 0, chunks = [];
      try {
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > MAX_REQUEST_BYTES) {
            res.status(413).json({ ok: false, error: 'PAYLOAD_TOO_LARGE', message: 'Réduis la photo à moins de 2 Mo.' });
            req.resume(); return;
          }
          chunks.push(chunk);
        }
        req.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      } catch (_) { return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' }); }
      if (url.pathname === '/meal-analysis') req.body.mode = req.body.mode || 'meal';
      return coachHandler(req, res);
    }
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch (_) { return res.status(400).json({ error: 'INVALID_URL' }); }
    if (pathname.split('/').some(segment => segment.startsWith('.'))) return res.status(404).end();
    const candidate = path.resolve(DIST, '.' + pathname);
    if (candidate !== DIST && !candidate.startsWith(DIST + path.sep)) return res.status(404).end();
    let file = candidate;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (path.extname(pathname)) return res.status(404).end();
      file = path.join(DIST, 'index.html');
    }
    if (!fs.existsSync(file)) return res.status(503).json({ error: 'BUILD_REQUIRED', message: 'Exécute npm run build:web avant de lancer le serveur.' });
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', path.extname(file) === '.html' || path.basename(file) === 'sw.js' ? 'no-cache' : 'public, max-age=3600');
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(file);
    stream.on('error', () => { if (!res.headersSent) res.statusCode = 500; res.end(); });
    stream.pipe(res);
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT) || 8787;
  createServer().listen(port, '0.0.0.0', () => console.log(`YProgress : http://localhost:${port} • application et API`));
}
module.exports = { createServer };
