from __future__ import annotations

import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


APP_LOADER_RE = re.compile(
    r"\s*<script id=\"yjmod-app-loader\">.*?</script>",
    re.DOTALL,
)


def validate_data_files(root: Path, data_files: list[str]) -> None:
    """빌드 전 필수 데이터 파일 JSON 유효성 검사. 손상된 파일 발견 시 즉시 종료."""
    critical_files = ["pc_data.json"]  # 이 파일이 손상되면 빌드 의미 없음
    for filename in critical_files:
        path = root / "data" / filename
        if not path.exists():
            print(f"[WARN] {filename} 없음 — 건너뜀", file=sys.stderr)
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            product_count = len(data.get("products", []))
            print(f"[OK] {filename} 유효 ({product_count}개 상품)")
        except json.JSONDecodeError as e:
            print(f"[FATAL] {filename} JSON 손상: {e}", file=sys.stderr)
            print(f"[FATAL] 빌드를 중단합니다. 손상된 파일로 배포하지 않도록 합니다.", file=sys.stderr)
            sys.exit(1)


def build_embedded_map(root: Path, data_files: list[str], reco_files: list[str] | None) -> dict:
    embedded: dict = {}
    for filename in data_files:
        path = root / "data" / filename
        if path.exists():
            payload = json.loads(path.read_text(encoding="utf-8"))
            embedded[f"./data/{filename}"] = payload
            embedded[f"/data/{filename}"] = payload
            embedded[f"data/{filename}"] = payload
    if reco_files:
        for relpath in reco_files:
            path = root / "data" / relpath
            if path.exists():
                payload = json.loads(path.read_text(encoding="utf-8"))
                embedded[f"./data/{relpath}"] = payload
                embedded[f"/data/{relpath}"] = payload
                embedded[f"data/{relpath}"] = payload
    return embedded


def make_fetch_shim_b64(embedded_data: dict) -> str:
    embedded_json = json.dumps(embedded_data, ensure_ascii=False)
    return base64.b64encode(embedded_json.encode("utf-8")).decode("ascii")


def fetch_shim_script(b64: str) -> str:
    return f"""
  <script>
    window.__YJMOD_EMBEDDED_DATA_B64__ = "{b64}";
    (function () {{
      let dataMap = {{}};
      try {{
        const raw = window.__YJMOD_EMBEDDED_DATA_B64__ || "";
        const utf8 = decodeURIComponent(Array.prototype.map.call(atob(raw), function (c) {{
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }}).join(''));
        dataMap = JSON.parse(utf8) || {{}};
      }} catch (_) {{
        dataMap = {{}};
      }}

      const nativeFetch = window.fetch.bind(window);
      window.fetch = async function (input, init) {{
        const rawUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        const cleanUrl = rawUrl.split('?')[0];
        let pathname = '';
        try {{
          pathname = new URL(rawUrl, window.location.href).pathname || '';
        }} catch (_) {{
          pathname = '';
        }}

        const candidates = [
          cleanUrl,
          pathname,
          pathname ? '.' + pathname : '',
          pathname ? pathname.replace(/^\\//, '') : '',
          pathname ? './' + pathname.replace(/^\\//, '') : ''
        ].filter(Boolean);

        for (const key of candidates) {{
          if (Object.prototype.hasOwnProperty.call(dataMap, key)) {{
            return new Response(JSON.stringify(dataMap[key]), {{
              status: 200,
              headers: {{ 'Content-Type': 'application/json; charset=utf-8' }}
            }});
          }}
        }}

        return nativeFetch(input, init);
      }};
    }})();
  </script>
"""


def resolve_esbuild_cmd(entry: Path, outfile: Path) -> tuple[list[str], dict]:
    env = os.environ.copy()
    if sys.platform == "win32":
        for node_dir in [
            os.environ.get("ProgramFiles", "C:\\Program Files") + "\\nodejs",
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "nodejs"),
        ]:
            if node_dir and os.path.isdir(node_dir):
                env["PATH"] = node_dir + os.pathsep + env.get("PATH", "")
                break

    if sys.platform == "win32":
        for exe in ["esbuild.cmd", "esbuild"]:
            cand = Path(os.environ.get("APPDATA", "")) / "npm" / exe
            if cand.exists():
                return ([
                    str(cand),
                    str(entry),
                    "--bundle",
                    "--platform=browser",
                    "--format=iife",
                    "--target=es2018",
                    f"--outfile={outfile}",
                ], env)

    return ([
        "npx",
        "--yes",
        "esbuild",
        str(entry),
        "--bundle",
        "--platform=browser",
        "--format=iife",
        "--target=es2018",
        f"--outfile={outfile}",
    ], env)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    build_dir = root / "build"
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True, exist_ok=True)

    index_path = root / "index.html"
    css_path = root / "css" / "style.css"
    tailwind_path = root / "css" / "tailwind.generated.css"

    data_files = [
        "pc_data.json",
        "fps_reference.json",
        "cafe_posts.json",
        "recent_shipping.json",
        "soldout_log.json",
    ]
    reco_data_files = [
        "reco/manifest.json",
        "reco/v2.0.0/feed.json",
        "reco/v2.0.0/consult.json",
    ]

    # 빌드 전 필수 데이터 파일 유효성 검사
    validate_data_files(root, data_files)

    entry = root / "js" / "app.js"
    shell = sys.platform == "win32"
    with tempfile.TemporaryDirectory() as temp_dir:
        bundle_path = Path(temp_dir) / "app-iife-inline.js"
        cmd, env = resolve_esbuild_cmd(entry, bundle_path)
        subprocess.run(cmd, check=True, cwd=str(root), shell=shell, env=env)
        iife_js = bundle_path.read_text(encoding="utf-8")

    html = index_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")
    tailwind_css = tailwind_path.read_text(encoding="utf-8")
    combined_css = f"{tailwind_css}\n{css}"

    html = html.replace(
        '  <link rel="stylesheet" href="./css/tailwind.generated.css" />\n  <link rel="stylesheet" href="./css/style.css" />',
        f"<style>\n{combined_css}\n</style>",
    )
    html = APP_LOADER_RE.sub("", html)

    embedded_full = build_embedded_map(root, data_files, reco_data_files)
    b64_full = make_fetch_shim_b64(embedded_full)

    bootstrap_single = fetch_shim_script(b64_full) + f"\n  <script>\n{iife_js}\n  </script>\n"
    html_single = html.replace("</body>", f"{bootstrap_single}</body>")

    (build_dir / "yjmod-single.html").write_text(html_single, encoding="utf-8")

    embed_url = os.environ.get("YJMOD_EMBED_URL", "https://ai.youngjaecomputer.com")
    (build_dir / "cms-embed.html").write_text(
        f"""<div style="max-width:1200px;margin:0 auto;padding:0;">
  <iframe
    id="yjmod-iframe"
    src="{embed_url}"
    title="YJMOD 추천 PC"
    style="width:100%;height:1200px;border:0;display:block;background:#0a0a0f;"
    allowfullscreen>
  </iframe>
  <script>
    (function () {{
      const iframe = document.getElementById('yjmod-iframe');
      if (!iframe) return;
      window.addEventListener('message', function (event) {{
        const data = event && event.data;
        if (!data || data.type !== 'yjmod:height') return;
        const next = Number(data.height || 0);
        if (!Number.isFinite(next) || next < 600) return;
        iframe.style.height = Math.min(9000, Math.ceil(next + 8)) + 'px';
      }});
    }})();
  </script>
  <div style="padding:4px 0 0;font-size:12px;color:#777;line-height:1.2;">
    iframe가 보이지 않으면
    <a href="{embed_url}" target="_blank" rel="noopener noreferrer">새 창으로 열기</a>
  </div>
</div>
""",
        encoding="utf-8",
    )

    fav = root / "favicon.svg"
    if fav.is_file():
        shutil.copy2(fav, build_dir / "favicon.svg")

    print(str(build_dir / "yjmod-single.html"))


if __name__ == "__main__":
    main()
