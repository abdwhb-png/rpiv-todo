import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_DIRS = new Set(["node_modules", "docs", "test"]);
const SKIP_FILES = new Set(["test-fixtures.ts", "vitest.config.ts"]);

export interface ShipManifestResult {
	missing: readonly string[];
	stale: readonly string[];
}

export function verifyShipManifest(packageDirOrUrl: string): ShipManifestResult {
	const packageDir = packageDirOrUrl.startsWith("file:") ? dirname(fileURLToPath(packageDirOrUrl)) : packageDirOrUrl;
	const pkg = JSON.parse(readFileSync(resolve(packageDir, "package.json"), "utf8")) as { files?: string[] };
	const entries = pkg.files ?? [];
	const exactFiles = new Set(entries.filter((entry) => !entry.startsWith("!") && !isDirectory(packageDir, entry)));
	const directories = entries
		.filter((entry) => !entry.startsWith("!") && (entry.endsWith("/") || isDirectory(packageDir, entry)))
		.map((entry) => (entry.endsWith("/") ? entry : `${entry}/`));
	const missing = walkProductionTs(packageDir, packageDir).filter(
		(file) => !exactFiles.has(file) && !directories.some((directory) => file.startsWith(directory)),
	);
	const stale = entries.filter((entry) => !entry.startsWith("!") && !existsSync(resolve(packageDir, entry)));
	return { missing, stale };
}

function isDirectory(packageDir: string, entry: string): boolean {
	try {
		return statSync(resolve(packageDir, entry)).isDirectory();
	} catch {
		return false;
	}
}

function walkProductionTs(root: string, directory: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.name.startsWith(".") || (entry.isDirectory() && SKIP_DIRS.has(entry.name))) continue;
		const absolute = resolve(directory, entry.name);
		if (entry.isDirectory()) files.push(...walkProductionTs(root, absolute));
		else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") && !SKIP_FILES.has(entry.name)) {
			files.push(relative(root, absolute));
		}
	}
	return files;
}
