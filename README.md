# WebCatalyst project page

English research website for **Catalyzing Interactive HTML Generation Capabilities via High-Fidelity Reinforcement Learning**.

The page uses a white academic layout, with author and text-only affiliation information followed immediately by the full explainer video. The complete main table includes all 20 models, release dates, parameter sizes, all 12 evaluation metrics, and the reported delta row. It groups benchmarks in a two-level header, highlights the base and trained models, and supports horizontal scrolling with a fixed model column on phones.

The site includes the manuscript, the 5:02 English explainer, the method and equations, the 20-model benchmark table, training-dynamics figures, experience and action-transition dumbbell charts, the complete iterative-refinement results, recorded comparisons, and a live playground with 50 prompts × 6 models.

## Preview locally

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. No npm dependencies, framework, server API, or build step is needed to browse the site.

## Deploy to GitHub Pages

1. In the repository's **Settings → Pages**, select **GitHub Actions** as the source.
2. Push the website and its public assets to `main`, or run **Deploy GitHub Pages** manually from the Actions tab.
3. The workflow validates the site, creates `dist/`, and deploys it. The expected project URL is `https://klozewang.github.io/webcatalyst-project-page/`.

The workflow packages an explicit allowlist: `index.html`, `.nojekyll`, and `assets/`. It does not publish `codex-workspace`, raw JSONL records, local scripts, or repository metadata. All URLs within the site are relative, so the project subpath works without a router configuration.

This checkout contains the finished local site and deployment configuration; adding the workflow does not itself publish uncommitted changes.

## Validate and build

```sh
python3 scripts/check_site.py
python3 scripts/build.py
```

The build and validation scripts use only Python's standard library. Validation checks page anchors, assets, all 300 generated HTML files, SHA-256 provenance, and GitHub's per-file size limit.

## Editable source

- `index.html`: paper content, author list, section structure and equations.
- `assets/css/site.css`: responsive visual design.
- `assets/js/site.js`: comparisons, live playground, table, tabs, video lifecycle and citation copy.
- `assets/data/demos.json`: public prompts and model output paths.
- `assets/data/provenance.json`: hashes of the original generated HTML.
- `assets/data/training-dynamics.json`: chart data. Mini Games step-0 values follow the paper's main table, as specified for the video; subsequent checkpoint values are unchanged.
- `scripts/prepare_assets.py`: optional re-export from the supplied local source material. Requires the existing video Python dependencies and `pypdfium2`.
- `assets/data/experience-analysis.json`: reported Figure 5 diagnostics and all Table 3 refinement scores from §4.4.2.
- `scripts/render_experience_analysis.py`: regenerate the experience dumbbell charts and refinement-round plot.
- `scripts/render_figures.py`: optional regeneration of the training-dynamics SVGs and social image, using Matplotlib and Pillow.

Ordinary publishing uses the exported assets already present in the repository. It does not require `codex-workspace` or the asset-generation dependencies.

## Content and media

Research claims, authors, equations, and Table 1 values come from the supplied manuscript. Figure 2 is a high-resolution crop of that manuscript. The analysis plots are redrawn in this site's visual style using the supplied experiment data. The citation is a manuscript `@misc` entry; no arXiv identifier or publication venue is invented.

The featured comparisons show original-speed browser recordings. Live outputs are copied from the supplied generated HTML without repairs; incomplete or failed outputs are preserved. The playground runs at a 1280×800 logical viewport and scales it to fit. Some artifacts use external libraries from CDNs. Full-screen links open the original artifact in a new tab. On phones, keyboard-driven games are best explored through the recordings or on a desktop.

Institutional logo sources are recorded in `assets/data/logo-sources.json`. The explainer uses locally composed original instrumental music. Website graphics and styling are original; the reference project page informed only the general academic content structure.

The deployment workflow follows [GitHub's official custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
