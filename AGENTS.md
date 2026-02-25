# AGENTS.md

## Cursor Cloud specific instructions

### Overview

YJMOD is a static SPA (Single Page Application) for Korean PC recommendations. No build step, no Node.js, no backend server. The frontend is pure HTML + Tailwind CSS (CDN) + Vanilla JS (ES Modules). Data lives in static JSON files under `data/`.

### Running the web application

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in the browser. Do **not** open `index.html` via `file://` — ES Module `fetch()` calls will fail with CORS errors.

### Crawlers (optional)

Python crawlers under `crawler/` refresh `data/pc_data.json` and `data/cafe_posts.json`. They are not required to run the website — the existing JSON data is sufficient. See `README.md` "크롤러 설정" section for details. The café crawler requires Naver API keys (`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`).

### Linting / Testing

This project has no automated test suite, linter configuration, or build system. Validation is done manually by serving the site and testing in-browser.

### Key caveats

- Tailwind CSS is loaded via CDN (`<script src="https://cdn.tailwindcss.com">`), so an internet connection is required for styles to render.
- The Pretendard font is also loaded from `cdn.jsdelivr.net`.
- Product thumbnail images reference external URLs on `youngjaecomputer.com` and will not render without internet access.
