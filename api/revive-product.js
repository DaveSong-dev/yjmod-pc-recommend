/**
 * POST /api/revive-product
 * Body: { "productId": "...", "adminPin": "..." }
 * data/soldout_log.json 을 GitHub API로 갱신합니다.
 */
const { Octokit } = require('@octokit/rest');

const LOG_PATH = 'data/soldout_log.json';

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const productId = String(body.productId || '').trim();
  const adminPin = String(body.adminPin || '').trim();

  if (!productId) {
    res.status(400).json({ error: 'productId required' });
    return;
  }

  if (adminPin !== String(process.env.ADMIN_PIN || '').trim()) {
    res.status(401).json({ error: 'Invalid PIN' });
    return;
  }

  const token = String(process.env.GH_TOKEN || '').trim();
  const repoSpec = String(process.env.GH_REPO || '').trim();
  const branch = String(process.env.GH_BRANCH || 'main').trim();

  if (!token || !repoSpec.includes('/')) {
    res.status(500).json({ error: 'GitHub env not configured' });
    return;
  }

  const [owner, repo] = repoSpec.split('/').map((s) => s.trim()).filter(Boolean);
  if (!owner || !repo) {
    res.status(500).json({ error: 'Invalid GH_REPO' });
    return;
  }

  const octokit = new Octokit({ auth: token });

  try {
    let sha = null;
    let content = { soldout: [], revived: [] };

    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: LOG_PATH,
        ref: branch,
      });

      if (fileData.type !== 'file' || !fileData.content) {
        res.status(500).json({ error: 'Unexpected file response' });
        return;
      }

      sha = fileData.sha;
      content = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
    } catch (e) {
      const st = e && (e.status || (e.response && e.response.status));
      if (st !== 404) {
        throw e;
      }
    }

    if (!Array.isArray(content.soldout)) {
      content.soldout = [];
    }
    if (!Array.isArray(content.revived)) {
      content.revived = [];
    }

    const product = content.soldout.find((p) => String(p.id) === productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    product.revived = true;
    product.revived_at = new Date().toISOString();

    const payload = {
      owner,
      repo,
      path: LOG_PATH,
      message: `복원: 상품 ${productId} 재입고`,
      content: Buffer.from(JSON.stringify(content, null, 2), 'utf8').toString('base64'),
      branch,
    };
    if (sha) {
      payload.sha = sha;
    }

    await octokit.repos.createOrUpdateFileContents(payload);

    res.json({ success: true, productId });
  } catch (err) {
    const msg = err && err.message ? err.message : 'unknown_error';
    res.status(500).json({ error: msg });
  }
};
