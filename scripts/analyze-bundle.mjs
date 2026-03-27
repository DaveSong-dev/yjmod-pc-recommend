/**
 * esbuild 메타파일로 번들 구성 요소별 바이트 합계 상위 출력
 * 실행: node scripts/analyze-bundle.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const metaPath = path.join(root, 'build', 'bundle-meta.json');
const entry = path.join(root, 'js', 'app.js');

const outdir = path.join(root, 'build');
fs.mkdirSync(outdir, { recursive: true });

try {
  execSync(
    `npx --yes esbuild "${entry}" --bundle --platform=browser --format=esm --splitting --metafile="${metaPath}" --outdir="${outdir}" --entry-names=[name] --chunk-names=chunk-[hash] --target=es2018`,
    { stdio: 'inherit', cwd: root, shell: true }
  );
} catch {
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const inputs = meta.inputs || {};
const rows = Object.entries(inputs)
  .map(([p, v]) => ({
    path: p.replace(/\\/g, '/'),
    bytes: v.bytes || 0,
  }))
  .filter((r) => !r.path.includes('node_modules'))
  .sort((a, b) => b.bytes - a.bytes);

console.log('\n=== 번들 입력 상위 (로컬 소스, node_modules 제외) ===\n');
let sum = 0;
for (const r of rows.slice(0, 25)) {
  sum += r.bytes;
  console.log(String(r.bytes).padStart(8), r.path);
}
console.log('\n※ 전체 메타는', metaPath);
console.log('※ 분석용 산출물: build/app.js, build/chunk-*.js (배포 전 export_single_html.py를 다시 실행하세요)\n');
