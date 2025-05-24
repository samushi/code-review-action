# AI Code Review GitHub Action

Advanced AI-powered code review for NextJS and React applications using LangChain and LangGraph.

## Features

- 🤖 **AI-Powered Analysis**: Uses OpenAI GPT models for intelligent code review
- 🔍 **NextJS/React Focus**: Specialized analysis for modern React applications
- 📊 **Detailed Reports**: Comprehensive scoring and recommendations
- 🎯 **Configurable**: Flexible file patterns and thresholds
- 🚀 **Easy Integration**: Simple GitHub Action setup

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
      - name: AI Code Review
        uses: your-username/ai-code-review-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          ai-model: 'gpt-4-turbo-preview'
          min-score-threshold: 7
          fail-on-low-score: false
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `openai-api-key` | OpenAI API key | Yes | - |
| `ai-model` | OpenAI model to use | No | `gpt-4-turbo-preview` |
| `file-patterns` | File patterns to analyze | No | `**/*.js,**/*.jsx,**/*.ts,**/*.tsx` |
| `exclude-patterns` | File patterns to exclude | No | `**/node_modules/**,**/dist/**` |
| `min-score-threshold` | Minimum score for approval | No | `7` |
| `post-comment` | Post review comment on PR | No | `true` |
| `fail-on-low-score` | Fail if score below threshold | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `review-score` | Overall review score (1-10) |
| `recommendation` | AI recommendation |
| `issues-found` | Number of issues found |
| `review-summary` | Summary of the review |

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
- uses: your-username/ai-code-review-action@v1
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    ai-model: 'gpt-4'
    file-patterns: 'src/**/*.ts,src/**/*.tsx'
    exclude-patterns: '**/*.test.ts,**/*.spec.ts'
    min-score-threshold: 8
    fail-on-low-score: true
```