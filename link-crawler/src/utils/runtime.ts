/** プロセス実行結果 */
export interface SpawnResult {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

/** ランタイムアダプターインターフェース */
export interface RuntimeAdapter {
	/**
	 * コマンドを実行して結果を返す
	 */
	spawn(command: string, args: string[]): Promise<SpawnResult>;

	/**
	 * 指定時間スリープする
	 */
	sleep(ms: number): Promise<void>;

	/**
	 * ファイルを読み込む
	 */
	readFile(path: string): Promise<string>;
}

/** Bunランタイムアダプター */
export class BunRuntimeAdapter implements RuntimeAdapter {
	async spawn(command: string, args: string[]): Promise<SpawnResult> {
		try {
			const proc = Bun.spawn([command, ...args], {
				stdout: "pipe",
				stderr: "pipe",
			});
			const stdout = await new Response(proc.stdout).text();
			const stderr = await new Response(proc.stderr).text();
			const exitCode = await proc.exited;
			return { success: exitCode === 0, stdout, stderr, exitCode };
		} catch (error) {
			return {
				success: false,
				stdout: "",
				stderr: error instanceof Error ? error.message : "command not found",
				exitCode: -1,
			};
		}
	}

	async sleep(ms: number): Promise<void> {
		return Bun.sleep(ms);
	}

	async readFile(path: string): Promise<string> {
		const file = Bun.file(path);
		return file.text();
	}
}

/** 汎用ランタイムアダプター（Node.js互換） */
export class NodeRuntimeAdapter implements RuntimeAdapter {
	async spawn(command: string, args: string[]): Promise<SpawnResult> {
		const { spawn } = await import("node:child_process");
		return new Promise((resolve) => {
			const proc = spawn(command, args, {
				stdio: ["ignore", "pipe", "pipe"],
			});
			let stdout = "";
			let stderr = "";

			proc.stdout?.on("data", (data) => {
				stdout += data.toString();
			});

			proc.stderr?.on("data", (data) => {
				stderr += data.toString();
			});

			proc.on("close", (exitCode) => {
				resolve({
					success: exitCode === 0,
					stdout,
					stderr,
					exitCode,
				});
			});

			proc.on("error", (error) => {
				resolve({
					success: false,
					stdout: "",
					stderr: error.message,
					exitCode: -1,
				});
			});
		});
	}

	async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async readFile(path: string): Promise<string> {
		const { readFile } = await import("node:fs/promises");
		return readFile(path, "utf-8");
	}
}

/** ランタイムアダプターのファクトリー */
export function createRuntimeAdapter(): RuntimeAdapter {
	// Bunの場合はBunRuntimeAdapterを使用
	if (typeof Bun !== "undefined") {
		return new BunRuntimeAdapter();
	}
	// それ以外はNode.js互換
	return new NodeRuntimeAdapter();
}
