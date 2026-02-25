from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
from pathlib import Path


def to_data_url(js_text: str) -> str:
    encoded = base64.b64encode(js_text.encode("utf-8")).decode("ascii")
    return f"data:text/javascript;base64,{encoded}"


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
    ]

    html = index_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")

    html = html.replace(
        '<link rel="stylesheet" href="./css/style.css" />',
        f"<style>\n{css}\n</style>",
    )

    # 기존 모듈 스크립트 제거
    html = html.replace(
        '<script type="module" src="./js/app.js"></script>',
        "",
    )

    # app.js + 의존 모듈을 단일 번들로 생성 (module/importmap 호환성 이슈 회피)
    bundle_path = build_dir / "app.bundle.js"
    entry = root / "js" / "app.js"
    out_arg = f"--outfile={bundle_path}"
    # Windows: npm 전역 경로에서 esbuild 우선 사용 (npx PATH 이슈 회피)
    esbuild_cmd = None
    if sys.platform == "win32":
        for exe in ["esbuild.cmd", "esbuild"]:
            cand = Path(os.environ.get("APPDATA", "")) / "npm" / exe
            if cand.exists():
                esbuild_cmd = [str(cand), str(entry), "--bundle", "--platform=browser", "--format=iife", "--target=es2018", out_arg]
                break
    if not esbuild_cmd:
        esbuild_cmd = ["npx", "--yes", "esbuild", str(entry), "--bundle", "--platform=browser", "--format=iife", "--target=es2018", out_arg]
    env = os.environ.copy()
    if sys.platform == "win32":
        # esbuild.cmd가 node를 찾을 수 있도록 Node 경로 추가
        for node_dir in [
            os.environ.get("ProgramFiles", "C:\\Program Files") + "\\nodejs",
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "nodejs"),
        ]:
            if os.path.isdir(node_dir):
                env["PATH"] = node_dir + os.pathsep + env.get("PATH", "")
                break
    subprocess.run(esbuild_cmd, check=True, cwd=str(root), shell=(sys.platform == "win32"), env=env)
    bundle_js = bundle_path.read_text(encoding="utf-8")

    embedded_data = {}
    for filename in data_files:
        path = root / "data" / filename
        if path.exists():
            payload = json.loads(path.read_text(encoding="utf-8"))
            embedded_data[f"./data/{filename}"] = payload
            embedded_data[f"/data/{filename}"] = payload
            embedded_data[f"data/{filename}"] = payload

    embedded_json = json.dumps(embedded_data, ensure_ascii=False)
    embedded_b64 = base64.b64encode(embedded_json.encode("utf-8")).decode("ascii")

    bootstrap = f"""
  <script>
    window.__YJMOD_EMBEDDED_DATA_B64__ = "{embedded_b64}";
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
  <script>
{bundle_js}
  </script>
"""

    html = html.replace("</body>", f"{bootstrap}\n</body>")

    output = build_dir / "yjmod-single.html"
    output.write_text(html, encoding="utf-8")

    # Vercel 배포 기본 엔트리
    vercel_index = build_dir / "index.html"
    vercel_index.write_text(html, encoding="utf-8")

    # CMS 본문 붙여넣기용 코드 템플릿
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

    print(str(output))


if __name__ == "__main__":
    main()
