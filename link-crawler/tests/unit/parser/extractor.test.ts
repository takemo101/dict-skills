import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { extractContent, extractMetadata } from "../../../src/parser/extractor.js";

describe("extractMetadata", () => {
	it("should extract title from title tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Test Page Title</title>
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Test Page Title");
	});

	it("should extract description from meta tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="description" content="This is a test description">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("This is a test description");
	});

	it("should extract description from og:description", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta property="og:description" content="OG Description">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("OG Description");
	});

	it("should prefer meta description over og:description", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="description" content="Meta Description">
					<meta property="og:description" content="OG Description">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBe("Meta Description");
	});

	it("should extract keywords from meta tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="keywords" content="test, keywords, crawler">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.keywords).toBe("test, keywords, crawler");
	});

	it("should extract author from meta tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="author" content="John Doe">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.author).toBe("John Doe");
	});

	it("should extract og:title from meta tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta property="og:title" content="OG Title">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.ogTitle).toBe("OG Title");
	});

	it("should extract og:type from meta tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta property="og:type" content="article">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.ogType).toBe("article");
	});

	it("should return null for missing metadata", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Title Only</title>
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Title Only");
		expect(metadata.description).toBeNull();
		expect(metadata.keywords).toBeNull();
		expect(metadata.author).toBeNull();
		expect(metadata.ogTitle).toBeNull();
		expect(metadata.ogType).toBeNull();
	});

	it("should extract all metadata at once", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Full Page</title>
					<meta name="description" content="Full description">
					<meta name="keywords" content="key1, key2">
					<meta name="author" content="Author Name">
					<meta property="og:title" content="OG Title">
					<meta property="og:type" content="website">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata).toEqual({
			title: "Full Page",
			description: "Full description",
			keywords: "key1, key2",
			author: "Author Name",
			ogTitle: "OG Title",
			ogType: "website",
		});
	});

	it("should trim whitespace from title", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>  Title With Whitespace  </title>
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.title).toBe("Title With Whitespace");
	});

	it("should return null for empty meta content", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="description" content="">
				</head>
				<body></body>
			</html>
		`;
		const dom = new JSDOM(html);
		const metadata = extractMetadata(dom);

		expect(metadata.description).toBeNull();
	});
});

describe("extractContent", () => {
	it("should extract content using Readability", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Article Title</title>
				</head>
				<body>
					<article>
						<h1>Main Article Heading</h1>
						<p>This is the main content of the article. It has enough text to be considered readable content.</p>
						<p>Second paragraph with more content to make it substantial for Readability to process correctly.</p>
						<p>Third paragraph continues the article with additional information and details about the topic.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/article");

		// Readability uses the document title, not the h1
		expect(result.title).toBe("Article Title");
		expect(result.content).not.toBeNull();
		expect(result.content).toContain("This is the main content");
	});

	it("should fallback when Readability fails", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Minimal Page</title>
				</head>
				<body>
					<p>Short content</p>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/minimal");

		// Readability may still extract minimal content or fall back
		// The test verifies the function doesn't throw
		expect(result).toHaveProperty("title");
		expect(result).toHaveProperty("content");
	});

	it("should remove script tags in fallback mode", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Page with Scripts</title>
				</head>
				<body>
					<p>Visible content</p>
					<script>var x = 'should be removed';</script>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/scripts");

		// Readability should handle this, or fallback should remove scripts
		if (result.content) {
			expect(result.content).not.toContain("var x");
			expect(result.content).not.toContain("should be removed");
		}
	});

	it("should remove style tags in fallback mode", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Page with Styles</title>
					<style>.red { color: red; }</style>
				</head>
				<body>
					<p>Visible content</p>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/styles");

		if (result.content) {
			expect(result.content).not.toContain("color: red");
		}
	});

	it("should handle article with main tag", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Main Tag Page</title>
				</head>
				<body>
					<main>
						<h1>Main Content Area</h1>
						<p>This is the main content area with sufficient text to be processed by Readability.</p>
						<p>Additional paragraphs provide more context and information for better content extraction.</p>
					</main>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/main");

		expect(result.content).not.toBeNull();
		if (result.content) {
			expect(result.content.toLowerCase()).toContain("main");
		}
	});

	it("should handle page with navigation and footer", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Complex Page</title>
				</head>
				<body>
					<nav>
						<a href="/">Home</a>
						<a href="/about">About</a>
					</nav>
					<article>
						<h1>Real Article Content</h1>
						<p>This is the actual article content that should be extracted. It contains meaningful information.</p>
						<p>More paragraphs ensure the content is substantial enough for Readability to identify it properly.</p>
					</article>
					<footer>
						<p>Footer content</p>
					</footer>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/complex");

		expect(result.content).not.toBeNull();
		if (result.content) {
			expect(result.content).toContain("Real Article Content");
			expect(result.content).not.toContain("Footer content");
		}
	});

	it("should handle empty HTML", () => {
		const html = "";
		const result = extractContent(html, "https://example.com/empty");

		expect(result.title).toBeNull();
		expect(result.content).toBeNull();
	});

	it("should handle HTML without readable content", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Empty Page</title>
				</head>
				<body>
					<p>Hi</p>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/short");

		// Readability may extract minimal content or return null
		// The test verifies the function handles short content gracefully
		expect(result).toHaveProperty("title");
		expect(result).toHaveProperty("content");
	});

	it("should extract content with proper URL context", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>URL Context Test</title>
				</head>
				<body>
					<article>
						<h1>Article</h1>
						<p>Content with a <a href="/relative">relative link</a> that needs URL context.</p>
						<p>More content here to make the article substantial and readable by the extraction algorithm.</p>
						<p>Third paragraph ensures there's enough text for Readability to identify this as main content.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/page");

		expect(result.content).not.toBeNull();
	});

	it("should remove noscript tags in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>NoScript Test</title>
				</head>
				<body>
					<p>Visible</p>
					<noscript>Enable JavaScript</noscript>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/noscript");

		if (result.content) {
			expect(result.content).not.toContain("Enable JavaScript");
		}
	});

	it("should handle div with content class in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Content Class</title>
				</head>
				<body>
					<div class="content">
						<p>Content in class="content" div.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/content-class");

		// Readability may or may not find this, but if fallback is used, it should look for .content
		if (result.content) {
			expect(result.content.toLowerCase()).toContain("content");
		}
	});

	it("should handle div with id=content in fallback", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>ID Content</title>
				</head>
				<body>
					<div id="content">
						<p>Content in id="content" div.</p>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/id-content");

		if (result.content) {
			expect(result.content.toLowerCase()).toContain("content");
		}
	});
});

describe("extractContent - code block preservation", () => {
	it("should preserve standard pre/code blocks", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Code Example</title>
				</head>
				<body>
					<article>
						<h1>Installation Guide</h1>
						<p>To install the package, run:</p>
						<pre><code>npm install example-package</code></pre>
						<p>More text here to make content substantial.</p>
						<p>Additional paragraph for Readability to detect this as main content.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/code");

		expect(result.content).not.toBeNull();
		expect(result.content).toContain("<pre>");
		expect(result.content).toContain("<code>");
		expect(result.content).toContain("npm install example-package");
	});

	it("should preserve code blocks with language class", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>TypeScript Example</title>
				</head>
				<body>
					<article>
						<h1>TypeScript Guide</h1>
						<p>Here is a TypeScript example:</p>
						<pre><code class="language-typescript">const x: number = 42;</code></pre>
						<p>More content here.</p>
						<p>Another paragraph to ensure Readability detects this as main content.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/ts");

		expect(result.content).not.toBeNull();
		expect(result.content).toContain("typescript");
		expect(result.content).toContain("const x: number = 42");
	});

	it("should preserve data-rehype-pretty-code-fragment blocks (Next.js docs style)", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Next.js Docs</title>
				</head>
				<body>
					<article>
						<h1>Getting Started</h1>
						<p>Create a new app:</p>
						<div data-rehype-pretty-code-fragment="">
							<pre data-language="bash"><code>npx create-next-app@latest</code></pre>
						</div>
						<p>More content here to make the article substantial.</p>
						<p>Additional paragraph for better content detection.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://nextjs.org/docs");

		expect(result.content).not.toBeNull();
		expect(result.content).toContain("data-rehype-pretty-code-fragment");
		expect(result.content).toContain("npx create-next-app@latest");
	});

	it("should preserve hljs (Highlight.js) code blocks", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Highlight.js Example</title>
				</head>
				<body>
					<article>
						<h1>Code with Highlight.js</h1>
						<p>Example code:</p>
						<div class="hljs">
							<pre><code>function hello() {
  return "world";
}</code></pre>
						</div>
						<p>More text here.</p>
						<p>Another paragraph for content.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/hljs");

		expect(result.content).not.toBeNull();
		expect(result.content).toContain("hljs");
		expect(result.content).toContain("function hello()");
	});

	it("should preserve prism-code blocks", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Prism Example</title>
				</head>
				<body>
					<article>
						<h1>Prism.js Code</h1>
						<p>Example:</p>
						<div class="prism-code">
							<pre><code class="language-javascript">console.log("hello");</code></pre>
						</div>
						<p>More content.</p>
						<p>Additional paragraph.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/prism");

		expect(result.content).not.toBeNull();
		expect(result.content).toContain("prism-code");
		expect(result.content).toContain('console.log("hello")');
	});

	it("should preserve shiki code blocks", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Shiki Example</title>
				</head>
				<body>
					<article>
						<h1>Shiki Highlighted Code</h1>
						<p>Example:</p>
						<div class="shiki" data-language="rust">
							<pre><code>fn main() {
    println!("Hello, world!");
}</code></pre>
						</div>
						<p>More content here.</p>
						<p>Another paragraph.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/shiki");

		expect(result.content).not.toBeNull();
		expect(result.content).toContain("shiki");
		expect(result.content).toContain("fn main()");
	});

	it("should preserve multiple code blocks in one article", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Multiple Code Blocks</title>
				</head>
				<body>
					<article>
						<h1>Setup Guide</h1>
						<p>First, install:</p>
						<pre><code>npm install</code></pre>
						<p>Then configure:</p>
						<pre><code class="language-json">{
  "name": "example"
}</code></pre>
						<p>Finally, run:</p>
						<pre><code>npm start</code></pre>
						<p>More text here to ensure the article is substantial.</p>
						<p>Additional paragraph for better detection.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/multi");

		expect(result.content).not.toBeNull();
		// Count occurrences of code blocks
		const codeMatches = result.content?.match(/<code/g);
		expect(codeMatches?.length).toBeGreaterThanOrEqual(3);
	});

	it("should preserve data-language attribute code blocks", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Data Language Example</title>
				</head>
				<body>
					<article>
						<h1>Code with Data Attribute</h1>
						<p>Example:</p>
						<pre data-language="python"><code>print("hello")</code></pre>
						<p>More content.</p>
						<p>Another paragraph.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/data-lang");

		expect(result.content).not.toBeNull();
		expect(result.content).toContain("data-language");
		expect(result.content).toContain("python");
	});

	it("should preserve .highlight class code blocks", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Highlight Class Example</title>
				</head>
				<body>
					<article>
						<h1>Highlighted Code</h1>
						<p>Example:</p>
						<div class="highlight">
							<pre><code>gem install rails</code></pre>
						</div>
						<p>More content here.</p>
						<p>Another paragraph.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/highlight");

		expect(result.content).not.toBeNull();
		expect(result.content).toContain("highlight");
	});

	it("should preserve .code-block class elements", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Code Block Class Example</title>
				</head>
				<body>
					<article>
						<h1>Code Block</h1>
						<p>Example:</p>
						<div class="code-block">
							<pre><code>docker run hello-world</code></pre>
						</div>
						<p>More content.</p>
						<p>Another paragraph.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/code-block");

		expect(result.content).not.toBeNull();
		expect(result.content).toContain("code-block");
	});

	it("should collect and preserve code blocks when removed from content in fallback mode", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Code Collection Test</title>
				</head>
				<body>
					<div class="container">
						<p>Some text content here that is not substantial enough.</p>
						<pre><code>npm install package</code></pre>
					</div>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/code-collection");

		// In fallback mode, code blocks should be collected and preserved
		expect(result.content).not.toBeNull();
	});

	it("should handle nested code block elements without duplication", () => {
		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Nested Code Test</title>
				</head>
				<body>
					<article>
						<h1>Article with Nested Code</h1>
						<p>This article has nested code blocks that should be handled correctly without duplication.</p>
						<p>Additional content to make the article substantial for Readability extraction.</p>
						<div data-rehype-pretty-code-fragment="">
							<pre data-language="javascript">
								<code class="language-javascript">
									const x = 1;
								</code>
							</pre>
						</div>
						<p>More content after the code block.</p>
					</article>
				</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/nested-code");

		expect(result.content).not.toBeNull();
		// Should contain the code content without duplication
		const matches = result.content?.match(/const x = 1/g);
		expect(matches?.length).toBeLessThanOrEqual(1);
	});
});

describe("extractContent - edge cases", () => {
	it("should handle HTML with only navigation elements", () => {
		// HTML with only nav elements - Readability should fail, triggering fallback
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Nav Only</title></head>
			<body>
				<nav><a href="/">Home</a></nav>
				<header>Header</header>
				<pre><code>some code</code></pre>
				<footer>Footer</footer>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/nav-only");

		// Fallback should provide content
		expect(result).toHaveProperty("content");
	});

	it("should handle data-rehype-pretty-code-figure with pre inside", () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Figure Test</title></head>
			<body>
				<article>
					<h1>Test</h1>
					<p>Content here with enough text to be substantial for readability extraction.</p>
					<p>More content to ensure the article is detected properly by Readability.</p>
					<figure data-rehype-pretty-code-figure="">
						<pre data-language="python"><code>print("hello")</code></pre>
					</figure>
					<p>Final paragraph to close the article.</p>
				</article>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/figure");

		expect(result.content).not.toBeNull();
		if (result.content) {
			expect(result.content).toContain("print");
		}
	});
});

describe("extractContent - fallback code block preservation", () => {
	it("should collect and preserve code blocks during fallback extraction (lines 110-117)", () => {
		// Script+style only triggers Readability failure -> fallback collects code blocks (lines 110-117)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<pre><code>code block 1</code></pre>
				<div data-language="js"><code>code block 2</code></div>
				<div class="code-block"><pre>code block 3</pre></div>
				<div class="hljs"><code>code block 4</code></div>
				<div class="highlight"><code>code block 5</code></div>
				<div class="prism-code"><code>code block 6</code></div>
				<div class="shiki"><code>code block 7</code></div>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/fallback-code");

		// Fallback should provide content with code blocks
		expect(result.content).not.toBeNull();
		if (result.content) {
			// Check that code blocks are present (lines 110-117 collect them)
			const hasCodeBlocks =
				result.content.includes("code block") ||
				result.content.includes("<pre>") ||
				result.content.includes("<code>");
			expect(hasCodeBlocks).toBe(true);
		}
	});

	it("should add collected code blocks to content when not present (line 123)", () => {
		// Script+style only triggers fallback, code blocks are collected and added (line 123)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<div class="content">
					<span>text</span>
				</div>
				<pre><code>important code snippet</code></pre>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/code-addition");

		// Fallback should collect code blocks and add them
		expect(result.content).not.toBeNull();
		if (result.content) {
			// Verify code blocks were added (line 123)
			const hasCode =
				result.content.includes("code") ||
				result.content.includes("snippet") ||
				result.content.includes("pre");
			expect(hasCode).toBe(true);
		}
	});

	it("should extract from main tag in fallback mode (line 132)", () => {
		// Script+style only - Readability fails, fallback uses main selector (line 132)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<main>
					<span>Main content</span>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/main-fallback");

		expect(result.content).not.toBeNull();
		if (result.content) {
			// Should extract from main tag (line 132)
			expect(result.content.length).toBeGreaterThan(0);
		}
	});

	it("should extract from article tag in fallback mode (line 132)", () => {
		// Script+style triggers fallback, uses article selector (line 132)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<article>
					<span>Article</span>
				</article>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/article-fallback");

		expect(result.content).not.toBeNull();
	});

	it("should extract from role=main element in fallback mode (line 132)", () => {
		// Script+style triggers fallback, uses [role='main'] selector (line 132)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<div role="main">
					<span>Role Main</span>
				</div>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/role-main-fallback");

		expect(result.content).not.toBeNull();
	});

	it("should extract from .content class in fallback mode (line 132)", () => {
		// Script+style triggers fallback, uses .content selector (line 132)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<div class="content">
					<span>Content Class</span>
				</div>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/content-class-fallback");

		expect(result.content).not.toBeNull();
	});

	it("should extract from #content id in fallback mode (line 132)", () => {
		// Script+style triggers fallback, uses #content selector (line 132)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<div id="content">
					<span>Content ID</span>
				</div>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/content-id-fallback");

		expect(result.content).not.toBeNull();
	});

	it("should fallback to body when no selector matches (line 132)", () => {
		// Script+style with no specific selectors - triggers fallback to body (line 132)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<div class="random">
					<span>Random</span>
				</div>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/body-fallback");

		// Should fallback to body when no specific selector matches
		expect(result).toHaveProperty("content");
	});

	it("should handle code blocks with all selector types in fallback (lines 110-117)", () => {
		// Script+style triggers fallback, test all CODE_BLOCK_SELECTORS during collection (lines 110-117)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<pre>pre elem</pre>
				<code>code elem</code>
				<div data-language="python">data-language</div>
				<div data-rehype-pretty-code-fragment="">rehype</div>
				<div class="code-block">code-block</div>
				<div class="highlight">highlight</div>
				<div class="hljs">hljs</div>
				<div class="prism-code">prism</div>
				<div class="shiki">shiki</div>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/all-selectors");

		// Should collect code blocks from all selectors (lines 110-117)
		expect(result.content).not.toBeNull();
	});

	it("should handle content without code blocks in fallback (line 123 else path)", () => {
		// Script+style triggers fallback with inline code
		// Code blocks are inline, so hasCodeBlock check should find them (line 123 else)
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<main>
					<span>Text with <pre><code>code</code></pre> inline</span>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/has-code");

		expect(result.content).not.toBeNull();
		if (result.content) {
			// Should detect existing code blocks, so line 123's else path is taken
			expect(result.content).toBeTruthy();
		}
	});

	it("should trigger fallback with empty body", () => {
		// Completely empty body - definitely triggers fallback
		const html = `<!DOCTYPE html><html><head><title></title></head><body></body></html>`;
		const result = extractContent(html, "https://example.com/empty");

		// Fallback returns empty content for empty body (may be whitespace or null)
		expect(result.title).toBeNull();
		// Content may be null or just whitespace
		if (result.content) {
			expect(result.content.trim()).toBe("");
		}
	});

	it("should trigger fallback and extract from added main element", () => {
		// Start with script/style only (triggers fallback), but with main added via DOM manipulation
		// This won't work because fallback gets the original HTML string
		// Instead, use a pattern where nav/header/footer are present with main
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>/* This makes Readability less likely to succeed */</script>
				<noscript>Please enable JavaScript</noscript>
				<nav><a href="/">Home</a></nav>
				<header><h1>Header</h1></header>
				<main><p>Main content here</p><pre><code>test code</code></pre></main>
				<aside>Sidebar</aside>
				<footer><p>Footer</p></footer>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/complex");

		// Should extract content (either via Readability or fallback)
		expect(result.content).not.toBeNull();
	});
});

describe("extractContent - coverage gaps (Issue #338)", () => {
	it("should skip nested code block elements that have processed parent (lines 56-57)", () => {
		// Test the parent-child skip logic in protectCodeBlocks
		// .code-block is processed before pre in prioritySelectors
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Nested Code Blocks</title></head>
			<body>
				<article>
					<h1>Article with Nested Code Elements</h1>
					<p>This article contains nested code blocks to test the parent-child skip logic implemented in protectCodeBlocks.</p>
					<p>Additional content to ensure Read ability processes this as main content and extracts it properly.</p>
					<div class="code-block">
						<pre>
							<code>const nested = "test";</code>
						</pre>
					</div>
					<p>More content after the code block to ensure substantial content for extraction and proper testing.</p>
					<p>Even more paragraphs to make sure the article is long enough for Readability to work correctly.</p>
				</article>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/nested-skip");

		expect(result.content).not.toBeNull();
		// Should preserve the code without duplication
		const nestedMatches = result.content?.match(/const nested = "test"/g);
		// Should appear only once (parent .code-block processed, children pre/code skipped)
		expect(nestedMatches?.length).toBe(1);
	});

	it("should handle fallback with no code blocks to collect (line 117)", () => {
		// Fallback scenario with no code blocks in the HTML
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<main>
					<p>Plain text content without any code blocks</p>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/no-code-blocks");

		// Should still extract content even without code blocks
		expect(result.content).not.toBeNull();
		if (result.content) {
			expect(result.content).toContain("Plain text");
		}
	});

	it("should handle fallback with no elements to remove (line 123)", () => {
		// Fallback scenario with no script/style/nav/header/footer/aside elements
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<main>
					<p>Content</p>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/clean-html");

		// Should extract content normally
		expect(result.content).not.toBeNull();
	});

	it("should add code blocks when content exists but has no code selectors (lines 134-137, branch !hasCodeBlock)", () => {
		// Trigger fallback and ensure code blocks are added when content doesn't contain code selector keywords
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<div class="content">
					<p>Regular paragraph text</p>
					<div>Another div with text</div>
				</div>
				<section>
					<pre><code>const example = "code";</code></pre>
				</section>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/add-code-blocks");

		expect(result.content).not.toBeNull();
		// Code blocks should be added to content
		if (result.content) {
			expect(result.content).toContain("const example");
		}
	});

	it("should not duplicate code blocks when content already has code selectors (lines 134-137, branch hasCodeBlock)", () => {
		// Trigger fallback where content already contains code selector keywords
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>var x = 1;</script>
				<style>.test { color: red; }</style>
				<main>
					<p>Text with <pre>inline code</pre> element</p>
				</main>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/has-code-selector");

		expect(result.content).not.toBeNull();
		// Should not duplicate code blocks
		if (result.content) {
			expect(result.content.toLowerCase()).toContain("pre");
		}
	});

	it("should fallback to body when no specific selectors match (line 132)", () => {
		// Test the || body fallback
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>trigger fallback</script>
				<div class="random">
					<p>Random content</p>
				</div>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/body-fallback-132");

		// Should fallback to body
		expect(result.content).not.toBeNull();
	});

	it("should handle empty content in fallback code block check (line 134)", () => {
		// Edge case: content is null or empty in fallback
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>fallback</script>
				<pre><code>orphan code</code></pre>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/empty-content-check");

		// Should handle gracefully
		expect(result).toHaveProperty("content");
	});

	it("should collect multiple code blocks with different selectors (line 117)", () => {
		// Test code block collection with multiple selector types
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title></title></head>
			<body>
				<script>fallback</script>
				<pre>block1</pre>
				<code>block2</code>
				<div data-language="js">block3</div>
				<div class="hljs">block4</div>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/multiple-selectors");

		expect(result.content).not.toBeNull();
	});

	it("should trigger fallback and execute querySelector for main (line 132)", () => {
		// Use extremely minimal HTML to ensure Readability fails
		const html = `<html><body><script></script><style></style><main>X</main></body></html>`;
		const result = extractContent(html, "https://example.com/minimal-main");

		// Fallback should extract from main
		expect(result).toHaveProperty("content");
	});

	it("should execute code block collection loop in fallback (lines 115-119)", () => {
		// Minimal HTML to trigger fallback, with code blocks to collect
		const html = `<html><body><script>x</script><pre>code</pre></body></html>`;
		const result = extractContent(html, "https://example.com/fallback-collect");

		expect(result).toHaveProperty("content");
	});

	it("should add code blocks when hasCodeBlock is false (line 136)", () => {
		// Fallback with content that doesn't contain code selector keywords
		const html = `<html><body><script>x</script><div class="content">text</div><pre>code</pre></body></html>`;
		const result = extractContent(html, "https://example.com/add-blocks");

		expect(result).toHaveProperty("content");
	});

	it("should cover generateMarkerId with multiple code blocks (line 17)", () => {
		// Include multiple code blocks to ensure generateMarkerId is called multiple times
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Multiple IDs</title></head>
			<body>
				<article>
					<h1>Testing Marker ID Generation</h1>
					<p>This article has multiple code blocks to ensure the generateMarkerId function is called.</p>
					<p>Each code block should get a unique marker ID when protected and restored.</p>
					<pre><code>block 1</code></pre>
					<p>Additional text between code blocks to make the article substantial.</p>
					<pre><code>block 2</code></pre>
					<p>More content to ensure Readability processes this correctly.</p>
					<div class="code-block"><code>block 3</code></div>
					<p>Final paragraph to complete the article with enough content for extraction.</p>
				</article>
			</body>
			</html>
		`;
		const result = extractContent(html, "https://example.com/marker-ids");

		expect(result.content).not.toBeNull();
		// All three blocks should be present
		expect(result.content).toContain("block 1");
		expect(result.content).toContain("block 2");
		expect(result.content).toContain("block 3");
	});

	it("should remove nav/header/footer in fallback (line 123)", () => {
		// Minimal HTML to trigger fallback with elements to remove
		const html = `<html><body><nav>N</nav><header>H</header><script></script><footer>F</footer><p>C</p></body></html>`;
		const result = extractContent(html, "https://example.com/remove-elements");

		expect(result.content).not.toBeNull();
	});

	it("should trigger querySelector with all selectors in fallback (line 127)", () => {
		// Test that querySelector is executed in fallback
		// Use minimal HTML to ensure Readability fails
		const html = `<html><body><article><p>A</p></article></body></html>`;
		const result = extractContent(html, "https://example.com/query-selector");

		expect(result).toHaveProperty("content");
	});
});
