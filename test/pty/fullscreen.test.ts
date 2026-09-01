import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { Terminal } from "@xterm/headless";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const driverPath = fileURLToPath(new URL("./fullscreen_driver.py", import.meta.url));
const piBinary = fileURLToPath(new URL("../../node_modules/.bin/pi", import.meta.url));
const footerRoot = process.env.PI_FANCY_FOOTER_ROOT;

type Stage = { name: string; rows: number; data: string };

function write(terminal: Terminal, data: string): Promise<void> {
	return new Promise((resolve) => terminal.write(Buffer.from(data, "base64"), resolve));
}

function screenText(terminal: Terminal): string {
	const buffer = terminal.buffer.active;
	return Array.from({ length: terminal.rows }, (_, row) => buffer.getLine(row)?.translateToString(true) ?? "").join("\n");
}

describe("Pi fullscreen PTY", () => {
	it(
		"keeps Todo responsive and the transcript navigable through live resizes",
		async () => {
			const { stdout, stderr } = await execFileAsync(
				"python3",
				[driverPath, piBinary, packageRoot, ...(footerRoot ? [footerRoot] : [])],
				{
				maxBuffer: 8 * 1024 * 1024,
				timeout: 30_000,
				},
			);
			expect(stderr).toBe("");
			const capture = JSON.parse(stdout) as { columns: number; stages: Stage[] };
			const terminal = new Terminal({
				allowProposedApi: true,
				cols: capture.columns,
				rows: capture.stages[0]!.rows,
			});
			const screens = new Map<string, string>();

			for (const stage of capture.stages) {
				terminal.resize(capture.columns, stage.rows);
				await write(terminal, stage.data);
				screens.set(stage.name, screenText(terminal));
			}

			const tall = screens.get("tall") ?? "";
			const medium = screens.get("medium") ?? "";
			const small = screens.get("small") ?? "";
			const pageUp = screens.get("page_up") ?? "";
			const pageDown = screens.get("page_down") ?? "";
			const wheelUp = screens.get("wheel_up") ?? "";
			const wheelDown = screens.get("wheel_down") ?? "";
			const restored = screens.get("restored") ?? "";

			expect(tall).toContain("Todos");
			expect(tall).toContain("PTY-TODO-11");
			expect(medium).toContain("Todos");
			expect(medium).toContain("more");
			expect(medium.split("\n").findIndex((line) => line.includes("Todos"))).toBeGreaterThanOrEqual(12);
			expect(medium).toContain("TRANSCRIPT-SENTINEL-27");
			expect(medium).toContain("TRANSCRIPT-SENTINEL-30");
			expect(small).toContain("Todos");
			expect(small).toContain("more");
			expect(small).toContain("TRANSCRIPT-SENTINEL-30");
			expect(pageUp).toContain("TRANSCRIPT-SENTINEL-28");
			expect(pageDown).not.toBe(pageUp);
			expect(pageDown).toContain("TRANSCRIPT-SENTINEL-30");
			expect(wheelUp).not.toBe(pageDown);
			expect(wheelDown).not.toBe(wheelUp);
			expect(restored).toContain("Todos");
			expect(restored).toContain("PTY-TODO-11");
			if (footerRoot) {
				expect(tall).toContain("~/workspace");
				expect(small).toContain("Opus 4.8");
				expect(small).not.toContain("~/workspace");
				expect(restored).toContain("~/workspace");
			}
		},
		35_000,
	);
});
