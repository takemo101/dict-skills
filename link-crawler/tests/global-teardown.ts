import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export default async function globalTeardown() {
	const linkCrawlerDir = join(import.meta.dirname, "..");

	// Clean up test-output-* directories
	try {
		const entries = readdirSync(linkCrawlerDir);
		for (const entry of entries) {
			if (entry.startsWith("test-output-")) {
				const fullPath = join(linkCrawlerDir, entry);
				rmSync(fullPath, { recursive: true, force: true });
				console.log(`✓ Cleaned up: ${entry}`);
			}
		}
	} catch (error) {
		console.warn("Warning: Failed to clean up test-output-* directories", error);
	}

	// Clean up .test-index-manager-* directories
	try {
		const testsUnitDir = join(linkCrawlerDir, "tests", "unit");
		const entries = readdirSync(testsUnitDir);
		for (const entry of entries) {
			if (entry.startsWith(".test-index-manager-")) {
				const fullPath = join(testsUnitDir, entry);
				rmSync(fullPath, { recursive: true, force: true });
				console.log(`✓ Cleaned up: tests/unit/${entry}`);
			}
		}
	} catch (error) {
		console.warn("Warning: Failed to clean up .test-index-manager-* directories", error);
	}

	// Clean up .test-output-* directories in tests/integration
	try {
		const integrationDir = join(linkCrawlerDir, "tests", "integration");
		const entries = readdirSync(integrationDir);
		for (const entry of entries) {
			if (entry.startsWith(".test-output-")) {
				const fullPath = join(integrationDir, entry);
				rmSync(fullPath, { recursive: true, force: true });
				console.log(`✓ Cleaned up: tests/integration/${entry}`);
			}
		}
	} catch (error) {
		console.warn("Warning: Failed to clean up integration test output directories", error);
	}
}
