import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addFile, addVolume, createNote, fileUrl, listBooks, openBook, removeBook, updateBook } from '../library/api'
import { folderUpload, formatSize, refusalText, spineFor } from '../library/books'
import { townAddress } from '../world/places'
import '../styles/Library.css'

const SAVE_DELAY_MS = 700
const KIND_NAME = { note: 'Note', file: 'Book', volume: 'Volume' }

function Overlay({ label, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="library-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="library-dialog" role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="library-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {children}
      </div>
    </div>
  )
}

function TitleField({ book, onRename }) {
  const [draft, setDraft] = useState(book.title)
  useEffect(() => setDraft(book.title), [book.title])

  const finish = () => {
    const title = draft.replace(/\s+/g, ' ').trim()
    if (!title) setDraft(book.title)
    else if (title !== book.title) onRename(title)
  }

  return (
    <input
      className="library-title-input"
      value={draft}
      maxLength={120}
      aria-label="Title"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

function NoteEditor({ book, onSaved }) {
  const [text, setText] = useState(null)
  const [state, setState] = useState('loading')
  const pending = useRef(null)
  const timer = useRef(null)

  const chain = useRef(Promise.resolve())

  // Saves run one after another so an older save can never land after a newer one.
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    chain.current = chain.current.then(async () => {
      const value = pending.current
      if (value === null) return
      pending.current = null
      setState('saving')
      const result = await updateBook(book.id, { text: value })
      if (result.ok) onSaved(result.book)
      setState(pending.current !== null ? 'editing' : result.ok ? 'saved' : 'failed')
    })
    return chain.current
  }, [book.id, onSaved])

  useEffect(() => {
    let active = true
    openBook(book.id).then((result) => {
      if (!active) return
      if (!result.ok) return setState('failed-load')
      setText(result.text)
      setState('saved')
    })
    return () => {
      active = false
    }
  }, [book.id])

  useEffect(() => () => {
    flush()
  }, [flush])

  if (state === 'failed-load') return <p className="library-note">Couldn't open this note.</p>
  if (text === null) return <p className="library-note">Opening…</p>

  const label = { editing: 'Editing…', saving: 'Saving…', saved: 'Saved', failed: "Couldn't save. Keep typing to retry." }[state]

  return (
    <>
      <textarea
        className="library-page"
        value={text}
        autoFocus
        aria-label="Note text"
        placeholder="Start writing…"
        onChange={(event) => {
          setText(event.target.value)
          pending.current = event.target.value
          setState('editing')
          clearTimeout(timer.current)
          timer.current = setTimeout(flush, SAVE_DELAY_MS)
        }}
        onBlur={flush}
      />
      <p className="library-note" aria-live="polite">{label}</p>
    </>
  )
}

function FileView({ book }) {
  const isImage = book.mime.startsWith('image/')
  return (
    <>
      <p className="library-note">{book.fileName} · {formatSize(book.size)}</p>
      {isImage && <img className="library-preview" src={fileUrl(book.id)} alt={book.title} />}
      <p className="library-actions">
        <a href={fileUrl(book.id)} target="_blank" rel="noreferrer">Open</a>
        <a href={fileUrl(book.id, { download: true })}>Download</a>
      </p>
    </>
  )
}

function VolumeView({ book }) {
  const [files, setFiles] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    openBook(book.id).then((result) => {
      if (!active) return
      if (result.ok) setFiles(result.files)
      else setFailed(true)
    })
    return () => {
      active = false
    }
  }, [book.id])

  return (
    <>
      <p className="library-note">{book.fileCount} {book.fileCount === 1 ? 'file' : 'files'} · {formatSize(book.size)}</p>
      {failed && <p className="library-note">Couldn't open this volume.</p>}
      {!files && !failed && <p className="library-note">Opening…</p>}
      {files && (
        <ul className="library-contents">
          {files.map((file) => (
            <li key={file.path}>
              <a href={fileUrl(book.id, { path: file.path })} target="_blank" rel="noreferrer">{file.path}</a>
              <span>{formatSize(file.size)}</span>
              <a href={fileUrl(book.id, { path: file.path, download: true })} aria-label={`Download ${file.path}`}>↓</a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Reader({ book, onClose, onChanged, onRemoved, onNotice }) {
  const rename = async (title) => {
    const result = await updateBook(book.id, { title })
    if (result.ok) onChanged(result.book)
    else onNotice(refusalText(result.reason))
  }

  const remove = async () => {
    if (!window.confirm(`Take "${book.title}" off the shelf? This deletes it for good.`)) return
    const result = await removeBook(book.id)
    if (result.ok) onRemoved(book.id)
    else onNotice(refusalText(result.reason))
  }

  return (
    <Overlay label={book.title} onClose={onClose}>
      <p className="library-kind">{KIND_NAME[book.kind]}</p>
      <TitleField book={book} onRename={rename} />
      {book.kind === 'note' && <NoteEditor book={book} onSaved={onChanged} />}
      {book.kind === 'file' && <FileView book={book} />}
      {book.kind === 'volume' && <VolumeView book={book} />}
      <button type="button" className="library-remove" onClick={remove}>Remove from shelf</button>
    </Overlay>
  )
}

function AddMenu({ onClose, onWrite, onPickFile, onPickFolder }) {
  return (
    <Overlay label="Add to the shelf" onClose={onClose}>
      <h2>Add to the shelf</h2>
      <div className="library-choices">
        <button type="button" onClick={onWrite}>
          <strong>Create a book</strong>
          <span>Start a new note and write in it</span>
        </button>
        <button type="button" onClick={onPickFile}>
          <strong>Add a book</strong>
          <span>Upload a file</span>
        </button>
        <button type="button" onClick={onPickFolder}>
          <strong>Add a volume</strong>
          <span>Upload a folder</span>
        </button>
      </div>
    </Overlay>
  )
}

function Spine({ book, onOpen }) {
  const { width, height, hue } = spineFor(book)
  return (
    <button
      type="button"
      className={`library-book library-book-${book.kind}`}
      style={{ width, height, '--spine-hue': hue }}
      onClick={(event) => {
        event.stopPropagation()
        onOpen(book.id)
      }}
      title={book.title}
      aria-label={`${KIND_NAME[book.kind]}: ${book.title}`}
    >
      <span>{book.title}</span>
    </button>
  )
}

export default function Library() {
  const navigate = useNavigate()
  const [books, setBooks] = useState(null)
  const [offline, setOffline] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const fileInput = useRef(null)
  const folderInput = useRef(null)

  useEffect(() => {
    let active = true
    listBooks().then((result) => {
      if (!active) return
      if (result.ok) setBooks(result.books)
      else setOffline(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  // webkitdirectory is not a React prop, so it is set on the element directly.
  useEffect(() => {
    folderInput.current?.setAttribute('webkitdirectory', '')
  }, [])

  const shelve = (book) => setBooks((list) => [...list, book])
  const changed = useCallback((book) => setBooks((list) => list.map((item) => (item.id === book.id ? book : item))), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closeReader = useCallback(() => setOpenId(null), [])

  const write = async () => {
    setMenuOpen(false)
    const result = await createNote('Untitled')
    if (!result.ok) return setNotice(refusalText(result.reason))
    shelve(result.book)
    setOpenId(result.book.id)
  }

  const runUpload = async (label, send) => {
    setBusy({ label, progress: 0 })
    const result = await send((progress) => setBusy({ label, progress }))
    setBusy(null)
    if (!result.ok) return setNotice(refusalText(result.reason))
    shelve(result.book)
  }

  const pickedFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) runUpload(`Shelving ${file.name}`, (progress) => addFile(file, progress))
  }

  const pickedFolder = (event) => {
    const volume = folderUpload(event.target.files || [])
    event.target.value = ''
    if (!volume.entries.length) return setNotice(refusalText('empty-volume'))
    const title = volume.title || 'Volume'
    runUpload(`Shelving ${title}`, (progress) => addVolume({ ...volume, title }, progress))
  }

  const pick = (input) => {
    setMenuOpen(false)
    input.current?.click()
  }

  const openBookData = books?.find((book) => book.id === openId)

  return (
    <div className="library">
      <header className="library-top">
        <button type="button" className="library-back" onClick={() => navigate(townAddress('library'))} aria-label="Back to town">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <h1>Library</h1>
        <p className="library-status">
          {offline ? "Can't reach the library right now" : books === null ? 'Opening the doors…' : `${books.length} ${books.length === 1 ? 'book' : 'books'} on the shelf`}
        </p>
      </header>

      <main className="library-room">
        {books && (
          <section
            className="library-shelf"
            onClick={() => setMenuOpen(true)}
            aria-label="Bookshelf"
          >
            {books.map((book) => <Spine key={book.id} book={book} onOpen={setOpenId} />)}
            <button
              type="button"
              className="library-add"
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen(true)
              }}
              aria-label="Add to the shelf"
            >
              +
            </button>
          </section>
        )}
        {books?.length === 0 && <p className="library-hint">The shelf is empty. Click it to add your first book.</p>}
      </main>

      {busy && (
        <div className="library-busy" role="status">
          {busy.label} · {Math.round(busy.progress * 100)}%
        </div>
      )}
      {notice && <div className="library-notice" role="alert">{notice}</div>}

      <input ref={fileInput} type="file" hidden onChange={pickedFile} />
      <input ref={folderInput} type="file" hidden multiple onChange={pickedFolder} />

      {menuOpen && (
        <AddMenu
          onClose={closeMenu}
          onWrite={write}
          onPickFile={() => pick(fileInput)}
          onPickFolder={() => pick(folderInput)}
        />
      )}
      {openBookData && (
        <Reader
          key={openBookData.id}
          book={openBookData}
          onClose={closeReader}
          onChanged={changed}
          onRemoved={(id) => {
            setOpenId(null)
            setBooks((list) => list.filter((book) => book.id !== id))
          }}
          onNotice={setNotice}
        />
      )}
    </div>
  )
}
