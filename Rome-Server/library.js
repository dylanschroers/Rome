import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export const MAX_TITLE = 120;
export const MAX_NOTE_CHARS = 1_000_000;
export const MAX_PATH_CHARS = 1024;
export const UNTITLED = 'Untitled';

const ID_PATTERN = /^[a-z0-9-]{1,64}$/;
const FORBIDDEN_NAME = /[\0-\x1f\\:*?"<>|]/;

export function cleanTitle(raw) {
  if (typeof raw !== 'string') return null;
  const title = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE).trim();
  return title || null;
}

export function cleanRelativePath(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > MAX_PATH_CHARS) return null;
  const parts = raw.replaceAll('\\', '/').split('/').filter(Boolean);
  if (!parts.length) return null;
  for (const part of parts) {
    if (part === '.' || part === '..' || FORBIDDEN_NAME.test(part)) return null;
  }
  return parts.join('/');
}

export const cleanFileName = (raw) => {
  const clean = cleanRelativePath(raw);
  return clean && !clean.includes('/') ? clean : null;
};

const titleFromFileName = (name) => cleanTitle(name.replace(/\.[^.]+$/, '')) || cleanTitle(name);

export function createLibrary({ root, now = Date.now, newId = randomUUID }) {
  const indexPath = path.join(root, 'index.json');
  const bookDir = (id) => path.join(root, 'books', id);
  const notePath = (id) => path.join(bookDir(id), 'note.md');
  const contentDir = (id) => path.join(bookDir(id), 'content');
  const manifestPath = (id) => path.join(bookDir(id), 'manifest.json');

  let books = null;
  let queue = Promise.resolve();

  // Every change runs one at a time so the index on disk never misses a write.
  const serially = (task) => {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  };

  async function load() {
    if (books) return books;
    try {
      books = JSON.parse(await readFile(indexPath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      books = [];
    }
    return books;
  }

  async function persist() {
    await mkdir(root, { recursive: true });
    const draft = `${indexPath}.${process.pid}.tmp`;
    await writeFile(draft, JSON.stringify(books, null, 2));
    await rename(draft, indexPath);
  }

  async function find(id) {
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null;
    return (await load()).find((book) => book.id === id) || null;
  }

  async function shelve(book) {
    await load();
    books.push(book);
    await persist();
    return book;
  }

  async function discard(uploads) {
    await Promise.all(uploads.map((upload) => rm(upload.tempPath, { force: true })));
  }

  return {
    async list() {
      return [...(await load())];
    },

    async open(id) {
      const book = await find(id);
      if (!book) return { ok: false, reason: 'no-book' };
      if (book.kind === 'note') return { ok: true, book, text: await readFile(notePath(id), 'utf8') };
      if (book.kind === 'volume') {
        const files = JSON.parse(await readFile(manifestPath(id), 'utf8'));
        return { ok: true, book, files };
      }
      return { ok: true, book };
    },

    createNote({ title } = {}) {
      return serially(async () => {
        const id = newId();
        const time = now();
        await mkdir(bookDir(id), { recursive: true });
        await writeFile(notePath(id), '');
        const book = { id, kind: 'note', title: cleanTitle(title) || UNTITLED, size: 0, createdAt: time, updatedAt: time };
        return { ok: true, book: await shelve(book) };
      });
    },

    update(id, { title, text } = {}) {
      return serially(async () => {
        const book = await find(id);
        if (!book) return { ok: false, reason: 'no-book' };
        if (title !== undefined && !cleanTitle(title)) return { ok: false, reason: 'bad-title' };
        if (text !== undefined) {
          if (book.kind !== 'note') return { ok: false, reason: 'not-a-note' };
          if (typeof text !== 'string' || text.length > MAX_NOTE_CHARS) return { ok: false, reason: 'bad-text' };
        }
        if (text !== undefined) {
          await writeFile(notePath(id), text);
          book.size = Buffer.byteLength(text);
        }
        if (title !== undefined) book.title = cleanTitle(title);
        book.updatedAt = now();
        await persist();
        return { ok: true, book };
      });
    },

    // upload: { tempPath, size, mime, fileName }, where tempPath is a file already on disk.
    addFile({ title, upload }) {
      return serially(async () => {
        const fileName = cleanFileName(upload?.fileName);
        if (!fileName) {
          if (upload) await discard([upload]);
          return { ok: false, reason: 'bad-name' };
        }
        const id = newId();
        const time = now();
        await mkdir(contentDir(id), { recursive: true });
        await rename(upload.tempPath, path.join(contentDir(id), fileName));
        const book = {
          id,
          kind: 'file',
          title: cleanTitle(title) || titleFromFileName(fileName),
          fileName,
          mime: upload.mime || 'application/octet-stream',
          size: upload.size,
          createdAt: time,
          updatedAt: time,
        };
        return { ok: true, book: await shelve(book) };
      });
    },

    // uploads: [{ tempPath, size, mime, path }], with paths relative to the folder.
    addVolume({ title, uploads }) {
      return serially(async () => {
        const name = cleanTitle(title);
        const paths = (uploads || []).map((upload) => cleanRelativePath(upload.path));
        const reason = !name ? 'bad-title'
          : !paths.length ? 'empty-volume'
          : paths.some((item) => !item) ? 'bad-path'
          : new Set(paths.map((item) => item.toLowerCase())).size !== paths.length ? 'duplicate-path'
          : null;
        if (reason) {
          await discard(uploads || []);
          return { ok: false, reason };
        }

        const id = newId();
        const time = now();
        const files = [];
        for (const [index, upload] of uploads.entries()) {
          const target = path.join(contentDir(id), ...paths[index].split('/'));
          await mkdir(path.dirname(target), { recursive: true });
          await rename(upload.tempPath, target);
          files.push({ path: paths[index], size: upload.size, mime: upload.mime || 'application/octet-stream' });
        }
        files.sort((a, b) => a.path.localeCompare(b.path));
        await writeFile(manifestPath(id), JSON.stringify(files));
        const size = files.reduce((total, file) => total + file.size, 0);
        const book = { id, kind: 'volume', title: name, fileCount: files.length, size, createdAt: time, updatedAt: time };
        return { ok: true, book: await shelve(book) };
      });
    },

    // Where a file book's file, or one file inside a volume, lives on disk.
    async locate(id, filePath) {
      const book = await find(id);
      if (!book) return { ok: false, reason: 'no-book' };
      if (book.kind === 'file') {
        return { ok: true, path: path.join(contentDir(id), book.fileName), name: book.fileName, mime: book.mime };
      }
      if (book.kind === 'volume') {
        const clean = cleanRelativePath(filePath);
        const files = JSON.parse(await readFile(manifestPath(id), 'utf8'));
        const file = clean && files.find((item) => item.path === clean);
        if (!file) return { ok: false, reason: 'no-file' };
        return { ok: true, path: path.join(contentDir(id), ...file.path.split('/')), name: path.basename(file.path), mime: file.mime };
      }
      return { ok: false, reason: 'no-file' };
    },

    remove(id) {
      return serially(async () => {
        const book = await find(id);
        if (!book) return { ok: false, reason: 'no-book' };
        books = books.filter((item) => item.id !== id);
        await persist();
        await rm(bookDir(id), { recursive: true, force: true });
        return { ok: true };
      });
    },

    discard,
  };
}
