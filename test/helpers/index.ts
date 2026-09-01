import type { Message, ToolResultMessage, UserMessage } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
	ExtensionUIContext,
	RegisteredCommand,
	SessionEntry,
	Theme,
	ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import type { KeyId } from "@earendil-works/pi-tui";
import { vi } from "vitest";

export interface CapturedPi {
	tools: Map<string, ToolDefinition>;
	commands: Map<string, Omit<RegisteredCommand, "name" | "sourceInfo">>;
	shortcuts: Map<string, { description?: string; handler: (ctx: ExtensionContext) => Promise<void> | void }>;
	events: Map<string, Array<(...args: unknown[]) => unknown>>;
}

export interface MockTheme {
	fg: (color: string, text: string) => string;
	bg: (color: string, text: string) => string;
	bold: (text: string) => string;
	strikethrough: (text: string) => string;
}

type MockPiRegistration = Pick<ExtensionAPI, "registerCommand" | "registerShortcut">;
type MockUiSurface = Pick<
	ExtensionUIContext,
	"select" | "confirm" | "input" | "notify" | "onTerminalInput" | "setStatus" | "setWidget"
>;
type MockSessionManager = Pick<ExtensionContext["sessionManager"], "getBranch" | "getEntries" | "getSessionId">;
type MockContextSurface = Pick<
	ExtensionContext,
	| "hasUI"
	| "mode"
	| "cwd"
	| "ui"
	| "model"
	| "scopedModels"
	| "isIdle"
	| "isProjectTrusted"
	| "signal"
	| "abort"
	| "hasPendingMessages"
	| "shutdown"
	| "getContextUsage"
	| "compact"
	| "getSystemPrompt"
> & {
	sessionManager: MockSessionManager;
};

export function createMockPi(): { pi: ExtensionAPI; captured: CapturedPi } {
	const captured: CapturedPi = {
		tools: new Map(),
		commands: new Map(),
		shortcuts: new Map(),
		events: new Map(),
	};
	const registrations = {
		registerCommand: vi.fn((name: string, command: Omit<RegisteredCommand, "name" | "sourceInfo">) => {
			captured.commands.set(name, command);
		}),
		registerShortcut: vi.fn((shortcut: KeyId, options: { description?: string; handler: (ctx: ExtensionContext) => Promise<void> | void }) => {
			captured.shortcuts.set(shortcut, options);
		}),
	} satisfies MockPiRegistration;
	const registerTool = vi.fn((tool: ToolDefinition) => captured.tools.set(tool.name, tool));
	// `on` is overloaded once per Pi event and registerTool is generic over its
	// TypeBox schema. This boundary is intentionally narrow: tests retain their
	// actual registrations without recreating Pi's framework-only generic dispatch.
	const on = vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
		const handlers = captured.events.get(event) ?? [];
		handlers.push(handler);
		captured.events.set(event, handlers);
	});
	const pi = { ...registrations, registerTool, on } as unknown as ExtensionAPI;
	return { pi, captured };
}

export function createMockUI(
	overrides: Partial<Omit<ExtensionUIContext, "theme">> & { theme?: Theme | MockTheme } = {},
): ExtensionUIContext {
	const ui = {
		notify: vi.fn(),
		confirm: vi.fn(async () => true),
		input: vi.fn(async () => ""),
		select: vi.fn(async () => undefined),
		setWidget: vi.fn(),
		setStatus: vi.fn(),
		onTerminalInput: vi.fn(() => () => {}),
		...overrides,
	} satisfies MockUiSurface;
	// The production code only uses MockUiSurface; the full Pi UI is a framework
	// boundary and is deliberately not reimplemented by unit fixtures.
	return ui as unknown as ExtensionUIContext;
}

export function createMockCtx(options: {
	hasUI?: boolean;
	branch?: SessionEntry[];
	sessionId?: string;
	ui?: Partial<ExtensionUIContext>;
} = {}): ExtensionContext {
	const branch = options.branch ?? [];
	const sessionId = options.sessionId ?? "test-session";
	const sessionManager = {
		getBranch: vi.fn(() => branch),
		getEntries: vi.fn(() => branch),
		getSessionId: vi.fn(() => sessionId),
	} satisfies MockSessionManager;
	const context = {
		hasUI: options.hasUI ?? false,
		mode: "tui",
		cwd: "/tmp/rpiv-todo-test-cwd",
		ui: createMockUI(options.ui),
		sessionManager,
		model: undefined,
		scopedModels: [],
		isIdle: vi.fn(() => true),
		isProjectTrusted: vi.fn(() => true),
		signal: undefined,
		abort: vi.fn(),
		hasPendingMessages: vi.fn(() => false),
		shutdown: vi.fn(),
		getContextUsage: vi.fn(() => undefined),
		compact: vi.fn(),
		getSystemPrompt: vi.fn(() => ""),
	} satisfies MockContextSurface;
	// modelRegistry is unused by Todo's tested paths. Keeping this cast at the
	// ExtensionContext boundary avoids inventing a fake registry contract.
	return context as unknown as ExtensionContext;
}

export function makeUserMessage(text: string): UserMessage {
	return { role: "user", content: [{ type: "text", text }], timestamp: Date.now() } satisfies UserMessage;
}

export function makeTodoToolResult(details: unknown, text = "ok"): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: `call-todo-${Date.now()}`,
		toolName: "todo",
		content: [{ type: "text", text }],
		details,
		isError: false,
		timestamp: Date.now(),
	} satisfies ToolResultMessage;
}

export function buildSessionEntries(messages: Message[]): SessionEntry[] {
	return messages.map((message, index) => ({
		type: "message",
		id: `test-entry-${index + 1}`,
		parentId: index === 0 ? null : `test-entry-${index}`,
		timestamp: new Date().toISOString(),
		message,
	} satisfies SessionEntry));
}

export function makeTheme(overrides: Partial<MockTheme> = {}): MockTheme {
	return {
		fg: (_color, text) => text,
		bg: (_color, text) => text,
		bold: (text) => text,
		strikethrough: (text) => text,
		...overrides,
	};
}
