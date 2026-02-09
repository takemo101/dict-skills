import { join } from "node:path";
import { cleanupTestDirectories } from "./test-utils.js";

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
