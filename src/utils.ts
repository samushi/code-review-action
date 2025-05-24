export function parseFilePatterns(input: string): string[] {
    return input
        .split(',')
        .map(pattern => pattern.trim())
        .filter(pattern => pattern.length > 0);
}

export function shouldAnalyzeFile(
    filename: string,
    includePatterns: string[],
    excludePatterns: string[]
): boolean {
    // Check if file matches exclude patterns
    for (const pattern of excludePatterns) {
        if (matchesPattern(filename, pattern)) {
            return false;
        }
    }

    // Check if file matches include patterns
    for (const pattern of includePatterns) {
        if (matchesPattern(filename, pattern)) {
            return true;
        }
    }

    return false;
}

function matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
}