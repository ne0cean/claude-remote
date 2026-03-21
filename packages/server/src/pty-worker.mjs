#!/usr/bin/env node
/**
 * PTY Worker — Node.js subprocess that manages PTY processes.
 * Bun's event loop doesn't support node-pty onData events,
 * so we run PTY in a separate Node process and communicate via stdio JSON lines.
 *
 * Protocol (JSON lines via stdin/stdout):
 *   → { type: 'spawn', id, command, args, cols, rows, cwd, env }
 *   → { type: 'write', id, data }
 *   → { type: 'resize', id, cols, rows }
 *   → { type: 'kill', id }
 *   ← { type: 'data', id, data }
 *   ← { type: 'exit', id, exitCode, signal }
 *   ← { type: 'error', id, message }
 *   ← { type: 'spawned', id, pid }
 */
import * as pty from 'node-pty';
import { createInterface } from 'readline';

const ptys = new Map();

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

const rl = createInterface({ input: process.stdin });

rl.on('line', (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }

  const { type, id } = msg;

  if (type === 'spawn') {
    try {
      const p = pty.spawn(msg.command, msg.args || [], {
        name: 'xterm-256color',
        cols: msg.cols || 80,
        rows: msg.rows || 24,
        cwd: msg.cwd || process.cwd(),
        env: msg.env || process.env,
      });

      ptys.set(id, p);

      p.onData((data) => {
        send({ type: 'data', id, data });
      });

      p.onExit(({ exitCode, signal }) => {
        send({ type: 'exit', id, exitCode, signal });
        ptys.delete(id);
      });

      send({ type: 'spawned', id, pid: p.pid });
    } catch (e) {
      send({ type: 'error', id, message: e.message });
    }
  } else if (type === 'write') {
    const p = ptys.get(id);
    if (p) {
      try { p.write(msg.data); } catch (e) {
        send({ type: 'error', id, message: e.message });
      }
    }
  } else if (type === 'resize') {
    const p = ptys.get(id);
    if (p && msg.cols > 0 && msg.rows > 0) {
      try { p.resize(msg.cols, msg.rows); } catch (e) {
        // Ignore resize errors (EBADF when process already exited)
      }
    }
  } else if (type === 'kill') {
    const p = ptys.get(id);
    if (p) {
      try { p.kill(); } catch { /* ignore */ }
      ptys.delete(id);
    }
  }
});

rl.on('close', () => {
  // Parent died, clean up all PTYs
  for (const p of ptys.values()) {
    try { p.kill(); } catch { /* ignore */ }
  }
  process.exit(0);
});

// Keep alive
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
