const { toPublicItem, DEFAULT_GALLERY } = require('./shipping-parse');
const { readState } = require('./shipping-state');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const state = await readState();
    if (state == null) {
      res.setHeader(
        'Cache-Control',
        'private, no-store, no-cache, must-revalidate, max-age=0'
      );
      res.status(503).json({
        error: 'not_configured',
        items: [],
        hint:
          'Vercel에 BLOB_READ_WRITE_TOKEN 과 SHIPPING_PAYLOAD_SECRET(16자 이상)을 Production 환경에 설정하세요.',
      });
      return;
    }

    const galleryMenuUrl = state.galleryMenuUrl || DEFAULT_GALLERY;
    const items = (state.items || [])
      .slice(0, 6)
      .map((internal) => toPublicItem(internal, galleryMenuUrl));

    res.setHeader(
      'Cache-Control',
      'private, no-store, no-cache, must-revalidate, max-age=0'
    );
    res.status(200).json({
      galleryMenuUrl,
      items,
      source: 'blob',
    });
  } catch (e) {
    console.error('[shipping-public]', e);
    res.setHeader(
      'Cache-Control',
      'private, no-store, no-cache, must-revalidate, max-age=0'
    );
    res.status(500).json({ error: 'server_error', items: [] });
  }
};
