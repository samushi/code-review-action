# AI Code Review GitHub Action

![Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-AI%20Code%20Review%20Agent-blue?logo=github)
![CI](https://github.com/samushi/react-code-review-action/actions/workflows/test-action.yml/badge.svg)

Automated, GPT-powered code-reviews for **React** & **Next.js** pull-requests.  
The action scores the PR, posts a formatted Markdown report and can block the pipeline when quality drops below your threshold.



## ✨ Features

| Icon | Feature | Description |
|:--:|:--|:--|
| 🤖 | **AI-powered analysis** | Uses GPT-4 / GPT-4o (configurable) via LangChain + LangGraph |
| 🔍 | **React / Next.js focus** | Inspects *.js(x) / *.ts(x) patches and highlights common pitfalls |
| 📊 | **Structured report** | Score (1-10), recommendation & JSON list of findings |
| 🎯 | **Fully configurable** | Glob patterns, severity threshold, PR-comment toggle |
| 🚀 | **Plug-and-play** | One `uses:` line in your workflow |

## Usage

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]
    
jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: samushi/react-code-review-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}

          # optional
          ai-model: gpt-4o-mini
          min-score-threshold: 7
          fail-on-low-score: false
```

Note: add OPENAI_API_KEY in repository Secrets.
The default GITHUB_TOKEN injektohet automatikisht nga GitHub.

### 📥 Inputs

| Name | Type | Required | Default | Description |
|------|------|:-------:|---------|-------------|
| `github-token` | string | **Yes** | `${{ github.token }}` | Token with **`repo`** scope (provided automatically in GitHub workflows). |
| `openai-api-key` | string | **Yes** | – | Your OpenAI secret key. |
| `ai-model` | string | No | `gpt-4o-mini` | Any chat-completion model ID (`gpt-4o-mini`, `gpt-4-turbo-preview`, etc.). |
| `file-patterns` | string (CSV) | No | `**/*.{js,jsx,ts,tsx}` | Comma-separated glob patterns to include. |
| `exclude-patterns` | string (CSV) | No | `**/{node_modules,dist}/**` | Comma-separated glob patterns to ignore. |
| `min-score-threshold` | number | No | `7` | Minimum score required to pass if `fail-on-low-score` is `true`. |
| `post-comment` | boolean (`true\|false`) | No | `true` | Post the AI report as a PR comment. |
| `fail-on-low-score` | boolean (`true\|false`) | No | `false` | Fail the workflow when `review-score` < `min-score-threshold`. |

---

### 📤 Outputs

| Output | Type | Description |
|--------|------|-------------|
| `review-score` | number | Overall numeric score (1–10). |
| `recommendation` | string | AI verdict: `POSITIVE`, `NEEDS_CHANGES`, or `NEGATIVE`. |
| `issues-found` | number | Count of issues detected by the AI. |
| `review-summary` | string | One-paragraph natural-language summary of the review. |

## Setup

1. **Create Secrets**: Add `OPENAI_API_KEY` to your repository secrets
2. **Add Workflow**: Create `.github/workflows/ai-review.yml`
3. **Configure**: Customize inputs as needed

## Example Workflows

### Basic Usage
```yaml
- uses: your-username/ai-code-review-action@v1
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### Advanced Configuration

```yaml
- uses: samushi/react-code-review-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    file-patterns: 'src/**/*.{ts,tsx}'
    exclude-patterns: '**/*.spec.tsx'
    ai-model: gpt-4-turbo-preview
    min-score-threshold: 8
    fail-on-low-score: true
```

### Dry Run

```yaml
- uses: samushi/react-code-review-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    post-comment: false
```
