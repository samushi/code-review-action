interface AgentConfig {
    githubToken: string;
    openaiApiKey: string;
    model?: string;
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
