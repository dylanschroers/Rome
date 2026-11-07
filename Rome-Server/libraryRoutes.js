import express from 'express';
import multer from 'multer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
export const MAX_VOLUME_FILES = 5000;

const STATUS = {
  'no-book': 404,
  'no-file': 404,
};

const send = (res, result, created = false) => {
  if (!result.ok) return res.status(STATUS[result.reason] || 400).json({ error: result.reason });
  res.status(created ? 201 : 200).json(result);
};

// Express 4 does not pass rejected promises on to the error handler.
const handle = (task) => (req, res, next) => task(req, res).catch(next);

const readPaths = (raw) => {
  try {
    const paths = JSON.parse(raw);
    return Array.isArray(paths) ? paths : null;
  } catch {
    return null;
  }
};

export function createLibraryRouter(library, { uploadDir, maxUploadBytes = MAX_UPLOAD_BYTES, maxVolumeFiles = MAX_VOLUME_FILES }) {
  mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    dest: uploadDir,
    limits: { fileSize: maxUploadBytes, files: maxVolumeFiles, fieldSize: 4 * 1024 * 1024 },
  });
  const asUpload = (file) => ({ tempPath: file.path, size: file.size, mime: file.mimetype });

  const router = express.Router();
  router.use(express.json({ limit: '4mb' }));

  router.get('/books', handle(async (req, res) => {
    res.json({ ok: true, books: await library.list() });
  }));

  router.get('/books/:id', handle(async (req, res) => {
    send(res, await library.open(req.params.id));
  }));

  router.post('/notes', handle(async (req, res) => {
    send(res, await library.createNote({ title: req.body?.title }), true);
  }));

  router.patch('/books/:id', handle(async (req, res) => {
    send(res, await library.update(req.params.id, { title: req.body?.title, text: req.body?.text }));
  }));

  router.delete('/books/:id', handle(async (req, res) => {
    send(res, await library.remove(req.params.id));
  }));

  // The file's name travels as a text field because multipart filenames lose non-ASCII characters.
  router.post('/files', upload.single('file'), handle(async (req, res) => {
    if (!req.file) return send(res, { ok: false, reason: 'no-upload' });
    send(res, await library.addFile({ title: req.body.title, upload: { ...asUpload(req.file), fileName: req.body.fileName } }), true);
  }));

  router.post('/volumes', upload.array('files'), handle(async (req, res) => {
    const files = req.files || [];
    const paths = readPaths(req.body.paths);
    if (!paths || paths.length !== files.length) {
      await library.discard(files.map(asUpload));
      return send(res, { ok: false, reason: 'bad-paths' });
    }
    const uploads = files.map((file, index) => ({ ...asUpload(file), path: paths[index] }));
    send(res, await library.addVolume({ title: req.body.title, uploads }), true);
  }));

  router.get('/books/:id/file', handle(async (req, res) => {
    const result = await library.locate(req.params.id, req.query.path);
    if (!result.ok) return send(res, result);
    // Uploaded pages must not run scripts on this origin when opened.
    res.set({ 'Content-Security-Policy': 'sandbox', 'X-Content-Type-Options': 'nosniff' });
    res.type(result.mime);
    res.attachment(result.name);
    if (req.query.download !== '1') res.set('Content-Disposition', res.get('Content-Disposition').replace(/^attachment/, 'inline'));
    res.sendFile(path.resolve(result.path));
  }));

  router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      const reason = error.code === 'LIMIT_FILE_SIZE' ? 'too-big' : error.code === 'LIMIT_FILE_COUNT' ? 'too-many-files' : 'bad-upload';
      return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: reason });
    }
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'too-big' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad-json' });
    next(error);
  });

  return router;
}
