/**
 * GET /api/soldout-log
 * GitHub 원본 data/soldout_log.json을 읽어 최신 상태를 반환합니다.
 */
const { Octokit } = require('@octokit/rest');

const LOG_PATH = 'data/soldout_log.json';

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const token = String(process.env.GH_TOKEN || '').trim();
  const repoSpec = String(process.env.GH_REPO || '').trim();
  const branch = String(process.env.GH_BRANCH || 'main').trim();

  if (!token || !repoSpec.includes('/')) {
    res.status(500).json({ ok: false, error: 'github_env_not_configured' });
    return;
  }

  const [owner, repo] = repoSpec.split('/').map((s) => s.trim()).filter(Boolean);
  if (!owner || !repo) {
    res.status(500).json({ ok: false, error: 'invalid_repo_spec' });
    return;
  }

  try {
    const octokit = new Octokit({ auth: token });
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path: LOG_PATH,
      ref: branch,
    });

    if (fileData.type !== 'file' || !fileData.content) {
      res.status(500).json({ ok: false, error: 'unexpected_file_response' });
      return;
    }

    const content = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
    if (!Array.isArray(content.soldout)) content.soldout = [];
    if (!Array.isArray(content.revived)) content.revived = [];

    res.status(200).json(content);
  } catch (err) {
    const status = err && (err.status || (err.response && err.response.status));
    if (status === 404) {
      res.status(200).json({ soldout: [], revived: [] });
      return;
    }
    const message = err && err.message ? err.message : 'unknown_error';
    res.status(500).json({ ok: false, error: message });
  }
};
