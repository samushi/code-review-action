export type Stack = "laravel" | "wordpress" | "django" | "flask" | "react" | "next" | "vue" | "nuxt" | "generic";
export interface GitHubFileLite {
    filename: string;
    patch?: string;
}
export declare function detectStack(files: GitHubFileLite[]): Stack;
export declare function stackRole(stack: Stack): string;
