# AI Code Review Agent · GitHub Action

![Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-AI%20Code%20Review%20Agent-blue?logo=github)
![CI](https://github.com/samushi/code-review-action/actions/workflows/test-action.yml/badge.svg)

**AI‑powered, auto‑stack code reviews for your pull requests.**
The action detects the tech stack (React/Next, Vue/Nuxt, Laravel/WordPress, Django/Flask, …), runs the LLM you choose, returns a structured JSON with score & findings and can fail CI when quality drops below your threshold.

---

## ✨ Features

| Icon | Feature                       | Description                                                                                   |
| :--: | :---------------------------- | :-------------------------------------------------------------------------------------------- |
|  🤖  | **Multi‑provider LLM**        | OpenAI GPT‑4/4o, Anthropic Claude 3, Google Gemini‑Pro or any Ollama/Llama endpoint.          |
|  🔍  | **Automatic stack detection** | Tailors the prompt to React/Next, Vue/Nuxt, Laravel/WordPress (PHP) or Django/Flask (Python). |
|  📊  | **Structured report**         | Numeric score, recommendation plus an array of findings in JSON.                              |
|  🎯  | **Fully configurable**        | Glob filters, min‑score gate, PR‑comment toggle.                                              |
|  🚀  | **Plug‑and‑play**             | Single `uses:` line – nothing to deploy.                                                      |

---

## Quick Start (OpenAI)

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: samushi/code-review-action@v1
        with:
          provider: openai                   # openai | anthropic | gemini | ollama
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          # optional
          min-score-threshold: 7
          fail-on-low-score: false
```

> **Secrets:** add the API key required by your provider (`OPENAI_API_KEY`,
> `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`). `GITHUB_TOKEN` is provided automatically.

---

## 📥 Inputs

| Name                  |         Required        | Default                       | Description                                                                            |
| --------------------- | :---------------------: | ----------------------------- | -------------------------------------------------------------------------------------- |
| `provider`            |            No           | `openai`                      | `openai` · `anthropic` · `gemini` · `ollama`                                           |
| `github-token`        |         **Yes**         | `${{ github.token }}`         | Token with `repo` scope to post PR comments.                                           |
| `openai-api-key`      |   if provider = openai  | –                             | OpenAI secret key.                                                                     |
| `anthropic-api-key`   | if provider = anthropic | –                             | Anthropic Claude secret.                                                               |
| `gemini-api-key`      |   if provider = gemini  | –                             | Google Generative AI key.                                                              |
| `ollama-base-url`     |   if provider = ollama  | `http://localhost:11434`      | Base URL of your Ollama server.                                                        |
| `ai-model`            |            No           | provider default              | e.g. `gpt-4o-mini`, `claude-3-opus-20240229`, `gemini-pro`, `llama3`.                  |
| `stack`               |            No           | `auto`                        | Force a stack (`react`, `vue`, `laravel`, `django`, …) or leave blank for auto‑detect. |
| `file-patterns`       |            No           | `**/*.{js,jsx,ts,tsx,php,py}` | Comma‑separated glob patterns to include.                                              |
| `exclude-patterns`    |            No           | `**/{node_modules,dist}/**`   | Patterns to ignore.                                                                    |
| `min-score-threshold` |            No           | `7`                           | Fail CI if score < threshold & `fail-on-low-score=true`.                               |
| `post-comment`        |            No           | `true`                        | Post the AI report as a PR comment.                                                    |
| `fail-on-low-score`   |            No           | `false`                       | Mark job failed when quality is low.                                                   |

---

## 📤 Outputs

| Output           | Description                                 |
| ---------------- | ------------------------------------------- |
| `review-score`   | Numeric score (1‑10).                       |
| `recommendation` | `POSITIVE`, `NEEDS_CHANGES`, or `NEGATIVE`. |
| `issues-found`   | Total findings reported by the AI.          |
| `review-summary` | One‑paragraph summary.                      |

---

## Provider Examples

### Laravel (OpenAI)

```yaml
with:
  provider: openai
  openai-api-key: ${{ secrets.OPENAI_API_KEY }}
  stack: laravel
  file-patterns: '**/*.php,**/*.blade.php'
```

### Django (Claude 3 Sonnet)

```yaml
with:
  provider: anthropic
  anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
  stack: django
  ai-model: claude-3-sonnet-20240229
```

### Vue (Gemini‑Pro)

```yaml
with:
  provider: gemini
  gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
  stack: vue
```

### Local Llama 3 via Ollama (auto‑detect)

```yaml
with:
  provider: ollama
  ollama-base-url: http://localhost:11434
  ai-model: llama3
  post-comment: false   # dry‑run
```

---

## Roadmap

* Inline annotations via GitHub Checks API
* SARIF export for security scanners
* ESLint / PHPStan / flake8 integration

> PRs are welcome – open an issue or contribute! Licensed under **MIT**.
