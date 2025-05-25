export type Stack =
    | "laravel"
    | "wordpress"
    | "django"
    | "flask"
    | "react"
    | "next"
    | "vue"
    | "nuxt"
    | "generic";

export interface GitHubFileLite {
    filename: string;
    patch?: string;
}

export function detectStack(files: GitHubFileLite[]): Stack {
    const names = files.map(f => f.filename.toLowerCase());

    // ── PHP
    if (names.includes("composer.json")) {
        const laravel = files.find(
            f => f.filename.endsWith("composer.json") &&
                /laravel\/framework/.test(f.patch ?? "")
        );
        if (laravel) return "laravel";
    }
    if (names.some(n => n.startsWith("wp-content/"))) return "wordpress";

    // ── Python
    if (names.some(n => n.endsWith("manage.py") || n.endsWith("settings.py")))
        return "django";
    if (files.some(f => /\.py$/.test(f.filename) && /(from|import)\s+flask/.test(f.patch ?? "")))
        return "flask";

    // ── JS / TS
    const pkg = files.find(f => f.filename === "package.json");
    if (pkg && /\"nuxt\"/.test(pkg.patch ?? ""))  return "nuxt";
    if (pkg && /\"next\"/.test(pkg.patch ?? ""))  return "next";
    if (names.some(n => n.endsWith(".vue")))      return "vue";
    if (pkg && /\"react\"/.test(pkg.patch ?? "")) return "react";

    return "generic";
}

export function stackRole(stack: Stack): string {
    const ROLE_PROMPT: Record<Stack, string> = {
        laravel:
            "senior PHP/Laravel code-reviewer familiar with Eloquent, service-container, PSR-12 and OWASP practices",
        wordpress:
            "senior PHP developer specialized in WordPress plugin & theme security, CSRF and XSS prevention",
        django:
            "senior Python/Django reviewer with deep knowledge of PEP-8, type-hints, Django ORM, and secure coding",
        flask:
            "senior Python developer specialized in Flask/FastAPI, PEP-8 and secure REST patterns",
        react:
            "senior React / Next.js reviewer with modern React patterns, hooks, server components and TypeScript",
        next:
            "senior Next.js developer focused on App Router, server actions and React best practices",
        vue: "experienced Vue/Nuxt developer with Vue 3 composition API and security best practices",
        nuxt:
            "experienced Nuxt developer versed in Nuxt 3, Nitro server and Vue 3 best practices",
        generic:
            "experienced full-stack engineer with an eye for clean code, security and maintainability"
    };

    return ROLE_PROMPT[stack];
}

