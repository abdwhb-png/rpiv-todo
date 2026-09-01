import { describe, expect, it } from "vitest";
import {
	ScrollView,
	Text,
	TuiAltScreen,
	type Terminal,
	VStack,
} from "@earendil-works/pi-tui";

import { getOverlayContentRows } from "../../config.js";

class MutableTerminal implements Terminal {
	columns = 100;
	rows = 40;
	readonly kittyProtocolActive = true;

	private inputHandler?: (data: string) => void;
	private resizeHandler?: () => void;

	start(onInput: (data: string) => void, onResize: () => void): void {
		this.inputHandler = onInput;
		this.resizeHandler = onResize;
	}

	stop(): void {}
	async drainInput(): Promise<void> {}
	write(): void {}
	moveBy(): void {}
	hideCursor(): void {}
	showCursor(): void {}
	clearLine(): void {}
	clearFromCursor(): void {}
	clearScreen(): void {}
	setTitle(): void {}
	setProgress(): void {}

	resize(rows: number): void {
		this.rows = rows;
		this.resizeHandler?.();
	}

	send(data: string): void {
		this.inputHandler?.(data);
	}
}

class ResponsiveDock extends Text {
	constructor(private readonly terminal: MutableTerminal) {
		super("", 0, 0);
	}

	override render(width: number): string[] {
		const todoRows = getOverlayContentRows(this.terminal.rows, true, 20);
		this.setText(
			Array.from({ length: 12 + todoRows }, (_, index) => `dock-${index + 1}`).join("\n"),
		);
		return super.render(width);
	}
}

function createFullscreenFixture(initialRows: number) {
	const terminal = new MutableTerminal();
	terminal.rows = initialRows;
	const transcript = new ScrollView(
		new Text(
			Array.from({ length: 60 }, (_, index) => `transcript-${index + 1}`).join("\n"),
			0,
			0,
		),
		{ follow: "end", primary: true },
	);
	const dock = new ResponsiveDock(terminal);
	const root = new VStack([
		{ component: transcript, grow: 1, minSize: 1 },
		{ component: dock, shrink: 1, minSize: 1 },
	]);
	const tui = new TuiAltScreen(terminal, false, undefined, { mouse: true });
	tui.setLayoutRoot(root);
	tui.start();
	tui.renderNow(true);
	return { dock, terminal, transcript, tui };
}

describe("responsive fullscreen layout", () => {
	it("preserves the transcript reserve at the calibrated medium height", () => {
		const { transcript, tui } = createFullscreenFixture(27);
		try {
			expect(transcript.viewportHeight).toBeGreaterThanOrEqual(12);
			expect(transcript.isFollowingEnd).toBe(true);
		} finally {
			tui.stop();
		}
	});

	it("reflows on resize and keeps the transcript scrollable", () => {
		const { terminal, transcript, tui } = createFullscreenFixture(40);
		try {
			const tallScrollTop = transcript.scrollTop;

			terminal.resize(27);
			tui.renderNow(true);
			expect(transcript.viewportHeight).toBeGreaterThanOrEqual(12);
			expect(transcript.scrollTop).toBeGreaterThan(tallScrollTop);
			expect(transcript.isFollowingEnd).toBe(true);

			terminal.resize(20);
			tui.renderNow(true);
			expect(transcript.viewportHeight).toBeGreaterThanOrEqual(1);

			terminal.send("\x1b[5~");
			expect(transcript.isFollowingEnd).toBe(false);
			const legacyPageUpTop = transcript.scrollTop;

			terminal.send("\x1b[6~");
			expect(transcript.scrollTop).toBeGreaterThan(legacyPageUpTop);

			terminal.send("\x1b[57421u");
			expect(transcript.isFollowingEnd).toBe(false);
			const kittyPageUpTop = transcript.scrollTop;

			terminal.send("\x1b[57422u");
			expect(transcript.scrollTop).toBeGreaterThan(kittyPageUpTop);

			terminal.resize(40);
			tui.renderNow(true);
			expect(transcript.viewportHeight).toBeGreaterThanOrEqual(12);
			expect(transcript.scrollTop).toBeLessThanOrEqual(60 - transcript.viewportHeight);
		} finally {
			tui.stop();
		}
	});
});
