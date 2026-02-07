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
Allow: /
			`.trim();

			const checker = new RobotsChecker(robotsTxt);
			expect(checker.isAllowed("https://github.com/")).toBe(true);
			expect(checker.isAllowed("https://github.com/user/repo")).toBe(true);
			expect(checker.isAllowed("https://github.com/search")).toBe(false);
			// Note: Wildcard patterns like /*/search are not supported in this version
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

	describe("Wildcard and end-of-line patterns", () => {
		describe("Wildcard (*) patterns", () => {
			it("should match wildcard at the end", () => {
				const robotsTxt = `
User-agent: *
Disallow: /search*
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/search")).toBe(false);
				expect(checker.isAllowed("https://example.com/searching")).toBe(false);
				expect(checker.isAllowed("https://example.com/search?q=test")).toBe(false);
				expect(checker.isAllowed("https://example.com/other")).toBe(true);
			});

			it("should match wildcard in the middle", () => {
				const robotsTxt = `
User-agent: *
Allow: /search*results
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/searchresults")).toBe(true);
				expect(checker.isAllowed("https://example.com/search123results")).toBe(true);
				expect(checker.isAllowed("https://example.com/searchxyzresults")).toBe(true);
				expect(checker.isAllowed("https://example.com/search")).toBe(true); // default allow
			});

			it("should match multiple wildcards", () => {
				const robotsTxt = `
User-agent: *
Disallow: /*/admin/*
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/site/admin/panel")).toBe(false);
				expect(checker.isAllowed("https://example.com/app/admin/users")).toBe(false);
				expect(checker.isAllowed("https://example.com/admin/")).toBe(true);
			});

			it("should handle wildcard at the beginning", () => {
				const robotsTxt = `
User-agent: *
Disallow: */private
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/private")).toBe(false);
				expect(checker.isAllowed("https://example.com/docs/private")).toBe(false);
				expect(checker.isAllowed("https://example.com/public")).toBe(true);
			});
		});

		describe("End-of-line ($) patterns", () => {
			it("should match exact end with $", () => {
				const robotsTxt = `
User-agent: *
Disallow: /*.pdf$
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/doc.pdf")).toBe(false);
				expect(checker.isAllowed("https://example.com/folder/file.pdf")).toBe(false);
				expect(checker.isAllowed("https://example.com/doc.pdf?download=1")).toBe(true);
				expect(checker.isAllowed("https://example.com/doc.txt")).toBe(true);
			});

			it("should match exact path with $", () => {
				const robotsTxt = `
User-agent: *
Disallow: /admin$
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/admin")).toBe(false);
				expect(checker.isAllowed("https://example.com/admin/")).toBe(true);
				expect(checker.isAllowed("https://example.com/admin/users")).toBe(true);
				expect(checker.isAllowed("https://example.com/administrator")).toBe(true);
			});

			it("should handle end-of-line without wildcard", () => {
				const robotsTxt = `
User-agent: *
Disallow: /api/v1$
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/api/v1")).toBe(false);
				expect(checker.isAllowed("https://example.com/api/v1/")).toBe(true);
				expect(checker.isAllowed("https://example.com/api/v2")).toBe(true);
			});
		});

		describe("Combined patterns (* and $)", () => {
			it("should handle wildcard with end-of-line", () => {
				const robotsTxt = `
User-agent: *
Disallow: /*.json$
Disallow: /*.xml$
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/api/data.json")).toBe(false);
				expect(checker.isAllowed("https://example.com/sitemap.xml")).toBe(false);
				expect(checker.isAllowed("https://example.com/data.json?v=1")).toBe(true);
				expect(checker.isAllowed("https://example.com/page.html")).toBe(true);
			});

			it("should handle complex patterns", () => {
				const robotsTxt = `
User-agent: *
Disallow: /*/download/*.pdf$
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/docs/download/file.pdf")).toBe(false);
				expect(checker.isAllowed("https://example.com/docs/download/file.pdf?id=1")).toBe(true);
				expect(checker.isAllowed("https://example.com/docs/download/file.txt")).toBe(true);
			});
		});

		describe("Longest match with patterns", () => {
			it("should prioritize more specific patterns", () => {
				const robotsTxt = `
User-agent: *
Disallow: /docs*
Allow: /docs/public*
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/docs/private")).toBe(false);
				expect(checker.isAllowed("https://example.com/docs/public")).toBe(true);
				expect(checker.isAllowed("https://example.com/docs/public/page")).toBe(true);
			});

			it("should handle overlapping wildcard patterns", () => {
				const robotsTxt = `
User-agent: *
Disallow: /*
Allow: /*.html$
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/page.html")).toBe(true);
				expect(checker.isAllowed("https://example.com/page.html?id=1")).toBe(false);
				expect(checker.isAllowed("https://example.com/page.php")).toBe(false);
			});
		});

		describe("Special characters in patterns", () => {
			it("should handle regex special characters correctly", () => {
				const robotsTxt = `
User-agent: *
Disallow: /api/v1.0*
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/api/v1.0")).toBe(false);
				expect(checker.isAllowed("https://example.com/api/v1.0/users")).toBe(false);
				expect(checker.isAllowed("https://example.com/api/v1x0")).toBe(true);
			});

			it("should handle parentheses and brackets", () => {
				const robotsTxt = `
User-agent: *
Disallow: /path(test)*
				`.trim();

				const checker = new RobotsChecker(robotsTxt);
				expect(checker.isAllowed("https://example.com/path(test)123")).toBe(false);
				expect(checker.isAllowed("https://example.com/pathtest123")).toBe(true);
			});
		});
	});
});
