const TARGET_MS = 1793016000000;
const DEST_B64 = 'aHR0cHM6Ly9wdWxzb2NhaS5jbA==';

export function buildPayload(now = Date.now()) {
  const payload = {
    n: now,
    t: TARGET_MS
  };

  if (now >= TARGET_MS) {
    payload.u = process.env.REDIRECT_URL || Buffer.from(DEST_B64, 'base64').toString('utf8');
  }

  return payload;
}

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.end();
    return;
  }

  const body = JSON.stringify(buildPayload());

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.end(req.method === 'HEAD' ? undefined : body);
}
