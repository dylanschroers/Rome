const API = 'http://localhost:3001/api/library'

async function call(method, route, body) {
  let response
  try {
    response = await fetch(API + route, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    return { ok: false, reason: 'offline' }
  }
  const data = await response.json().catch(() => ({}))
  return response.ok ? data : { ok: false, reason: data.error || 'failed' }
}

// fetch can't report upload progress, so uploads go through XHR.
function upload(route, form, onProgress) {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest()
    request.open('POST', API + route)
    request.responseType = 'json'
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    request.onload = () => {
      const data = request.response || {}
      resolve(request.status < 300 ? data : { ok: false, reason: data.error || 'failed' })
    }
    request.onerror = () => resolve({ ok: false, reason: 'offline' })
    request.send(form)
  })
}

export const listBooks = () => call('GET', '/books')
export const openBook = (id) => call('GET', `/books/${id}`)
export const createNote = (title) => call('POST', '/notes', { title })
export const updateBook = (id, changes) => call('PATCH', `/books/${id}`, changes)
export const removeBook = (id) => call('DELETE', `/books/${id}`)

export function addFile(file, onProgress) {
  const form = new FormData()
  form.append('fileName', file.name)
  form.append('file', file)
  return upload('/files', form, onProgress)
}

export function addVolume({ title, entries }, onProgress) {
  const form = new FormData()
  form.append('title', title)
  form.append('paths', JSON.stringify(entries.map((entry) => entry.path)))
  for (const entry of entries) form.append('files', entry.file)
  return upload('/volumes', form, onProgress)
}

export function fileUrl(id, { path, download } = {}) {
  const query = new URLSearchParams()
  if (path) query.set('path', path)
  if (download) query.set('download', '1')
  const text = query.toString()
  return `${API}/books/${id}/file${text ? `?${text}` : ''}`
}
