import { verifyShipManifest } from "./test/helpers/manifest.js";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("publish manifest", () => {
	it("`package.json` `files` array covers every production .ts module across the tree", () => {
		expect(verifyShipManifest(import.meta.url)).toEqual({ missing: [], stale: [] });
	});

	it("reports unlisted modules and missing declared files or asset directories", () => {
		const packageDir = mkdtempSync(join(tmpdir(), "rpiv-todo-manifest-"));
		temporaryDirectories.push(packageDir);
		writeFileSync(
			join(packageDir, "package.json"),
			JSON.stringify({ files: ["index.ts", "locales/", "docs/", "missing.png"] }),
		);
		writeFileSync(join(packageDir, "index.ts"), "export {};\n");
		writeFileSync(join(packageDir, "unlisted.ts"), "export {};\n");
		mkdirSync(join(packageDir, "docs"));

		expect(verifyShipManifest(packageDir)).toEqual({
			missing: ["unlisted.ts"],
			stale: ["locales/", "missing.png"],
		});
	});
});
