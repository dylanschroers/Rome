import assert from 'node:assert/strict'
import { test } from 'node:test'
import { folderUpload, formatSize, refusalText, spineFor } from '../../src/library/books.js'

const picked = (path) => ({ name: path.split('/').pop(), webkitRelativePath: path })

test('a picked folder becomes a volume named after it, with paths inside it', () => {
  const volume = folderUpload([picked('Notes/a.txt'), picked('Notes/sub/b.md'), picked('Notes/.DS_Store'), picked('Notes/sub/Thumbs.db')])
  assert.equal(volume.title, 'Notes')
  assert.deepEqual(volume.entries.map((entry) => entry.path), ['a.txt', 'sub/b.md'])
  assert.equal(volume.entries[0].file.name, 'a.txt')
})

test('files without a shared folder keep their full paths and no title', () => {
  const volume = folderUpload([picked('a.txt'), picked('B/c.txt')])
  assert.equal(volume.title, '')
  assert.deepEqual(volume.entries.map((entry) => entry.path), ['a.txt', 'B/c.txt'])
  assert.deepEqual(folderUpload([]), { title: '', entries: [] })
})

test('volumes stand taller and wider than books, and books than notes', () => {
  const note = spineFor({ id: 'x', kind: 'note' })
  const file = spineFor({ id: 'x', kind: 'file' })
  const volume = spineFor({ id: 'x', kind: 'volume' })
  assert.ok(note.width < file.width && file.width < volume.width)
  assert.ok(note.height < file.height && file.height < volume.height)
  assert.deepEqual(spineFor({ id: 'x', kind: 'file' }), file)
})

test('sizes read naturally', () => {
  assert.equal(formatSize(512), '512 B')
  assert.equal(formatSize(1536), '1.5 KB')
  assert.equal(formatSize(200 * 1024 * 1024), '200 MB')
  assert.equal(refusalText('nonsense'), 'Something went wrong. Try again.')
})
