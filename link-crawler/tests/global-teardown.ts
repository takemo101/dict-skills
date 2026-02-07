import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * Clean up test directories matching the given pattern in the specified directory
 */
function cleanupTestDirectories(
	baseDir: string,
	pattern: (entry: string) => boolean,
	relativePath: string,
) {
	try {
		const entries = readdirSync(baseDir);
		for (const entry of entries) {
			if (pattern(entry)) {
				const fullPath = join(baseDir, entry);
				rmSync(fullPath, { recursive: true, force: true });
				console.log(`✓ Cleaned up: ${relativePath}${entry}`);
			}
		}
	} catch (error) {
		console.warn(`Warning: Failed to clean up in ${relativePath}`, error);
	}
}

export default async function globalTeardown() {
	const linkCrawlerDir = join(import.meta.dirname, "..");

	// Clean up test-output-* directories in link-crawler root
	cleanupTestDirectories(linkCrawlerDir, (entry) => entry.startsWith("test-output-"), "");

	const testsUnitDir = join(linkCrawlerDir, "tests", "unit");

	// Clean up all .test-* directories in tests/unit
	// This includes:
	// - .test-index-manager-*
	// - .test-crawler*
	// - any other test temporary directories
	cleanupTestDirectories(testsUnitDir, (entry) => entry.startsWith(".test-"), "tests/unit/");

	// Clean up .test-output-* directories in tests/integration
	const integrationDir = join(linkCrawlerDir, "tests", "integration");
	cleanupTestDirectories(
		integrationDir,
		(entry) => entry.startsWith(".test-output-"),
		"tests/integration/",
	);
}
