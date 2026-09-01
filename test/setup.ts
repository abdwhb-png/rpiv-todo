import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach } from "vitest";

const temporaryHome = mkdtempSync(join(tmpdir(), "rpiv-todo-test-"));
const previousEnvironment = {
	HOME: process.env.HOME,
	USERPROFILE: process.env.USERPROFILE,
	PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR,
	XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
};

process.env.HOME = temporaryHome;
process.env.USERPROFILE = temporaryHome;
delete process.env.PI_CODING_AGENT_DIR;
delete process.env.XDG_CONFIG_HOME;

function clearTodoConfig(): void {
	rmSync(join(temporaryHome, ".config", "rpiv-todo"), { recursive: true, force: true });
}

async function resetRuntimeState(): Promise<void> {
	const [{ __resetState: resetTodoState }, { __resetState: resetI18nState }] = await Promise.all([
		import("../todo.js"),
		import("@juicesharp/rpiv-i18n"),
	]);
	resetTodoState();
	resetI18nState();
}

beforeEach(async () => {
	clearTodoConfig();
	await resetRuntimeState();
});

afterAll(async () => {
	clearTodoConfig();
	await resetRuntimeState();
	rmSync(temporaryHome, { recursive: true, force: true });
	for (const [key, value] of Object.entries(previousEnvironment)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});
