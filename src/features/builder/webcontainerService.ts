/**
 * WebContainerService — boots a real Node.js + Vite environment inside the
 * browser via @webcontainer/api. Singleton: the WebContainer.boot() call
 * is global per-tab (the runtime explicitly forbids more than one boot).
 *
 * Lifecycle:
 *   1. boot()                  → idempotent global boot
 *   2. mount(files)            → write the project tree (Vite scaffold + user src)
 *   3. install()               → npm install (streams logs)
 *   4. dev()                   → npm run dev (resolves with the preview URL)
 *   5. writeFiles(files)       → live update src/ on subsequent edits (HMR)
 *   6. teardown()              → kill processes + free the WebContainer
 *
 * Errors are bubbled through the onLog callback so the UI can render them
 * in the terminal panel.
 */
import type { WebContainer, FileSystemTree } from '@webcontainer/api';
import { buildScaffoldFiles } from './projectScaffoldClient';
import type { GeneratedFile } from '@/features/projects/projectTypes';
import { openDB, type IDBPDatabase } from 'idb';

export type WCStatus =
  | 'idle'
  | 'booting'
  | 'mounting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error';

export interface WCLog {
  kind: 'stdout' | 'stderr' | 'system';
  line: string;
  ts: number;
}

export interface WCSnapshot {
  status: WCStatus;
  url: string | null;
  error: string | null;
}

type Listener = (snap: WCSnapshot) => void;
type LogListener = (log: WCLog) => void;

let bootPromise: Promise<WebContainer> | null = null;
let instance: WebContainer | null = null;
let snapshot: WCSnapshot = { status: 'idle', url: null, error: null };
const listeners = new Set<Listener>();
const logListeners = new Set<LogListener>();
let devProcessRef: { kill: () => void } | null = null;
let currentProjectKey: string | null = null;

// ---------- IndexedDB snapshot cache (skips npm install on second boot) ----------
const DB_NAME = 'lovable-wc-cache';
const STORE = 'snapshots';
const SCHEMA_VERSION = 1;

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, SCHEMA_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
}

async function loadCachedSnapshot(key: string): Promise<Uint8Array | null> {
  try {
    const db = await getDB();
    const data = (await db.get(STORE, key)) as Uint8Array | undefined;
    return data ?? null;
  } catch {
    return null;
  }
}

async function saveSnapshot(key: string, data: Uint8Array): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE, data, key);
  } catch (e) {
    emitLog({ kind: 'stderr', line: `[wc] cache save failed: ${e}` });
  }
}

export async function clearWCCache(projectKey?: string): Promise<void> {
  try {
    const db = await getDB();
    if (projectKey) await db.delete(STORE, projectKey);
    else await db.clear(STORE);
    emitLog({ kind: 'system', line: `[wc] cache cleared${projectKey ? ` for ${projectKey}` : ''}` });
  } catch {
    /* ignore */
  }
}

function setSnapshot(patch: Partial<WCSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const l of listeners) {
    try {
      l(snapshot);
    } catch {
      /* ignore */
    }
  }
}

function emitLog(log: Omit<WCLog, 'ts'>) {
  const full: WCLog = { ...log, ts: Date.now() };
  for (const l of logListeners) {
    try {
      l(full);
    } catch {
      /* ignore */
    }
  }
}

export function getWCSnapshot(): WCSnapshot {
  return snapshot;
}

export function subscribeWC(cb: Listener): () => void {
  listeners.add(cb);
  cb(snapshot);
  return () => listeners.delete(cb);
}

export function subscribeWCLogs(cb: LogListener): () => void {
  logListeners.add(cb);
  return () => logListeners.delete(cb);
}

/**
 * Convert the flat `GeneratedFile[]` (paths like `src/App.tsx`) into the
 * nested `FileSystemTree` structure that `WebContainer.mount()` expects.
 */
function toFileSystemTree(files: { path: string; content: string }[]): FileSystemTree {
  const root: FileSystemTree = {};
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let cursor: FileSystemTree = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      const existing = cursor[seg];
      if (!existing || !('directory' in existing)) {
        cursor[seg] = { directory: {} };
      }
      cursor = (cursor[seg] as { directory: FileSystemTree }).directory;
    }
    const fileName = parts[parts.length - 1];
    cursor[fileName] = {
      file: { contents: file.content },
    };
  }
  return root;
}

async function boot(): Promise<WebContainer> {
  if (instance) return instance;
  if (bootPromise) return bootPromise;
  setSnapshot({ status: 'booting', error: null });
  emitLog({ kind: 'system', line: '[wc] booting WebContainer runtime…' });
  const { WebContainer } = await import('@webcontainer/api');
  bootPromise = WebContainer.boot({ coep: 'require-corp' }).then((wc) => {
    instance = wc;
    return wc;
  });
  return bootPromise;
}

async function streamProcess(
  proc: { output: ReadableStream<string>; exit: Promise<number> },
  prefix: string,
): Promise<number> {
  const reader = proc.output.getReader();
  // Decode the streaming output line-by-line so the UI scrolls naturally.
  let buf = '';
  const pump = async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).replace(/\r$/, '');
        buf = buf.slice(idx + 1);
        if (line.length) emitLog({ kind: 'stdout', line: `${prefix} ${line}` });
      }
    }
    if (buf.length) emitLog({ kind: 'stdout', line: `${prefix} ${buf}` });
  };
  pump().catch((e) => emitLog({ kind: 'stderr', line: `${prefix} stream error: ${e}` }));
  return proc.exit;
}

/**
 * Boot + mount + install + run dev server. Returns when the dev server
 * emits its `server-ready` event with a public URL.
 */
export async function startWebContainer(
  projectName: string,
  files: GeneratedFile[],
  projectId?: string,
): Promise<{ url: string }> {
  try {
    const wc = await boot();
    const cacheKey = projectId ? `proj:${projectId}` : `name:${projectName}`;
    currentProjectKey = cacheKey;

    setSnapshot({ status: 'mounting', error: null });
    const cached = await loadCachedSnapshot(cacheKey);
    if (cached) {
      emitLog({ kind: 'system', line: `[wc] restoring cached snapshot (${(cached.byteLength / 1024 / 1024).toFixed(1)} MB) — skipping npm install` });
      // The WebContainer.mount API accepts a Uint8Array snapshot when isSnapshot:true is implied via type.
      await wc.mount(cached as unknown as ArrayBuffer);
      // Overwrite user src with latest files so edits are reflected
      const scaffold = buildScaffoldFiles(projectName, files);
      for (const f of scaffold) {
        const dir = f.path.split('/').slice(0, -1).join('/');
        if (dir) await wc.fs.mkdir(dir, { recursive: true }).catch(() => {});
        await wc.fs.writeFile(f.path, f.content).catch(() => {});
      }
    } else {
      emitLog({ kind: 'system', line: '[wc] mounting Vite scaffold + user files…' });
      const scaffold = buildScaffoldFiles(projectName, files);
      const tree = toFileSystemTree(scaffold);
      await wc.mount(tree);

      setSnapshot({ status: 'installing' });
      emitLog({ kind: 'system', line: '[wc] running `npm install`…' });
      const install = await wc.spawn('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error']);
      const exitCode = await streamProcess(install, '[npm]');
      if (exitCode !== 0) {
        throw new Error(`npm install exited with code ${exitCode}`);
      }
      // Snapshot AFTER install completes — captures node_modules
      try {
        emitLog({ kind: 'system', line: '[wc] saving snapshot to IndexedDB for future boots…' });
        const exported = await (wc as unknown as { export: (path: string, options?: { format?: string }) => Promise<Uint8Array> }).export('.', { format: 'binary' });
        await saveSnapshot(cacheKey, exported);
        emitLog({ kind: 'system', line: `[wc] snapshot cached (${(exported.byteLength / 1024 / 1024).toFixed(1)} MB)` });
      } catch (e) {
        emitLog({ kind: 'stderr', line: `[wc] snapshot export failed (continuing without cache): ${e}` });
      }
    }

    setSnapshot({ status: 'starting' });
    emitLog({ kind: 'system', line: '[wc] starting dev server…' });
    // Pre-register listener BEFORE spawning so we don't miss the event.
    const urlPromise = new Promise<string>((resolve) => {
      wc.on('server-ready', (_port, url) => resolve(url));
    });
    const dev = await wc.spawn('npm', ['run', 'dev', '--', '--host']);
    devProcessRef = { kill: () => dev.kill() };
    streamProcess(dev, '[vite]').catch(() => {});

    const url = await urlPromise;
    setSnapshot({ status: 'ready', url });
    emitLog({ kind: 'system', line: `[wc] ready · ${url}` });
    return { url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setSnapshot({ status: 'error', error: msg });
    emitLog({ kind: 'stderr', line: `[wc] ${msg}` });
    throw e;
  }
}

/**
 * Hot-update the user's source files without restarting the dev server.
 * Vite picks up changes via fs.watch inside the WebContainer.
 */
export async function writeFiles(
  projectName: string,
  files: GeneratedFile[],
): Promise<void> {
  if (!instance) return;
  emitLog({ kind: 'system', line: `[wc] hot-updating ${files.length} file(s)…` });
  // Re-run the scaffold builder so any new dependency in package.json is also
  // reflected — but we only write the files that changed (full mount would
  // restart Vite and undo HMR).
  const scaffold = buildScaffoldFiles(projectName, files);
  for (const f of scaffold) {
    try {
      // Make sure parent dirs exist
      const dir = f.path.split('/').slice(0, -1).join('/');
      if (dir) await instance.fs.mkdir(dir, { recursive: true }).catch(() => {});
      await instance.fs.writeFile(f.path, f.content);
    } catch (e) {
      emitLog({ kind: 'stderr', line: `[wc] write ${f.path}: ${e}` });
    }
  }
}

export async function teardownWebContainer(): Promise<void> {
  try {
    devProcessRef?.kill();
  } catch {
    /* ignore */
  }
  devProcessRef = null;
  currentProjectKey = null;
  if (instance) {
    try {
      // teardown() exists on @webcontainer/api ≥1.0
      (instance as unknown as { teardown?: () => void }).teardown?.();
    } catch {
      /* ignore */
    }
  }
  instance = null;
  bootPromise = null;
  setSnapshot({ status: 'idle', url: null, error: null });
  emitLog({ kind: 'system', line: '[wc] torn down' });
}

/**
 * Spawn an interactive shell (jsh) bound to a TTY of the given size.
 * Returns the process so the caller can pipe input/output to xterm.
 */
export async function spawnInteractiveShell(cols: number, rows: number) {
  if (!instance) throw new Error('WebContainer not booted');
  const proc = await instance.spawn('jsh', { terminal: { cols, rows } });
  return proc;
}

export function getCurrentProjectKey(): string | null {
  return currentProjectKey;
}

/**
 * Recursive file-tree listing of the WebContainer filesystem.
 * Used by the file explorer panel to surface the *real* state (including
 * node_modules, dist, generated artifacts, etc).
 */
export interface WCFsNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: WCFsNode[];
}

export async function listWCDir(path = '/'): Promise<WCFsNode[]> {
  if (!instance) return [];
  try {
    const entries = await instance.fs.readdir(path, { withFileTypes: true });
    return entries
      .map((e) => ({
        name: e.name,
        path: path === '/' ? `/${e.name}` : `${path}/${e.name}`,
        isDir: e.isDirectory(),
      }))
      .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function readWCFile(path: string): Promise<string | null> {
  if (!instance) return null;
  try {
    return await instance.fs.readFile(path, 'utf-8');
  } catch {
    return null;
  }
}