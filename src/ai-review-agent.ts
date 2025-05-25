import { StateGraph, END } from "@langchain/langgraph";
import { Runnable } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

/* ----------------------  Zod Schemas  ---------------------- */

const ReviewFindingSchema = z.object({
    category: z.enum(["QUALITY", "SECURITY", "FUNCTIONALITY", "MAINTAINABILITY"]),
    severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
    file: z.string(),
    line: z.number().optional(),
    issue: z.string(),
    suggestion: z.string(),
});

const AIReviewSchema = z.object({
    overall_score: z.number().min(1).max(10),
    recommendation: z.enum(["POSITIVE", "NEGATIVE", "NEEDS_CHANGES"]),
    summary: z.string(),
    detailed_findings: z.array(ReviewFindingSchema),
    positive_aspects: z.array(z.string()),
    areas_for_improvement: z.array(z.string()),
});

/* ----------------------  Types  ---------------------- */

interface GitHubFile {
    filename: string;
    additions: number;
    deletions: number;
    patch?: string;
    status: string;
}

interface PullRequestData {
    title: string;
    body: string;
    number: number;
    files: GitHubFile[];
}

interface AgentState {
    owner: string;
    repo: string;
    pullNumber: number;
    prData?: PullRequestData;
    relevantFiles?: GitHubFile[];
    aiReview?: z.infer<typeof AIReviewSchema>;
    reviewComment?: string;
    error?: string;
    completed: boolean;
}

interface AgentConfig {
    githubToken: string;
    openaiApiKey: string;
    model?: string;
    maxTokens?: number;
    filePatterns?: string[];
    excludePatterns?: string[];
    postComment?: boolean;
}

/* ----------------------  Rezultati publik  ---------------------- */

export interface ReviewResult {
    success: boolean;
    recommendation?: string;
    score?: number;
    issuesCount?: number;
    summary?: string;
    error?: string;
}

/* ----------------------  Main Agent  ---------------------- */

export class GitHubAIReviewAgent {
    private octokit: Octokit;
    private llm: ChatOpenAI;
    /** Compiled graph që ekspozon .invoke/.stream etj. */
    private graph: Runnable<AgentState, Partial<AgentState>>;

    private filePatterns?: string[];
    private excludePatterns?: string[];
    private postComment: boolean;

    constructor(config: AgentConfig) {
        this.octokit = new Octokit({ auth: config.githubToken });
        this.llm = new ChatOpenAI({
            openAIApiKey: config.openaiApiKey,
            model: config.model || "gpt-4",
            maxTokens: config.maxTokens || 2000,
            temperature: 0.3,
        });

        this.filePatterns = config.filePatterns;
        this.excludePatterns = config.excludePatterns;
        this.postComment = config.postComment ?? true;

        this.graph = this.createGraph();
    }

    /* ----------------------  Graph builder  ---------------------- */

    private createGraph(): Runnable<AgentState, Partial<AgentState>> {
        const graph = new StateGraph<AgentState>({
            channels: {
                owner: null,
                repo: null,
                pullNumber: null,
                prData: null,
                relevantFiles: null,
                aiReview: null,
                reviewComment: null,
                error: null,
                completed: null,
            },
        });

        /* ----- Nodes ----- */
        graph.addNode("fetchPR", this.fetchPullRequestNode.bind(this));
        graph.addNode("filterFiles", this.filterRelevantFilesNode.bind(this));
        graph.addNode("analyzeCode", this.analyzeCodeNode.bind(this));
        graph.addNode("formatReview", this.formatReviewNode.bind(this));
        graph.addNode("postReview", this.postReviewNode.bind(this));
        graph.addNode("handleError", this.handleErrorNode.bind(this));

        /* ----- Edges ----- */
        graph.addEdge("__start__", "fetchPR" as any);

        graph.addConditionalEdges("fetchPR" as any, (s) =>
            s.error ? "handleError" : "filterFiles"
        );
        graph.addConditionalEdges("filterFiles" as any, (s) =>
            s.error ? "handleError" : "analyzeCode"
        );
        graph.addConditionalEdges("analyzeCode" as any, (s) =>
            s.error ? "handleError" : "formatReview"
        );
        graph.addConditionalEdges("formatReview" as any, (s) =>
            s.error ? "handleError" : "postReview"
        );

        graph.addConditionalEdges("postReview" as any, () => END);
        graph.addConditionalEdges("handleError" as any, () => END);

        return graph.compile();
    }

    /* ----------------------  Node implementations  ---------------------- */

    // 1️⃣  Fetch Pull Request data
    private async fetchPullRequestNode(
        state: AgentState
    ): Promise<Partial<AgentState>> {
        try {
            console.log(`🔍 Duke marrë PR #${state.pullNumber}...`);
            const { data: pr } = await this.octokit.pulls.get({
                owner: state.owner,
                repo: state.repo,
                pull_number: state.pullNumber,
            });
            const { data: files } = await this.octokit.pulls.listFiles({
                owner: state.owner,
                repo: state.repo,
                pull_number: state.pullNumber,
            });

            return {
                prData: {
                    title: pr.title,
                    body: pr.body || "",
                    number: pr.number,
                    files: files as GitHubFile[],
                },
            };
        } catch (err) {
            return {
                error: `Gabim gjatë marrjes së PR: ${
                    err instanceof Error ? err.message : "Unknown error"
                }`,
            };
        }
    }

    // 2️⃣  Filter relevant files (js/ts/tsx)
    private async filterRelevantFilesNode(
        state: AgentState
    ): Promise<Partial<AgentState>> {
        try {
            if (!state.prData) return { error: "PR data missing" };

            const relevantFiles = state.prData.files.filter(
                (f) =>
                    f.filename.match(/\.(js|jsx|ts|tsx)$/) &&
                    (f.status === "added" || f.status === "modified") &&
                    f.patch
            );

            console.log(`📁 ${relevantFiles.length} file relevante për review`);
            if (!relevantFiles.length)
                return {
                    error: "S’ka file NextJS/React për review",
                    completed: true,
                };

            return { relevantFiles };
        } catch (err) {
            return {
                error: `Gabim gjatë filtrimit: ${
                    err instanceof Error ? err.message : "Unknown error"
                }`,
            };
        }
    }

    // 3️⃣  Analyze code with LLM
    private async analyzeCodeNode(
        state: AgentState
    ): Promise<Partial<AgentState>> {
        try {
            if (!state.relevantFiles || !state.prData)
                return { error: "Missing data for analysis" };

            console.log("🤖 Duke analizuar kodin me AI...");
            const prompt = this.createAnalysisPrompt(
                state.relevantFiles,
                state.prData
            );
            const resp = await this.llm.invoke(prompt);

            const aiReviewText = resp.content as string;
            const aiReview = this.parseAIResponse(aiReviewText);
            return { aiReview };
        } catch (err) {
            return {
                error: `Gabim gjatë analizës: ${
                    err instanceof Error ? err.message : "Unknown error"
                }`,
            };
        }
    }

    // 4️⃣  Format review comment
    private async formatReviewNode(
        state: AgentState
    ): Promise<Partial<AgentState>> {
        try {
            if (!state.aiReview) return { error: "AI review data missing" };
            const reviewComment = this.formatReviewComment(state.aiReview);
            return { reviewComment };
        } catch (err) {
            return {
                error: `Gabim gjatë formatimit: ${
                    err instanceof Error ? err.message : "Unknown error"
                }`,
            };
        }
    }

    // 5️⃣  Post comment on GitHub
    private async postReviewNode(
        state: AgentState
    ): Promise<Partial<AgentState>> {
        try {
            if (!state.reviewComment) return { error: "Review comment missing" };

            if (this.postComment) {
                await this.octokit.pulls.createReview({
                    owner: state.owner,
                    repo: state.repo,
                    pull_number: state.pullNumber,
                    body: state.reviewComment,
                    event: "COMMENT",
                });
                console.log(`✅ Review u postua për PR #${state.pullNumber}`);
            } else {
                console.log("ℹ️  postComment=false – review nuk u postua");
            }

            return { completed: true };
        } catch (err) {
            return {
                error: `Gabim gjatë postimit: ${
                    err instanceof Error ? err.message : "Unknown error"
                }`,
            };
        }
    }

    // 6️⃣  Handle errors
    private async handleErrorNode(
        state: AgentState
    ): Promise<Partial<AgentState>> {
        console.error("❌ Agent error:", state.error);
        return { completed: true };
    }

    /* ----------------------  Helpers  ---------------------- */

    private createAnalysisPrompt(
        files: GitHubFile[],
        prData: PullRequestData
    ): string {
        const filesContent = files
            .map((f) => `\
FILE: ${f.filename}
ADDITIONS: ${f.additions}
DELETIONS: ${f.deletions}

<PATCH>
${f.patch}
</PATCH>`).join("\n---\n");

        return `\
You are a **senior React / Next.js code-reviewer** with deep knowledge of TypeScript, modern React patterns (hooks, server components, suspense) and secure web development practices.

Review the following pull-request and return a **single, minified JSON** that strictly matches the schema below.
Focus on code quality, potential bugs, security vulnerabilities, maintainability and performance.

━━━━━━━━━━━━━━━━━━━━━━━━  PR  ━━━━━━━━━━━━━━━━━━━━━━━━
• **Title:** ${prData.title}
• **Description:** ${prData.body}

━━━━━━━━━━━━━━━━━━━━━━  CHANGED FILES  ━━━━━━━━━━━━━━━
${filesContent}

━━━━━━━━━━━━━━━━━━━━━━  JSON SCHEMA  ━━━━━━━━━━━━━━━━
{
  "overall_score": 1-10,
  "recommendation": "POSITIVE" | "NEGATIVE" | "NEEDS_CHANGES",
  "summary": "single concise paragraph",
  "detailed_findings": [
    {
      "category": "QUALITY" | "SECURITY" | "FUNCTIONALITY" | "MAINTAINABILITY",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "file": "relative/path.tsx",
      "line": 123,
      "issue": "short explanation of the problem",
      "suggestion": "precise fix or best-practice snippet"
    }
  ],
  "positive_aspects": [ "bullet sentence …" ],
  "areas_for_improvement": [ "bullet sentence …" ]
}

Rules:
1. **Return only valid JSON** – no markdown, no comments.
2. Omit fields that are optional and empty.
3. Use absolute honesty; do not inflate the score.
4. If the patch is too large to analyse in full, sample the most critical hunks.

Output now:`;
    }

    private parseAIResponse(txt: string): z.infer<typeof AIReviewSchema> {
        try {
            const match = txt.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("JSON not found in LLM response");

            const parsed = JSON.parse(match[0]);
            return AIReviewSchema.parse(parsed);
        } catch {
            // Fallback if the model returns malformed or non-JSON output
            return {
                overall_score: 5,
                recommendation: "NEEDS_CHANGES",
                summary: "The AI did not return valid JSON. Manual review required.",
                detailed_findings: [],
                positive_aspects: [],
                areas_for_improvement: ["Manual review required"],
            };
        }
    }

    private formatReviewComment(r: z.infer<typeof AIReviewSchema>): string {
        const emoji =
            r.recommendation === "POSITIVE"
                ? "✅"
                : r.recommendation === "NEGATIVE"
                    ? "❌"
                    : "⚠️";

        return `## ${emoji} AI Code Review Report

### Rating: ${r.overall_score}/10  
**Recommendation:** ${r.recommendation}

### Summary
${r.summary}

${
            r.positive_aspects.length
                ? `### ✨ Positive Aspects\n${r.positive_aspects
                    .map((a) => `- ${a}`)
                    .join("\n")}`
                : ""
        }

${
            r.detailed_findings.length
                ? `### 🔍 Findings\n${r.detailed_findings
                    .map(
                        (f) => `**${f.severity}** – \`${f.file}\`${
                            f.line ? ` (Line ${f.line})` : ""
                        }\n- **${f.category}**\n- Issue: ${f.issue}\n- Suggestion: ${f.suggestion}`
                    )
                    .join("\n\n")}`
                : ""
        }

${r.areas_for_improvement.length ? `### 📈 Areas for Improvement\n ${r.areas_for_improvement.map((a) => `- ${a}`).join("\n")}` : ""}

---
*🤖 Generated by AI Code Review Agent*  
*⚠️ Please perform a manual review regardless of this recommendation*
`;
    }

    /* ----------------------  Public API  ---------------------- */

    async reviewPullRequest(
        owner: string,
        repo: string,
        pullNumber: number
    ): Promise<ReviewResult> {
        try {
            const initialState: AgentState = {
                owner,
                repo,
                pullNumber,
                completed: false,
            };

            console.log(`🚀 Duke filluar review për ${owner}/${repo} #${pullNumber}`);
            const finalState = await this.graph.invoke(initialState);

            if (finalState.error)
                return { success: false, error: finalState.error };

            const aiReview = finalState.aiReview;

            return {
                success: true,
                recommendation: aiReview?.recommendation,
                score: aiReview?.overall_score,
                issuesCount: aiReview?.detailed_findings.length ?? 0,
                summary: aiReview?.summary,
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : "Unknown error",
            };
        }
    }
}