/**
 * writer.ts finalize() のエラーパステスト
 *
 * node:fs をモックして renameSync / rmSync の失敗をシミュレートする。
 * 既存の writer.test.ts とは別ファイルにして、モックの影響を分離する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrawlConfig, Logger, PageMetadata } from "../../src/types.js";

// Mutable interceptors - tests set these to inject errors
let renameSyncInterceptor: ((...args: any[]) => any) | null = null;
let rmSyncInterceptor: ((...args: any[]) => any) | null = null;

// Store real implementations inside the mock factory to avoid hoisting issues
const originals = vi.hoisted(() => {
	return {
		renameSync: null as any,
		rmSync: null as any,
		existsSync: null as any,
		mkdirSync: null as any,
		readdirSync: null as any,
	};
});

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	// Capture real implementations
	originals.renameSync = actual.renameSync;
	originals.rmSync = actual.rmSync;
	originals.existsSync = actual.existsSync;
	originals.mkdirSync = actual.mkdirSync;
	originals.readdirSync = actual.readdirSync;

	return {
		...actual,
		renameSync: (...args: any[]) => {
			if (renameSyncInterceptor) {
				return renameSyncInterceptor(...args);
			}
			return actual.renameSync(args[0], args[1]);
		},
		rmSync: (...args: any[]) => {
			if (rmSyncInterceptor) {
				return rmSyncInterceptor(...args);
			}
			return actual.rmSync(args[0], args[1]);
		},
	};
});

// Import OutputWriter after mock is set up
const { OutputWriter } = await import("../../src/output/writer.js");

const testOutputDir = "./test-finalize-errors";

const defaultConfig: CrawlConfig = {
	startUrl: "https://example.com",
	maxDepth: 2,
	maxPages: null,
	outputDir: testOutputDir,
	sameDomain: true,
	includePattern: null,
	excludePattern: null,
	delay: 500,
	timeout: 30000,
	spaWait: 2000,
	headed: false,
	diff: false,
	pages: true,
	merge: true,
	chunks: true,
	keepSession: false,
	respectRobots: true,
	version: "test-version",
};

const defaultMetadata: PageMetadata = {
	title: "Test Page",
	description: "Test description",
	keywords: null,
	author: null,
	ogTitle: null,
	ogType: null,
};

/** テスト用モックロガー */
function createMockLogger(): Logger {
	return {
		logIndexFormatError: vi.fn(),
		logIndexLoadError: vi.fn(),
		logDebug: vi.fn(),
	};
}

describe("OutputWriter finalize() error paths", () => {
	beforeEach(() => {
		renameSyncInterceptor = null;
		rmSyncInterceptor = null;
		originals.rmSync(testOutputDir, { recursive: true, force: true });
	});

	afterEach(() => {
		renameSyncInterceptor = null;
		rmSyncInterceptor = null;
		try {
			const entries = originals.readdirSync(".").filter((e: string) =>
				e.startsWith("test-finalize-errors"),
			);
			for (const entry of entries) {
				originals.rmSync(entry, { recursive: true, force: true });
			}
		} catch {
			// ignore
		}
	});

	describe("recoverFromIncompleteFinalization - rename failure", () => {
		it("should continue finalize when recovery rename fails", () => {
			const backupDir = `${testOutputDir}.bak`;
			originals.mkdirSync(backupDir, { recursive: true });

			const logger = createMockLogger();
			const writer = new OutputWriter({ ...defaultConfig, diff: false }, logger);
			writer.savePage("https://example.com/page", "# Content", 0, [], defaultMetadata, "Test");
			writer.saveIndex();

			// Make renameSync fail only for recovery rename (.bak → final)
			// Throw non-Error to cover the `String(error)` branch in error handling
			renameSyncInterceptor = (...args: any[]) => {
				const src = String(args[0]);
				const dest = String(args[1]);
				if (src === backupDir && dest === testOutputDir) {
					throw "Simulated recovery rename failure (string)"; // non-Error value
				}
				return originals.renameSync(args[0], args[1]);
			};

			// finalize should not throw (recovery failure is non-fatal)
			expect(() => writer.finalize()).not.toThrow();

			// Verify output exists (finalize completed despite recovery failure)
			expect(originals.existsSync(testOutputDir)).toBe(true);

			// Verify logger was called with recovery-related messages
			expect(logger.logDebug).toHaveBeenCalledWith(
				"Detected incomplete previous finalization, recovering from backup",
				expect.any(Object),
			);
			expect(logger.logDebug).toHaveBeenCalledWith("Failed to recover from backup", expect.any(Object));
			expect(logger.logDebug).toHaveBeenCalledWith("Output finalized successfully");
		});
	});

	describe("promoteTemp - rename failure with backup restore", () => {
		it("should restore backup and rethrow when promoteTemp fails", () => {
			// 1. Create existing output
			const writer1 = new OutputWriter({ ...defaultConfig, diff: false });
			writer1.savePage("https://example.com/original", "# Original", 0, [], defaultMetadata, "Original");
			writer1.saveIndex();
			writer1.finalize();

			// 2. Create new writer with logger
			const logger = createMockLogger();
			const writer2 = new OutputWriter({ ...defaultConfig, diff: false }, logger);
			writer2.savePage("https://example.com/new", "# New", 0, [], defaultMetadata, "New");
			writer2.saveIndex();

			const workingDir = writer2.getWorkingOutputDir();

			// Make renameSync fail when renaming temp → final (promoteTemp)
			renameSyncInterceptor = (...args: any[]) => {
				const src = String(args[0]);
				const dest = String(args[1]);
				if (src === workingDir && dest === testOutputDir) {
					throw new Error("Simulated promoteTemp rename failure");
				}
				return originals.renameSync(args[0], args[1]);
			};

			// finalize should throw (promoteTemp failure is fatal)
			expect(() => writer2.finalize()).toThrow("Simulated promoteTemp rename failure");

			// Backup should have been restored → finalOutputDir should exist
			expect(originals.existsSync(testOutputDir)).toBe(true);

			// Verify logger was called with restore-related messages
			expect(logger.logDebug).toHaveBeenCalledWith(
				"Failed to rename temp directory, restoring backup",
				expect.any(Object),
			);
			expect(logger.logDebug).toHaveBeenCalledWith("Restored backup after finalize failure");
		});

		it("should handle promoteTemp failure when backup restore also fails", () => {
			// 1. Create existing output
			const writer1 = new OutputWriter({ ...defaultConfig, diff: false });
			writer1.savePage("https://example.com/original", "# Original", 0, [], defaultMetadata, "Original");
			writer1.saveIndex();
			writer1.finalize();

			// 2. Create new writer with logger
			const logger = createMockLogger();
			const writer2 = new OutputWriter({ ...defaultConfig, diff: false }, logger);
			writer2.savePage("https://example.com/new", "# New", 0, [], defaultMetadata, "New");
			writer2.saveIndex();

			const workingDir = writer2.getWorkingOutputDir();
			const backupDir = `${testOutputDir}.bak`;
			let backupDone = false;

			// Allow backup, fail promoteTemp and backup restore
			renameSyncInterceptor = (...args: any[]) => {
				const src = String(args[0]);
				const dest = String(args[1]);

				// backupExistingOutput: final → .bak (allow once)
				if (dest === backupDir && !backupDone) {
					backupDone = true;
					return originals.renameSync(args[0], args[1]);
				}

				// promoteTemp: temp → final (fail)
				if (src === workingDir && dest === testOutputDir) {
					throw new Error("Simulated promoteTemp failure");
				}

				// backup restore: .bak → final (fail)
				if (src === backupDir && dest === testOutputDir) {
					throw new Error("Simulated backup restore failure");
				}

				return originals.renameSync(args[0], args[1]);
			};

			// Should still throw the original promoteTemp error
			expect(() => writer2.finalize()).toThrow("Simulated promoteTemp failure");

			// Verify logger was called with both failure messages
			expect(logger.logDebug).toHaveBeenCalledWith(
				"Failed to rename temp directory, restoring backup",
				expect.any(Object),
			);
			expect(logger.logDebug).toHaveBeenCalledWith("Failed to restore backup", expect.any(Object));
		});
	});

	describe("removeBackup - rmSync failure", () => {
		it("should silently handle removeBackup failure (non-fatal)", () => {
			// 1. Create existing output
			const writer1 = new OutputWriter({ ...defaultConfig, diff: false });
			writer1.savePage("https://example.com/original", "# Original", 0, [], defaultMetadata, "Original");
			writer1.saveIndex();
			writer1.finalize();

			// 2. Create new writer with logger
			const logger = createMockLogger();
			const writer2 = new OutputWriter({ ...defaultConfig, diff: false }, logger);
			writer2.savePage("https://example.com/new", "# New", 0, [], defaultMetadata, "New");
			writer2.saveIndex();

			const backupDir = `${testOutputDir}.bak`;

			// Make rmSync fail for backup removal (throw non-Error to cover String(error) branch)
			rmSyncInterceptor = (...args: any[]) => {
				const target = String(args[0]);
				if (target === backupDir) {
					throw "Simulated rmSync failure (string)"; // non-Error value
				}
				return originals.rmSync(args[0], args[1]);
			};

			// finalize should NOT throw (removeBackup failure is non-fatal)
			expect(() => writer2.finalize()).not.toThrow();

			// Output should still be finalized
			expect(originals.existsSync(testOutputDir)).toBe(true);

			// Verify logger was called with non-fatal error message
			expect(logger.logDebug).toHaveBeenCalledWith(
				"Failed to remove backup (non-fatal)",
				expect.any(Object),
			);
		});
	});
});
