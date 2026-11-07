const JUNK_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini'])

const SPINE = {
  note: { width: 26, height: 150 },
  file: { width: 36, height: 166 },
  volume: { width: 58, height: 192 },
}

const REFUSALS = {
  'no-book': 'That book is no longer on the shelf.',
  'too-big': 'That is too big for the shelf (200 MB per file).',
  'too-many-files': 'That folder has too many files (5,000 at most).',
  'empty-volume': 'That folder has no files in it.',
  'bad-name': "That file's name can't be shelved.",
  'bad-path': "Something in that folder has a name that can't be shelved.",
  'duplicate-path': 'That folder has two files whose names only differ in capitals.',
  'bad-title': 'A book needs a title.',
  offline: "Can't reach the library right now.",
}

export const refusalText = (reason) => REFUSALS[reason] || 'Something went wrong. Try again.'

function hashOf(text) {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.codePointAt(0)) >>> 0
  return hash
}

export function spineFor(book) {
  const base = SPINE[book.kind] || SPINE.file
  const hash = hashOf(book.id)
  return {
    width: base.width + (hash % 3) * 3,
    height: base.height - ((hash >> 3) % 4) * 6,
    hue: hash % 360,
  }
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

// A folder picked in the browser comes as files named "Folder/inner/path". The volume takes
// the folder's name, and its files keep the paths inside it.
export function folderUpload(files) {
  const all = [...files].map((file) => ({ file, parts: (file.webkitRelativePath || file.name).split('/').filter(Boolean) }))
  if (!all.length) return { title: '', entries: [] }
  const top = all[0].parts[0]
  const shared = all.every(({ parts }) => parts.length > 1 && parts[0] === top)
  const entries = all
    .filter(({ parts }) => !JUNK_FILES.has(parts[parts.length - 1]))
    .map(({ file, parts }) => ({ file, path: (shared ? parts.slice(1) : parts).join('/') }))
  return { title: shared ? top : '', entries }
}
