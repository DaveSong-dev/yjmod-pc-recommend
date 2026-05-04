/**
 * POST /api/revive-product
 * Body: { "productId": "...", "adminPin": "..." }
 *
 * soldout_log.json (revived=true) + pc_data.json (in_stock=true) 을
 * Git Trees/Commits API로 단일 커밋에 반영합니다.
 * 이렇게 해야 isInStock()의 in_stock !== true 차단을 실제로 해소할 수 있습니다.
 */
const { Octokit } = require('@octokit/rest');

const LOG_PATH     = 'data/soldout_log.json';
const PC_DATA_PATH = 'data/pc_data.json';

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') { res.status(405).end(); return; }

  const body      = req.body && typeof req.body === 'object' ? req.body : {};
  const productId = String(body.productId || '').trim();
  const adminPin  = String(body.adminPin  || '').trim();

  if (!productId) { res.status(400).json({ error: 'productId required' }); return; }

  if (adminPin !== String(process.env.ADMIN_PIN || '').trim()) {
    res.status(401).json({ error: 'Invalid PIN' }); return;
  }

  const token    = String(process.env.GH_TOKEN  || '').trim();
  const repoSpec = String(process.env.GH_REPO   || '').trim();
  const branch   = String(process.env.GH_BRANCH || 'master').trim();

  if (!token || !repoSpec.includes('/')) {
    res.status(503).json({ error: 'write_unavailable' }); return;
  }

  const [owner, repo] = repoSpec.split('/').map(s => s.trim()).filter(Boolean);
  if (!owner || !repo) {
    res.status(503).json({ error: 'write_unavailable' }); return;
  }

  const octokit = new Octokit({ auth: token });

  // ── 파일 읽기 헬퍼 ────────────────────────────────────────────
  async function readFile(path) {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (data.type !== 'file' || !data.content) throw new Error(`Unexpected response for ${path}`);
    return {
      sha:     data.sha,
      content: JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')),
    };
  }

  try {
    // ── 두 파일 병렬 조회 ─────────────────────────────────────
    let logData, pcData;
    try {
      [logData, pcData] = await Promise.all([readFile(LOG_PATH), readFile(PC_DATA_PATH)]);
    } catch (e) {
      const st = e && (e.status || (e.response && e.response.status));
      res.status(500).json({ error: `파일 읽기 실패 (HTTP ${st || '?'}): ${e.message || e}` });
      return;
    }

    const log    = logData.content;
    const pcJson = pcData.content;

    if (!Array.isArray(log.soldout)) log.soldout = [];
    if (!Array.isArray(log.revived)) log.revived  = [];

    // ── soldout_log 갱신 ──────────────────────────────────────
    const soldoutEntry = log.soldout.find(p => String(p.id) === productId);
    if (!soldoutEntry) {
      res.status(404).json({ error: 'soldout_log에 해당 상품 없음' }); return;
    }
    soldoutEntry.revived      = true;
    soldoutEntry.revived_by   = 'admin';
    soldoutEntry.revived_at   = new Date().toISOString();

    // ── pc_data 갱신: in_stock=true ───────────────────────────
    const pcProducts = Array.isArray(pcJson) ? pcJson : (pcJson.products || []);
    const pcEntry    = pcProducts.find(p => String(p.id) === productId);
    if (pcEntry) {
      pcEntry.in_stock = true;
    }
    // pc_data의 루트 구조 보존
    const updatedPcJson = Array.isArray(pcJson) ? pcProducts : { ...pcJson, products: pcProducts };

    // ── Git Trees/Commits API로 단일 커밋 ─────────────────────
    // 1) 현재 브랜치 HEAD 커밋 SHA
    const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const headSha = refData.object.sha;

    // 2) HEAD 커밋의 tree SHA
    const { data: headCommit } = await octokit.git.getCommit({ owner, repo, commit_sha: headSha });
    const baseTreeSha = headCommit.tree.sha;

    // 3) 두 파일 blob 생성
    const [logBlob, pcBlob] = await Promise.all([
      octokit.git.createBlob({
        owner, repo,
        content:  Buffer.from(JSON.stringify(log, null, 2), 'utf8').toString('base64'),
        encoding: 'base64',
      }),
      octokit.git.createBlob({
        owner, repo,
        content:  Buffer.from(JSON.stringify(updatedPcJson, null, 2), 'utf8').toString('base64'),
        encoding: 'base64',
      }),
    ]);

    // 4) 새 tree 생성 (두 파일 포함)
    const { data: newTree } = await octokit.git.createTree({
      owner, repo,
      base_tree: baseTreeSha,
      tree: [
        { path: LOG_PATH,     mode: '100644', type: 'blob', sha: logBlob.data.sha },
        { path: PC_DATA_PATH, mode: '100644', type: 'blob', sha: pcBlob.data.sha  },
      ],
    });

    // 5) 커밋 생성
    const { data: newCommit } = await octokit.git.createCommit({
      owner, repo,
      message: `복원(admin): 상품 ${productId} — soldout_log revived + pc_data in_stock=true`,
      tree:    newTree.sha,
      parents: [headSha],
    });

    // 6) 브랜치 ref 갱신
    await octokit.git.updateRef({
      owner, repo,
      ref:  `heads/${branch}`,
      sha:  newCommit.sha,
      force: false,
    });

    res.json({
      success:   true,
      productId,
      log,
      pcEntry:   pcEntry ? { id: pcEntry.id, in_stock: pcEntry.in_stock, name: pcEntry.name } : null,
      commitSha: newCommit.sha,
    });

  } catch (err) {
    const st  = err && (err.status || (err.response && err.response.status));
    const msg = err && err.message ? err.message : 'unknown_error';
    // 쓰기 권한 없음 (토큰 권한 부족 등)
    if (st === 403 || st === 401) {
      res.status(503).json({ error: 'write_unavailable', detail: msg }); return;
    }
    res.status(500).json({ error: msg });
  }
};
