type LlmProvider = "openai" | "anthropic" | "gemini" | "ollama";
interface AgentConfig {
    githubToken: string;
    provider?: LlmProvider;
    model?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    geminiApiKey?: string;
    ollamaBaseUrl?: string;
    maxTokens?: number;
    filePatterns?: string[];
    excludePatterns?: string[];
    postComment?: boolean;
}
export interface ReviewResult {
    success: boolean;
    recommendation?: string;
    score?: number;
    issuesCount?: number;
    summary?: string;
    error?: string;
}
export declare class GitHubAIReviewAgent {
    private octokit;
    private llm;
    /** Compiled graph që ekspozon .invoke/.stream etj. */
    private graph;
    private filePatterns?;
    private excludePatterns?;
    private postComment;
    constructor(config: AgentConfig);
    private createGraph;
    /**
     * Check if a filename matches any of the given patterns (glob-like)
     */
    private matchesPatterns;
    /**
     * Check if file should be included based on patterns
     */
    private shouldIncludeFile;
    private fetchPullRequestNode;
    private filterRelevantFilesNode;
    private analyzeCodeNode;
    private formatReviewNode;
    private postReviewNode;
    private handleErrorNode;
    private createAnalysisPrompt;
    private parseAIResponse;
    private formatReviewComment;
    reviewPullRequest(owner: string, repo: string, pullNumber: number): Promise<ReviewResult>;
}
export {};
