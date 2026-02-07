import { describe, expect, it } from "vitest";
import { RobotsChecker } from "../../src/crawler/robots.js";

describe("RobotsChecker", () => {
	describe("Basic parsing", () => {
		it("should parse simple robots.txt", () => {
			const robotsTxt = `
User-agent: *
Disallow: /admin/
Disallow: /private/
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/")).toBe(true);
			expect(checker.isAllowed("https://example.com/admin/")).toBe(false);
			expect(checker.isAllowed("https://example.com/admin/users")).toBe(false);
			expect(checker.isAllowed("https://example.com/private/")).toBe(false);
			expect(checker.isAllowed("https://example.com/public/")).toBe(true);
		});

		it("should handle multiple user-agents", () => {
			const robotsTxt = `
User-agent: Googlebot
Disallow: /no-google/

User-agent: *
Disallow: /admin/
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/admin/")).toBe(false);
			expect(checker.isAllowed("https://example.com/no-google/")).toBe(true);

			const googlebotChecker = new RobotsChecker(robotsTxt, "Googlebot");
			expect(googlebotChecker.isAllowed("https://example.com/admin/")).toBe(true);
			expect(googlebotChecker.isAllowed("https://example.com/no-google/")).toBe(false);
		});

		it("should ignore comments and empty lines", () => {
			const robotsTxt = `
# This is a comment
User-agent: *

# Another comment
Disallow: /admin/

			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/admin/")).toBe(false);
			expect(checker.isAllowed("https://example.com/public/")).toBe(true);
		});
	});

	describe("Allow rules", () => {
		it("should prioritize Allow over Disallow", () => {
			const robotsTxt = `
User-agent: *
Disallow: /admin/
Allow: /admin/public/
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/admin/")).toBe(false);
			expect(checker.isAllowed("https://example.com/admin/private/")).toBe(false);
			expect(checker.isAllowed("https://example.com/admin/public/")).toBe(true);
			expect(checker.isAllowed("https://example.com/admin/public/page")).toBe(true);
		});

		it("should handle Allow without Disallow", () => {
			const robotsTxt = `
User-agent: *
Allow: /public/
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/")).toBe(true);
			expect(checker.isAllowed("https://example.com/public/")).toBe(true);
			expect(checker.isAllowed("https://example.com/private/")).toBe(true);
		});
	});

	describe("Edge cases", () => {
		it("should allow all when robots.txt is empty", () => {
			const checker = new RobotsChecker("");
			expect(checker.isAllowed("https://example.com/")).toBe(true);
			expect(checker.isAllowed("https://example.com/admin/")).toBe(true);
		});

		it("should disallow all with 'Disallow: /'", () => {
			const robotsTxt = `
User-agent: *
Disallow: /
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/")).toBe(false);
			expect(checker.isAllowed("https://example.com/any/path")).toBe(false);
		});

		it("should allow all with empty Disallow", () => {
			const robotsTxt = `
User-agent: *
Disallow:
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/")).toBe(true);
			expect(checker.isAllowed("https://example.com/admin/")).toBe(true);
		});

		it("should handle malformed lines gracefully", () => {
			const robotsTxt = `
User-agent: *
InvalidLine
Disallow /admin/
Disallow: /private/
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			// Should still parse the valid line
			expect(checker.isAllowed("https://example.com/private/")).toBe(false);
			expect(checker.isAllowed("https://example.com/public/")).toBe(true);
		});
	});

	describe("Path matching", () => {
		it("should match paths with query parameters", () => {
			const robotsTxt = `
User-agent: *
Disallow: /search
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/search?q=test")).toBe(false);
			expect(checker.isAllowed("https://example.com/searching")).toBe(false);
		});

		it("should match exact paths", () => {
			const robotsTxt = `
User-agent: *
Disallow: /admin
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/admin")).toBe(false);
			expect(checker.isAllowed("https://example.com/admin/")).toBe(false);
			expect(checker.isAllowed("https://example.com/admin/users")).toBe(false);
			expect(checker.isAllowed("https://example.com/administrator")).toBe(false);
		});

		it("should handle root path correctly", () => {
			const robotsTxt = `
User-agent: *
Disallow: /api/
Allow: /
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/")).toBe(true);
			expect(checker.isAllowed("https://example.com/docs/")).toBe(true);
			expect(checker.isAllowed("https://example.com/api/")).toBe(false);
		});
	});

	describe("Case sensitivity", () => {
		it("should handle User-agent case-insensitively", () => {
			const robotsTxt = `
User-Agent: GoogleBot
Disallow: /no-google/

User-agent: *
Disallow: /admin/
			`.trim();

			const checker = new RobotsChecker(robotsTxt, "googlebot");
			expect(checker.isAllowed("https://example.com/no-google/")).toBe(false);
			expect(checker.isAllowed("https://example.com/admin/")).toBe(true);
		});

		it("should handle directive keys case-insensitively", () => {
			const robotsTxt = `
user-agent: *
DISALLOW: /admin/
Allow: /admin/public/
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://example.com/admin/")).toBe(false);
			expect(checker.isAllowed("https://example.com/admin/public/")).toBe(true);
		});
	});

	describe("Real-world examples", () => {
		it("should handle GitHub-like robots.txt", () => {
			const robotsTxt = `
# GitHub robots.txt
User-agent: *
Disallow: /search
Disallow: /*/search
Disallow: /*/commits/*/
Allow: /
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://github.com/")).toBe(true);
			expect(checker.isAllowed("https://github.com/user/repo")).toBe(true);
			expect(checker.isAllowed("https://github.com/search")).toBe(false);
			expect(checker.isAllowed("https://github.com/user/search")).toBe(false);
		});

		it("should handle docs site robots.txt", () => {
			const robotsTxt = `
User-agent: *
Disallow: /admin/
Disallow: /api/internal/
Allow: /api/
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://docs.example.com/guide/")).toBe(true);
			expect(checker.isAllowed("https://docs.example.com/api/v1/")).toBe(true);
			expect(checker.isAllowed("https://docs.example.com/api/internal/")).toBe(false);
			expect(checker.isAllowed("https://docs.example.com/admin/")).toBe(false);
		});
	});
});
