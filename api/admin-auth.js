/**
 * POST /api/admin-auth
 * Body: { "adminPin": "..." }
 */
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const adminPin = String(body.adminPin || '').trim();
  const expected = String(process.env.ADMIN_PIN || '').trim();

  if (!expected) {
    res.status(500).json({ ok: false, error: 'server_misconfigured' });
    return;
  }

  if (adminPin !== expected) {
    res.status(401).json({ ok: false, error: 'invalid_pin' });
    return;
  }

  res.status(200).json({ ok: true });
};
