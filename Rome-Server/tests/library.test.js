import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import { MAX_TITLE, cleanRelativePath, cleanTitle, createLibrary } from '../library.js';
import { createLibraryRouter } from '../libraryRoutes.js';

const roots = [];
after(() => Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))));

async function serve({ maxUploadBytes } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'rome-library-'));
  roots.push(root);
  let time = Date.UTC(2026, 10, 7, 12);
  let count = 0;
  const library = createLibrary({ root, now: () => (time += 1000), newId: () => `book-${++count}` });
  const app = express();
  app.use('/api/library', createLibraryRouter(library, { uploadDir: path.join(root, 'uploads'), maxUploadBytes }));
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  after(() => server.close());
  const base = `http://localhost:${server.address().port}/api/library`;
  const call = async (method, route, body) => {
    const init = { method };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers = { 'Content-Type': 'application/json' };
    }
    const response = await fetch(base + route, init);
    const type = response.headers.get('content-type') || '';
    return { status: response.status, headers: response.headers, body: type.includes('json') ? await response.json() : await response.text() };
  };
  return { root, library, call, reopen: () => createLibrary({ root }) };
}

const fileForm = (fields, files) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  for (const [field, text, type = 'text/plain'] of files) form.append(field, new Blob([text], { type }), 'upload');
  return form;
};

test('titles and paths are cleaned before they reach the disk', () => {
  assert.equal(cleanTitle('  My   notes \n'), 'My notes');
  assert.equal(cleanTitle('   '), null);
  assert.equal(cleanTitle(42), null);
  assert.equal(cleanTitle('x'.repeat(500)).length, MAX_TITLE);
  assert.equal(cleanRelativePath('a\\b//c.txt'), 'a/b/c.txt');
  for (const bad of ['../x', 'a/../../x', './x', '', 'a/b\0c', 'C:/x', 7]) assert.equal(cleanRelativePath(bad), null, String(bad));
});

test('a new note starts empty, can be written in, and is still there after a restart', async () => {
  const { call, reopen } = await serve();
  const created = await call('POST', '/notes', { title: '  Field notes ' });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.book, { id: 'book-1', kind: 'note', title: 'Field notes', size: 0, createdAt: created.body.book.createdAt, updatedAt: created.body.book.createdAt });

  const saved = await call('PATCH', '/books/book-1', { text: 'Veni, vidi, vici. ✍️' });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.book.size, Buffer.byteLength('Veni, vidi, vici. ✍️'));
  assert.ok(saved.body.book.updatedAt > created.body.book.updatedAt);

  const opened = await reopen().open('book-1');
  assert.equal(opened.text, 'Veni, vidi, vici. ✍️');
  assert.equal(opened.book.title, 'Field notes');
});

test('a note with no title is Untitled, and a rename needs a real title', async () => {
  const { call } = await serve();
  assert.equal((await call('POST', '/notes', {})).body.book.title, 'Untitled');
  assert.deepEqual((await call('PATCH', '/books/book-1', { title: '  ' })).body, { error: 'bad-title' });
  assert.equal((await call('PATCH', '/books/book-1', { title: 'Plans' })).body.book.title, 'Plans');
  assert.equal((await call('PATCH', '/books/book-1', { text: 5 })).status, 400);
});

test('an uploaded file becomes a book named after the file and can be opened again', async () => {
  const { call } = await serve();
  const form = fileForm({ fileName: 'Résumé de César.txt' }, [['file', 'Gallia est omnis divisa']]);
  const added = await call('POST', '/files', form);
  assert.equal(added.status, 201);
  assert.equal(added.body.book.kind, 'file');
  assert.equal(added.body.book.title, 'Résumé de César');
  assert.equal(added.body.book.fileName, 'Résumé de César.txt');
  assert.equal(added.body.book.size, 23);

  const read = await call('GET', '/books/book-1/file');
  assert.equal(read.body, 'Gallia est omnis divisa');
  assert.equal(read.headers.get('content-security-policy'), 'sandbox');
  assert.match(read.headers.get('content-disposition'), /^inline/);
  assert.match((await call('GET', '/books/book-1/file?download=1')).headers.get('content-disposition'), /^attachment/);
  assert.equal((await call('PATCH', '/books/book-1', { text: 'no' })).body.error, 'not-a-note');
});

test('a file with an unsafe name is turned away and leaves nothing behind', async () => {
  const { call, root } = await serve();
  const refused = await call('POST', '/files', fileForm({ fileName: '../escape.txt' }, [['file', 'x']]));
  assert.deepEqual(refused.body, { error: 'bad-name' });
  assert.deepEqual(await readdir(path.join(root, 'uploads')), []);
  assert.deepEqual((await call('GET', '/books')).body.books, []);
  assert.deepEqual((await call('POST', '/files', fileForm({ fileName: 'a.txt' }, []))).body, { error: 'no-upload' });
});

test('a folder becomes a volume that keeps its inner paths', async () => {
  const { call } = await serve();
  const form = fileForm(
    { title: 'Commentaries', paths: JSON.stringify(['book1/intro.txt', 'book1/war/ch1.md', 'cover.png']) },
    [['files', 'intro'], ['files', '# Chapter one'], ['files', 'png', 'image/png']],
  );
  const added = await call('POST', '/volumes', form);
  assert.equal(added.status, 201);
  assert.equal(added.body.book.kind, 'volume');
  assert.equal(added.body.book.fileCount, 3);
  assert.equal(added.body.book.size, 21);

  const opened = await call('GET', '/books/book-1');
  assert.deepEqual(opened.body.files.map((file) => file.path), ['book1/intro.txt', 'book1/war/ch1.md', 'cover.png']);
  assert.equal((await call('GET', `/books/book-1/file?path=${encodeURIComponent('book1/war/ch1.md')}`)).body, '# Chapter one');
  assert.equal((await call('GET', `/books/book-1/file?path=${encodeURIComponent('../index.json')}`)).status, 404);
  assert.equal((await call('GET', '/books/book-1/file?path=missing.txt')).status, 404);
});

test('a volume with bad, clashing, or missing paths is refused and cleaned up', async () => {
  const { call, root } = await serve();
  const tries = [
    [{ title: 'V', paths: JSON.stringify(['a.txt', '../b.txt']) }, 'bad-path'],
    [{ title: 'V', paths: JSON.stringify(['a.txt', 'A.TXT']) }, 'duplicate-path'],
    [{ title: 'V', paths: JSON.stringify(['a.txt']) }, 'bad-paths'],
    [{ title: 'V', paths: 'nope' }, 'bad-paths'],
    [{ title: ' ', paths: JSON.stringify(['a.txt', 'b.txt']) }, 'bad-title'],
  ];
  for (const [fields, reason] of tries) {
    const result = await call('POST', '/volumes', fileForm(fields, [['files', 'a'], ['files', 'b']]));
    assert.deepEqual(result.body, { error: reason });
  }
  assert.deepEqual((await call('POST', '/volumes', fileForm({ title: 'V', paths: '[]' }, []))).body, { error: 'empty-volume' });
  assert.deepEqual(await readdir(path.join(root, 'uploads')), []);
  assert.deepEqual((await call('GET', '/books')).body.books, []);
});

test('uploads over the size limit are refused', async () => {
  const { call, root } = await serve({ maxUploadBytes: 10 });
  const result = await call('POST', '/files', fileForm({ fileName: 'big.txt' }, [['file', 'x'.repeat(50)]]));
  assert.equal(result.status, 413);
  assert.deepEqual(result.body, { error: 'too-big' });
  assert.deepEqual(await readdir(path.join(root, 'uploads')), []);
});

test('the shelf lists books in the order they were added, and removing one takes its files too', async () => {
  const { call, root } = await serve();
  await call('POST', '/notes', { title: 'First' });
  await call('POST', '/files', fileForm({ fileName: 'second.txt' }, [['file', '2']]));
  await call('POST', '/volumes', fileForm({ title: 'Third', paths: '["x.txt"]' }, [['files', '3']]));
  assert.deepEqual((await call('GET', '/books')).body.books.map((book) => [book.title, book.kind]), [['First', 'note'], ['second', 'file'], ['Third', 'volume']]);

  assert.equal((await call('DELETE', '/books/book-2')).status, 200);
  assert.deepEqual((await call('GET', '/books')).body.books.map((book) => book.id), ['book-1', 'book-3']);
  assert.deepEqual((await readdir(path.join(root, 'books'))).sort(), ['book-1', 'book-3']);
  assert.equal((await call('DELETE', '/books/book-2')).status, 404);
  assert.equal((await call('GET', '/books/nope!')).status, 404);
});

test('saves that land at the same time all make it into the index', async () => {
  const { library, reopen } = await serve();
  await Promise.all(['a', 'b', 'c', 'd'].map((title) => library.createNote({ title })));
  assert.deepEqual((await reopen().list()).map((book) => book.title), ['a', 'b', 'c', 'd']);
});
