const crypto = require('crypto');
const { put } = require('@vercel/blob');
const { parseShippingLine, buildInternalRecord, DEFAULT_GALLERY, toPublicItem } = require('./shipping-parse');
const { readState, writeState } = require('./shipping-state');

const MAX_BYTES = 4 * 1024 * 1024;

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const admin = String(process.env.SHIPPING_ADMIN_TOKEN || '').trim();
  const rawAuth = String(req.headers.authorization || '').trim();
  let bearerToken = '';
  const m = /^Bearer\s+(.+)$/i.exec(rawAuth);
  if (m) bearerToken = m[1].trim();
  const authNormalized = bearerToken ? `Bearer ${bearerToken}` : '';
  if (!admin || authNormalized !== `Bearer ${admin}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { rawLine, imageBase64, mimeType, cafeUrl, dryRun } = body;

  if (dryRun) {
    try {
      const parsed = parseShippingLine(String(rawLine || ''));
      const date = new Date().toISOString().slice(0, 10);
      const preview = buildInternalRecord({
        id: 'preview',
        date,
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        engineerName: parsed.engineerName,
        imageUrl: '',
        cafeUrl: cafeUrl ? String(cafeUrl).trim() : '',
      });
      res.status(200).json({
        ok: true,
        dryRun: true,
        preview: {
          customerDisplay: preview.customerDisplay,
          title: preview.title,
          summary: preview.summary,
          phoneMasked: preview.customerPhoneMasked,
        },
      });
    } catch (e) {
      res.status(400).json({
        ok: false,
        error: e.message || 'parse_error',
        code: e.code || 'PARSE',
      });
    }
    return;
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN || '';
  const payloadSecret = process.env.SHIPPING_PAYLOAD_SECRET || '';
  if (!blobToken) {
    res.status(503).json({ ok: false, error: 'blob_not_configured' });
    return;
  }
  if (payloadSecret.length < 16) {
    res.status(503).json({ ok: false, error: 'payload_secret_not_configured' });
    return;
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({ ok: false, error: 'image_required' });
    return;
  }

  let buf;
  try {
    buf = Buffer.from(imageBase64, 'base64');
  } catch {
    res.status(400).json({ ok: false, error: 'image_decode' });
    return;
  }

  if (!buf.length || buf.length > MAX_BYTES) {
    res.status(400).json({ ok: false, error: 'image_too_large', maxMb: 4 });
    return;
  }

  const mime = typeof mimeType === 'string' ? mimeType : 'image/jpeg';
  if (!mime.startsWith('image/')) {
    res.status(400).json({ ok: false, error: 'invalid_mime' });
    return;
  }

  let parsed;
  try {
    parsed = parseShippingLine(String(rawLine || ''));
  } catch (e) {
    res.status(400).json({
      ok: false,
      error: e.message || 'parse_error',
      code: e.code || 'PARSE',
    });
    return;
  }

  const ext =
    mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const id = `ship-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const date = new Date().toISOString().slice(0, 10);

  let imageUrl;
  try {
    const out = await put(`recent-shipping/images/${id}.${ext}`, buf, {
      access: 'public',
      token: blobToken,
      contentType: mime,
      addRandomSuffix: false,
    });
    imageUrl = out.url;
  } catch (e) {
    console.error('[shipping-submit] blob put image', e);
    res.status(500).json({ ok: false, error: 'image_upload_failed' });
    return;
  }

  const record = buildInternalRecord({
    id,
    date,
    customerName: parsed.customerName,
    customerPhone: parsed.customerPhone,
    engineerName: parsed.engineerName,
    imageUrl,
    cafeUrl: cafeUrl ? String(cafeUrl).trim() : '',
    createdAt: new Date().toISOString(),
  });

  let state = await readState();
  if (state == null) {
    res.status(503).json({ ok: false, error: 'storage_not_configured' });
    return;
  }
  if (!Array.isArray(state.items)) state.items = [];
  if (!state.galleryMenuUrl) state.galleryMenuUrl = DEFAULT_GALLERY;

  state.items = [record, ...state.items].slice(0, 6);

  try {
    await writeState(state);
  } catch (e) {
    console.error('[shipping-submit] writeState', e);
    res.status(500).json({ ok: false, error: 'state_save_failed' });
    return;
  }

  const publicItem = toPublicItem(record, state.galleryMenuUrl);
  res.status(200).json({
    ok: true,
    item: publicItem,
    total: state.items.length,
  });
};
