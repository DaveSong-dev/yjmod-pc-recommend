/**
 * POST /api/admin-soldout-log
 * Body: { "adminPin": "..." }
 * GitHub data/soldout_log.json 최신본을 직접 읽어 반환합니다.
 * admin 새로고침은 Vercel 정적 파일 대신 이 API를 호출합니다.
 */
const { Octokit } = require('@octokit/rest');

const LOG_PATH = 'data/soldout_log.json';
const PC_DATA_PATH = 'data/pc_data.json';

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const adminPin = String(body.adminPin || '').trim();

  if (adminPin !== String(process.env.ADMIN_PIN || '').trim()) {
    res.status(401).json({ error: 'Invalid PIN' });
    return;
  }

  const token = String(process.env.GH_TOKEN || '').trim();
  const repoSpec = String(process.env.GH_REPO || '').trim();
  const branch = String(process.env.GH_BRANCH || 'master').trim();

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

  async function fetchJson(path) {
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if (fileData.type !== 'file' || !fileData.content) {
      throw new Error(`Unexpected GitHub response for ${path}`);
    }
    return JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
  }

  try {
    // soldout_log는 필수 (실패 시 오류 반환), pc_data는 실패해도 계속
    let log, pcData;
    try {
      log = await fetchJson(LOG_PATH);
    } catch (e) {
      const st = e && (e.status || (e.response && e.response.status));
      const detail = e && e.message ? e.message : String(e);
      res.status(500).json({
        error: `soldout_log.json 읽기 실패 (HTTP ${st || '?'}): ${detail}`,
      });
      return;
    }
    try {
      pcData = await fetchJson(PC_DATA_PATH);
    } catch (_) {
      pcData = null; // pc_data는 없어도 진행
    }

    // pc_data에서 id → { in_stock, name } 맵만 추출 (크기 절감)
    const pcMap = {};
    if (pcData && Array.isArray(pcData.products)) {
      for (const p of pcData.products) {
        if (p.id != null) {
          pcMap[String(p.id)] = { in_stock: p.in_stock, name: p.name || '' };
        }
      }
    }

    res.json({ log, pcMap });
  } catch (err) {
    const msg = err && err.message ? err.message : 'unknown_error';
    res.status(500).json({ error: msg });
  }
};
