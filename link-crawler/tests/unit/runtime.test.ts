import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BunRuntimeAdapter,
	createRuntimeAdapter,
	NodeRuntimeAdapter,
} from "../../src/utils/runtime.js";

describe("BunRuntimeAdapter", () => {
	let adapter: BunRuntimeAdapter;

	beforeEach(() => {
		adapter = new BunRuntimeAdapter();
	});

	describe("spawn", () => {
		it("should spawn command successfully", async () => {
			// Mock Bun.spawn
			const mockStdout = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode("stdout content"));
					controller.close();
				},
			});
			const mockStderr = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(""));
					controller.close();
				},
			});

			const mockProc = {
				stdout: mockStdout,
				stderr: mockStderr,
				exited: Promise.resolve(0),
			};

			const originalBun = (globalThis as { Bun?: typeof Bun }).Bun;
			(globalThis as { Bun?: typeof Bun }).Bun = {
				spawn: vi.fn().mockReturnValue(mockProc),
				sleep: vi.fn(),
			} as unknown as typeof Bun;

			const result = await adapter.spawn("echo", ["hello"]);

			expect(result.success).toBe(true);
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe("stdout content");
			expect(result.stderr).toBe("");

			// Restore
			(globalThis as { Bun?: typeof Bun }).Bun = originalBun;
		});

		it("should handle command failure", async () => {
			const mockStdout = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(""));
					controller.close();
				},
			});
			const mockStderr = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode("error message"));
					controller.close();
				},
			});

			const mockProc = {
				stdout: mockStdout,
				stderr: mockStderr,
				exited: Promise.resolve(1),
			};

			const originalBun = (globalThis as { Bun?: typeof Bun }).Bun;
			(globalThis as { Bun?: typeof Bun }).Bun = {
				spawn: vi.fn().mockReturnValue(mockProc),
				sleep: vi.fn(),
			} as unknown as typeof Bun;

			const result = await adapter.spawn("false", []);

			expect(result.success).toBe(false);
			expect(result.exitCode).toBe(1);
			expect(result.stderr).toBe("error message");

			// Restore
			(globalThis as { Bun?: typeof Bun }).Bun = originalBun;
		});

		it("should handle spawn error", async () => {
			const originalBun = (globalThis as { Bun?: typeof Bun }).Bun;
			(globalThis as { Bun?: typeof Bun }).Bun = {
				spawn: vi.fn().mockImplementation(() => {
					throw new Error("command not found");
				}),
				sleep: vi.fn(),
			} as unknown as typeof Bun;

			const result = await adapter.spawn("nonexistent", []);

			expect(result.success).toBe(false);
			expect(result.exitCode).toBe(-1);
			expect(result.stderr).toBe("command not found");

			// Restore
			(globalThis as { Bun?: typeof Bun }).Bun = originalBun;
		});
	});

	describe("sleep", () => {
		it("should call Bun.sleep", async () => {
			const mockSleep = vi.fn().mockResolvedValue(undefined);
			const originalBun = (globalThis as { Bun?: typeof Bun }).Bun;
			(globalThis as { Bun?: typeof Bun }).Bun = {
				spawn: vi.fn(),
				sleep: mockSleep,
			} as unknown as typeof Bun;

			await adapter.sleep(100);

			expect(mockSleep).toHaveBeenCalledWith(100);

			// Restore
			(globalThis as { Bun?: typeof Bun }).Bun = originalBun;
		});
	});
});

describe("NodeRuntimeAdapter", () => {
	let adapter: NodeRuntimeAdapter;

	beforeEach(() => {
		adapter = new NodeRuntimeAdapter();
	});

	describe("spawn", () => {
		it("should spawn command successfully", async () => {
			const result = await adapter.spawn("echo", ["hello"]);

			expect(result.success).toBe(true);
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("hello");
			expect(result.stderr).toBe("");
		});

		it("should handle command failure", async () => {
			const result = await adapter.spawn("node", [
				"-e",
				"process.stderr.write('error'); process.exit(1)",
			]);

			expect(result.success).toBe(false);
			expect(result.exitCode).toBe(1);
			expect(result.stderr).toBe("error");
		});

		it("should handle non-existent command", async () => {
			const result = await adapter.spawn("nonexistent_command_xyz", []);

			expect(result.success).toBe(false);
			expect(result.exitCode).toBe(-1);
			expect(result.stderr.length).toBeGreaterThan(0);
		});
	});

	describe("sleep", () => {
		it("should sleep for specified duration", async () => {
			const start = Date.now();
			await adapter.sleep(50);
			const elapsed = Date.now() - start;

			expect(elapsed).toBeGreaterThanOrEqual(45);
		});
	});
});

describe("createRuntimeAdapter", () => {
	let originalBun: typeof Bun | undefined;

	beforeEach(() => {
		originalBun = (globalThis as { Bun?: typeof Bun }).Bun;
	});

	afterEach(() => {
		(globalThis as { Bun?: typeof Bun }).Bun = originalBun;
	});

	it("should return BunRuntimeAdapter when Bun is defined", () => {
		(globalThis as { Bun?: typeof Bun }).Bun = {
			spawn: vi.fn(),
			sleep: vi.fn(),
		} as unknown as typeof Bun;

		const adapter = createRuntimeAdapter();

		expect(adapter).toBeInstanceOf(BunRuntimeAdapter);
	});

	it("should return NodeRuntimeAdapter when Bun is undefined", () => {
		(globalThis as { Bun?: typeof Bun }).Bun = undefined;

		const adapter = createRuntimeAdapter();

		expect(adapter).toBeInstanceOf(NodeRuntimeAdapter);
	});
});
