import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHubAIReviewAgent, ReviewResult } from "./ai-review-agent";
import { parseFilePatterns } from "./utils";

interface ActionInputs {
    githubToken: string;
    openaiApiKey: string;
    aiModel: string;
    filePatterns: string[];
    excludePatterns: string[];
    minScoreThreshold: number;
    postComment: boolean;
    failOnLowScore: boolean;
}

function getInputs(): ActionInputs {
    return {
        githubToken: core.getInput("github-token", { required: true }),
        openaiApiKey: core.getInput("openai-api-key", { required: true }),
        aiModel: core.getInput("ai-model") || "gpt-4-turbo-preview",
        filePatterns: parseFilePatterns(core.getInput("file-patterns")),
        excludePatterns: parseFilePatterns(core.getInput("exclude-patterns")),
        minScoreThreshold: parseInt(core.getInput("min-score-threshold")) || 7,
        postComment: core.getBooleanInput("post-comment"),
        failOnLowScore: core.getBooleanInput("fail-on-low-score"),
    };
}

async function run(): Promise<void> {
    try {
        core.info("🚀 Starting AI Code Review Action");

        const inputs = getInputs();
        const context = github.context;

        // Validate PR context
        if (!context.payload.pull_request) {
            core.setFailed("❌ This action can only be run on pull requests");
            return;
        }

        const { owner, repo } = context.repo;
        const pullNumber = context.payload.pull_request.number;

        core.info(`📋 Reviewing PR #${pullNumber} in ${owner}/${repo}`);

        // Initialize AI agent
        const agent = new GitHubAIReviewAgent({
            githubToken: inputs.githubToken,
            openaiApiKey: inputs.openaiApiKey,
            model: inputs.aiModel,
            filePatterns: inputs.filePatterns,
            excludePatterns: inputs.excludePatterns,
            postComment: inputs.postComment,
        });

        // Run review
        const result: ReviewResult = await agent.reviewPullRequest(
            owner,
            repo,
            pullNumber
        );

        if (!result.success) {
            core.setFailed(`❌ Review failed: ${result.error}`);
            return;
        }

        // Set outputs
        core.setOutput("review-score", result.score?.toString() || "0");
        core.setOutput("recommendation", result.recommendation || "UNKNOWN");
        core.setOutput("issues-found", result.issuesCount?.toString() || "0");
        core.setOutput("review-summary", result.summary || "No summary available");

        // Log results
        core.info(`📊 Review Score: ${result.score}/10`);
        core.info(`📝 Recommendation: ${result.recommendation}`);
        core.info(`🔍 Issues Found: ${result.issuesCount || 0}`);

        // Check if should fail based on score
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
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        core.setFailed(`❌ Action failed: ${errorMessage}`);
    }
}

// Execute the action
run();