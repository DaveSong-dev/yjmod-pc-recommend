const crypto = require('crypto');
const { put } = require('@vercel/blob');

const ALGO = 'aes-256-gcm';

function getSecret() {
  return String(process.env.ANALYTICS_PAYLOAD_SECRET || process.env.SHIPPING_PAYLOAD_SECRET || '').trim();
}

function getKey(secret) {
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

function sanitizeValue(value, depth = 0) {
  if (value == null) return null;
  if (depth > 3) return null;
  if (Array.isArray(value)) {
    return value
      .slice(0, 12)
      .map(item => sanitizeValue(item, depth + 1))
      .filter(item => item != null);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      const sanitized = sanitizeValue(nested, depth + 1);
      if (sanitized != null && sanitized !== '') out[key] = sanitized;
    }
    return Object.keys(out).length ? out : null;
  }
  if (typeof value === 'string') return value.trim().slice(0, 240);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  return null;
}

function encryptPayload(payload, secret) {
  const key = getKey(secret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plain = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const event = typeof body.event === 'string' ? body.event.trim().slice(0, 80) : '';
  if (!event) {
    res.status(400).json({ ok: false, error: 'event_required' });
    return;
  }

  const entry = sanitizeValue({
    ...body,
    event,
    received_at: new Date().toISOString(),
    request_id: `evt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  }) || { event };

  const token = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  const secret = getSecret();
  const canPersist = token && secret.length >= 16;

  if (!canPersist) {
    console.log('[track-event]', JSON.stringify(entry));
    res.status(200).json({ ok: true, stored: false, mode: 'log' });
    return;
  }

  const day = new Date().toISOString().slice(0, 10);
  const filename = `analytics/events/${day}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.enc`;

  try {
    const payload = encryptPayload(entry, secret);
    await put(filename, payload, {
      access: 'public',
      token,
      contentType: 'text/plain; charset=utf-8',
      addRandomSuffix: false
    });
    res.status(200).json({ ok: true, stored: true, mode: 'blob' });
  } catch (error) {
    console.error('[track-event] blob put failed', error);
    console.log('[track-event:fallback]', JSON.stringify(entry));
    res.status(200).json({ ok: true, stored: false, mode: 'log-fallback' });
  }
};
