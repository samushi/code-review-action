import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHubAIReviewAgent, ReviewResult } from "./ai-review-agent";
import { parseFilePatterns } from "./utils";

/* ────────────────────────── Types ────────────────────────── */

interface ActionInputs {
    provider: "openai" | "anthropic" | "gemini" | "ollama";
    githubToken: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    geminiApiKey?: string;
    ollamaBaseUrl?: string;
    aiModel: string;
    filePatterns: string[];
    excludePatterns: string[];
    minScoreThreshold: number;
    postComment: boolean;
    failOnLowScore: boolean;
}

/* ────────────────────────── Helpers ─────────────────────── */

function getInputs(): ActionInputs {
    return {
        provider: (core.getInput("provider") || "openai") as ActionInputs["provider"],

        githubToken: core.getInput("github-token", { required: true }),
        openaiApiKey: core.getInput("openai-api-key"),
        anthropicApiKey: core.getInput("anthropic-api-key"),
        geminiApiKey: core.getInput("gemini-api-key"),
        ollamaBaseUrl: core.getInput("ollama-base-url") || undefined,

        aiModel: core.getInput("ai-model") || "gpt-4o-mini",
        filePatterns: parseFilePatterns(core.getInput("file-patterns")),
        excludePatterns: parseFilePatterns(core.getInput("exclude-patterns")),
        minScoreThreshold: parseInt(core.getInput("min-score-threshold")) || 7,
        postComment: core.getBooleanInput("post-comment"),
        failOnLowScore: core.getBooleanInput("fail-on-low-score"),
    };
}

/* ────────────────────────── Main  ───────────────────────── */

async function run(): Promise<void> {
    try {
        core.info("🚀 Starting AI Code Review Action");

        const inputs = getInputs();
        const context = github.context;

        if (!context.payload.pull_request) {
            core.setFailed("❌ This action can only be run on pull requests");
            return;
        }

        const { owner, repo } = context.repo;
        const pullNumber = context.payload.pull_request.number;

        core.info(`📋 Reviewing PR #${pullNumber} in ${owner}/${repo}`);

        /* Initialize agent */
        const agent = new GitHubAIReviewAgent({
            provider: inputs.provider,
            githubToken: inputs.githubToken,
            openaiApiKey: inputs.openaiApiKey,
            anthropicApiKey: inputs.anthropicApiKey,
            geminiApiKey: inputs.geminiApiKey,
            ollamaBaseUrl: inputs.ollamaBaseUrl,

            model: inputs.aiModel,
            filePatterns: inputs.filePatterns,
            excludePatterns: inputs.excludePatterns,
            postComment: inputs.postComment,
        });

        /* Run review */
        const result: ReviewResult = await agent.reviewPullRequest(
            owner,
            repo,
            pullNumber
        );

        if (!result.success) {
            core.setFailed(`❌ Review failed: ${result.error}`);
            return;
        }

        /* Outputs */
        core.setOutput("review-score", result.score?.toString() || "0");
        core.setOutput("recommendation", result.recommendation || "UNKNOWN");
        core.setOutput("issues-found", result.issuesCount?.toString() || "0");
        core.setOutput("review-summary", result.summary || "No summary available");

        core.info(`📊 Review Score: ${result.score}/10`);
        core.info(`📝 Recommendation: ${result.recommendation}`);
        core.info(`🔍 Issues Found: ${result.issuesCount || 0}`);

        /* CI gate */
        if (
            inputs.failOnLowScore &&
            result.score !== undefined &&
            result.score < inputs.minScoreThreshold
        ) {
            core.setFailed(
                `❌ Review score ${result.score} is below threshold ${inputs.minScoreThreshold}`
            );
            return;
        }

        core.info("✅ AI Code Review completed successfully");
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        core.setFailed(`❌ Action failed: ${msg}`);
    }
}

/* Run the action */
run();