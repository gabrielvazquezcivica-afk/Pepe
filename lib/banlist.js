import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.resolve('data')
const FILE = path.join(DATA_DIR, 'bans.json')

function ensureFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true })

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, '{}', 'utf8')
  }
}

export function getBans() {
  ensureFile()

  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return data && typeof data === 'object' && !Array.isArray(data)
      ? data
      : {}
  } catch {
    return {}
  }
}

export function isBanned(jid) {
  if (!jid) return false

  const bans = getBans()
  const id = String(jid)
  const number = id.split('@')[0].split(':')[0]

  return Boolean(bans[id] || bans[number])
}

export function addBan(jid, by = 'owner') {
  if (!jid) throw new Error('Falta el identificador del usuario')

  const bans = getBans()
  const id = String(jid)
  const number = id.split('@')[0].split(':')[0]

  bans[id] = {
    jid: id,
    number,
    by,
    date: new Date().toISOString()
  }

  ensureFile()
  fs.writeFileSync(FILE, JSON.stringify(bans, null, 2), 'utf8')
}

export function removeBan(jid) {
  if (!jid) return false

  const bans = getBans()
  const id = String(jid)
  const number = id.split('@')[0].split(':')[0]

  let removed = false

  for (const key of Object.keys(bans)) {
    const entry = bans[key]
    const savedJid = typeof entry === 'object' ? entry.jid : key
    const savedNumber = typeof entry === 'object'
      ? entry.number
      : key.split('@')[0].split(':')[0]

    if (
      key === id ||
      savedJid === id ||
      savedNumber === number
    ) {
      delete bans[key]
      removed = true
    }
  }

  ensureFile()
  fs.writeFileSync(FILE, JSON.stringify(bans, null, 2), 'utf8')

  return removed
}