import type { Task } from "../tool/types.js";
import { describe, expect, it } from "vitest";
import { selectOverlayLayout } from "./selectors.js";

function task(id: number, subject: string, status: Task["status"]): Task {
	return { id, subject, status };
}

describe("selectOverlayLayout", () => {
	it("prioritizes in-progress work while restoring source order and reporting each hidden status", () => {
		const layout = selectOverlayLayout(
			{
				nextId: 9,
				tasks: [
					task(1, "pending first", "pending"),
					task(2, "progress first", "in_progress"),
					task(3, "completed first", "completed"),
					task(4, "progress second", "in_progress"),
					task(5, "pending second", "pending"),
					task(6, "completed second", "completed"),
					task(7, "progress third", "in_progress"),
					task(8, "pending third", "pending"),
				],
			},
			4,
		);

		expect(layout.visible.map((item) => item.subject)).toEqual([
			"progress first",
			"progress second",
			"progress third",
		]);
		expect(layout.hiddenInProgress).toBe(0);
		expect(layout.hiddenPending).toBe(3);
		expect(layout.hiddenCompleted).toBe(2);
		expect(layout.truncatedTail).toBe(3);
	});

	it("keeps the first in-progress tasks in source order when the priority group overflows", () => {
		const layout = selectOverlayLayout(
			{
				nextId: 7,
				tasks: [
					task(1, "pending", "pending"),
					task(2, "progress first", "in_progress"),
					task(3, "completed", "completed"),
					task(4, "progress second", "in_progress"),
					task(5, "progress third", "in_progress"),
					task(6, "pending later", "pending"),
				],
			},
			3,
		);

		expect(layout.visible.map((item) => item.subject)).toEqual(["progress first", "progress second"]);
		expect(layout.hiddenInProgress).toBe(1);
		expect(layout.hiddenPending).toBe(2);
		expect(layout.hiddenCompleted).toBe(1);
		expect(layout.truncatedTail).toBe(3);
	});
});
