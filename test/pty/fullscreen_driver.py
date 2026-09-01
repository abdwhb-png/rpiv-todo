#!/usr/bin/env python3
"""Run a deterministic Pi fullscreen session inside a resizeable PTY."""

from __future__ import annotations

import base64
import errno
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import tempfile
import termios
import time
from pathlib import Path


def set_size(fd: int, columns: int, rows: int) -> None:
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, columns, 0, 0))


def read_for(fd: int, seconds: float) -> bytes:
    deadline = time.monotonic() + seconds
    chunks: list[bytes] = []
    while time.monotonic() < deadline:
        ready, _, _ = select.select([fd], [], [], min(0.05, deadline - time.monotonic()))
        if not ready:
            continue
        try:
            chunk = os.read(fd, 65536)
        except OSError as error:
            if error.errno == errno.EIO:
                break
            raise
        if not chunk:
            break
        chunks.append(chunk)
    return b"".join(chunks)


def make_session(path: Path, cwd: Path) -> None:
    timestamp = "2026-09-01T12:00:00.000Z"
    entries: list[dict[str, object]] = [
        {
            "type": "session",
            "version": 3,
            "id": "01a12345-6789-7abc-8def-0123456789ab",
            "timestamp": timestamp,
            "cwd": str(cwd),
        }
    ]
    parent_id: str | None = None
    for index in range(1, 31):
        message_id = f"u{index:07d}"
        entries.append(
            {
                "type": "message",
                "id": message_id,
                "parentId": parent_id,
                "timestamp": timestamp,
                "message": {
                    "role": "user",
                    "content": [{"type": "text", "text": f"TRANSCRIPT-SENTINEL-{index:02d}"}],
                    "timestamp": 1788264000000 + index,
                },
            }
        )
        parent_id = message_id

    tasks = []
    for index in range(1, 21):
        status = "in_progress" if index == 11 else "pending" if index < 16 else "completed"
        tasks.append(
            {
                "id": index,
                "subject": f"PTY-TODO-{index:02d}",
                "status": status,
                "activeForm": "validating PTY resize" if index == 11 else None,
            }
        )
    tool_result_id = "todo0001"
    entries.append(
        {
            "type": "message",
            "id": tool_result_id,
            "parentId": parent_id,
            "timestamp": timestamp,
            "message": {
                "role": "toolResult",
                "toolCallId": "call-todo-fixture",
                "toolName": "todo",
                "content": [{"type": "text", "text": "Deterministic Todo fixture"}],
                "details": {"action": "list", "params": {}, "tasks": tasks, "nextId": 21},
                "isError": False,
                "timestamp": 1788264001000,
            },
        }
    )
    path.write_text("\n".join(json.dumps(entry, separators=(",", ":")) for entry in entries) + "\n")


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: fullscreen_driver.py PI_BINARY PACKAGE_ROOT")
    pi_binary = Path(sys.argv[1]).resolve()
    package_root = Path(sys.argv[2]).resolve()
    stages: list[dict[str, object]] = []

    with tempfile.TemporaryDirectory(prefix="rpiv-todo-pty-") as temporary:
        root = Path(temporary)
        agent_dir = root / "agent"
        workspace = root / "workspace"
        agent_dir.mkdir()
        workspace.mkdir()
        (agent_dir / "settings.json").write_text(
            json.dumps(
                {
                    "lastChangelogVersion": "0.84.3",
                    "packages": [str(package_root)],
                    "theme": "dark",
                }
            )
        )
        (agent_dir / "trust.json").write_text(json.dumps({str(workspace.resolve()): True}))
        session_path = root / "fixture.jsonl"
        make_session(session_path, workspace)

        pid, fd = pty.fork()
        if pid == 0:
            os.chdir(workspace)
            environment = os.environ.copy()
            environment.update(
                {
                    "HOME": str(root),
                    "USERPROFILE": str(root),
                    "PI_CODING_AGENT_DIR": str(agent_dir),
                    "PI_SKIP_VERSION_CHECK": "1",
                    "TERM": "xterm-256color",
                    "COLORTERM": "truecolor",
                    "NO_COLOR": "1",
                }
            )
            os.execve(
                pi_binary,
                [str(pi_binary), "--session", str(session_path), "--tui-mode", "fullscreen"],
                environment,
            )

        try:
            set_size(fd, 100, 40)
            startup = b""
            deadline = time.monotonic() + 15
            while b"Todos" not in startup and time.monotonic() < deadline:
                startup += read_for(fd, 0.25)
            stages.append({"name": "tall", "rows": 40, "data": base64.b64encode(startup).decode()})

            for name, rows, payload in [
                ("medium", 27, None),
                ("small", 20, None),
                ("page_up", 20, b"\x1b[5~"),
                ("page_down", 20, b"\x1b[6~"),
                ("wheel_up", 20, b"\x1b[<64;10;5M"),
                ("wheel_down", 20, b"\x1b[<65;10;5M"),
                ("restored", 40, None),
            ]:
                if rows != stages[-1]["rows"]:
                    set_size(fd, 100, rows)
                    os.kill(pid, signal.SIGWINCH)
                if payload is not None:
                    os.write(fd, payload)
                data = read_for(fd, 0.35)
                stages.append({"name": name, "rows": rows, "data": base64.b64encode(data).decode()})
        finally:
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            wait_deadline = time.monotonic() + 1
            while time.monotonic() < wait_deadline:
                try:
                    waited_pid, _ = os.waitpid(pid, os.WNOHANG)
                except ChildProcessError:
                    waited_pid = pid
                if waited_pid == pid:
                    break
                time.sleep(0.05)
            else:
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                try:
                    os.waitpid(pid, 0)
                except ChildProcessError:
                    pass
            os.close(fd)

    print(json.dumps({"columns": 100, "stages": stages}, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
