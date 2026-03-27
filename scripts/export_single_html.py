from __future__ import annotations

import base64
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


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
    (function() {{
      let dataMap = {{}};
      try {{
        const raw = window.__YJMOD_EMBEDDED_DATA_B64__ || "";
        const utf8 = decodeURIComponent(Array.prototype.map.call(atob(raw), function(c) {{
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }}).join(''));
        dataMap = JSON.parse(utf8) || {{}};
      }} catch (e) {{
        dataMap = {{}};
      }}
      const nativeFetch = window.fetch.bind(window);
      window.fetch = async function(input, init) {{
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
            const body = JSON.stringify(dataMap[key]);
            return new Response(body, {{
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


def resolve_esbuild_cmds(entry: Path, root: Path) -> tuple[list[str], list[str], dict]:
    """(iife_cmd, esm_cmd, env) — Windows에서 전역 esbuild 우선"""
    iife_out = root / "build" / "app-iife-inline.js"
    esm_outdir = root / "build"
    env = os.environ.copy()
    if sys.platform == "win32":
        for node_dir in [
            os.environ.get("ProgramFiles", "C:\\Program Files") + "\\nodejs",
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "nodejs"),
        ]:
            if os.path.isdir(node_dir):
                env["PATH"] = node_dir + os.pathsep + env.get("PATH", "")
                break

    iife_cmd: list[str] | None = None
    esm_cmd: list[str] | None = None
    if sys.platform == "win32":
        for exe in ["esbuild.cmd", "esbuild"]:
            cand = Path(os.environ.get("APPDATA", "")) / "npm" / exe
            if cand.exists():
                iife_cmd = [
                    str(cand),
                    str(entry),
                    "--bundle",
                    "--platform=browser",
                    "--format=iife",
                    "--target=es2018",
                    f"--outfile={iife_out}",
                ]
                esm_cmd = [
                    str(cand),
                    str(entry),
                    "--bundle",
                    "--platform=browser",
                    "--format=esm",
                    "--splitting",
                    "--target=es2018",
                    f"--outdir={esm_outdir}",
                    "--entry-names=[name]",
                    "--chunk-names=chunk-[hash]",
                ]
                break
    if not iife_cmd:
        iife_cmd = [
            "npx",
            "--yes",
            "esbuild",
            str(entry),
            "--bundle",
            "--platform=browser",
            "--format=iife",
            "--target=es2018",
            f"--outfile={iife_out}",
        ]
    if not esm_cmd:
        esm_cmd = [
            "npx",
            "--yes",
            "esbuild",
            str(entry),
            "--bundle",
            "--platform=browser",
            "--format=esm",
            "--splitting",
            "--target=es2018",
            f"--outdir={esm_outdir}",
            "--entry-names=[name]",
            "--chunk-names=chunk-[hash]",
        ]
    return iife_cmd, esm_cmd, env


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    build_dir = root / "build"
    build_dir.mkdir(parents=True, exist_ok=True)

    index_path = root / "index.html"
    css_path = root / "css" / "style.css"

    data_files = [
        "pc_data.json",
        "fps_reference.json",
        "cafe_posts.json",
        "recent_shipping.json",
    ]
    reco_data_files = [
        "reco/manifest.json",
        "reco/v2.0.0/feed.json",
        "reco/v2.0.0/consult.json",
    ]

    entry = root / "js" / "app.js"
    iife_cmd, esm_cmd, env = resolve_esbuild_cmds(entry, root)
    shell = sys.platform == "win32"

    # 이전 산출물 정리(이름 충돌 방지)
    legacy = build_dir / "app.bundle.js"
    if legacy.exists():
        legacy.unlink()
    for p in build_dir.glob("chunk-*.js"):
        try:
            p.unlink()
        except OSError:
            pass
    for name in ("app.js", "app-iife-inline.js"):
        p = build_dir / name
        if p.exists():
            p.unlink()

    subprocess.run(esm_cmd, check=True, cwd=str(root), shell=shell, env=env)
    subprocess.run(iife_cmd, check=True, cwd=str(root), shell=shell, env=env)

    iife_js = (build_dir / "app-iife-inline.js").read_text(encoding="utf-8")

    html = index_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")

    html = html.replace(
        '<link rel="stylesheet" href="./css/style.css" />',
        f"<style>\n{css}\n</style>",
    )
    html = html.replace(
        '<script type="module" src="./js/app.js"></script>',
        "",
    )

    embedded_full = build_embedded_map(root, data_files, reco_data_files)
    embedded_slim = build_embedded_map(root, data_files, None)

    b64_full = make_fetch_shim_b64(embedded_full)
    b64_slim = make_fetch_shim_b64(embedded_slim)

    bootstrap_vercel = (
        fetch_shim_script(b64_slim)
        + '\n  <script type="module" src="./app.js"></script>\n'
    )
    bootstrap_single = fetch_shim_script(b64_full) + f"\n  <script>\n{iife_js}\n  </script>\n"

    html_vercel = html.replace("</body>", f"{bootstrap_vercel}</body>")
    html_single = html.replace("</body>", f"{bootstrap_single}</body>")

    (build_dir / "index.html").write_text(html_vercel, encoding="utf-8")
    (build_dir / "yjmod-single.html").write_text(html_single, encoding="utf-8")

    embed_url = os.environ.get("YJMOD_EMBED_URL", "https://ai.youngjaecomputer.com")
    cms_embed = build_dir / "cms-embed.html"
    cms_embed.write_text(
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
      window.addEventListener('message', function (e) {{
        const data = e && e.data;
        if (!data || data.type !== 'yjmod:height') return;
        const next = Number(data.height || 0);
        if (!Number.isFinite(next) || next < 600) return;
        iframe.style.height = Math.min(9000, Math.ceil(next + 8)) + 'px';
      }});
    }})();
  </script>
  <div style="padding:4px 0 0;font-size:12px;color:#777;line-height:1.2;">
    iframe이 보이지 않으면
    <a href="{embed_url}" target="_blank" rel="noopener noreferrer">새 창으로 열기</a>
  </div>
</div>
""",
        encoding="utf-8",
    )

    def copy_tree(src: Path, dest: Path) -> None:
        if not src.is_dir():
            return
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest)

    copy_tree(root / "api", build_dir / "api")
    copy_tree(root / "admin", build_dir / "admin")

    reco_src = root / "data" / "reco"
    if reco_src.is_dir():
        reco_dest = build_dir / "data" / "reco"
        reco_dest.parent.mkdir(parents=True, exist_ok=True)
        copy_tree(reco_src, reco_dest)

    static_data = build_dir / "data"
    static_data.mkdir(parents=True, exist_ok=True)
    for filename in data_files:
        src = root / "data" / filename
        if src.is_file():
            shutil.copy2(src, static_data / filename)

    fav = root / "favicon.svg"
    if fav.is_file():
        shutil.copy2(fav, build_dir / "favicon.svg")

    pkg = root / "package.json"
    if pkg.is_file():
        shutil.copy2(pkg, build_dir / "package.json")
    lock = root / "package-lock.json"
    if lock.is_file():
        shutil.copy2(lock, build_dir / "package-lock.json")

    print(str(build_dir / "yjmod-single.html"))


if __name__ == "__main__":
    main()
