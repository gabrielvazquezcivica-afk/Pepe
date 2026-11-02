import fs from 'fs'
import path from 'path'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

const DB_FILE = path.resolve('./database/bienvenidas.json')
const AUDIO_DIR = path.resolve('./database/audios')

function cargarDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function guardarDB(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

async function esAdmin(sock, chat, sender, m) {
  const metadata = await sock.groupMetadata(chat)
  const normalizar = jid => String(jid || '').replace(/:\d+@/, '@')

  const ids = [sender, m.senderLid, m.key?.participantAlt].filter(Boolean)
    .map(normalizar)

  const participante = metadata.participants.find(p =>
    [p.id, p.jid, p.lid].filter(Boolean)
      .some(id => ids.includes(normalizar(id)))
  )

  return ['admin', 'superadmin'].includes(participante?.admin)
}

const handler = {}

handler.run = async (sock, m, args) => {
  if (!m.isGroup) return m.reply('> ❌ Este comando solo funciona en grupos.')

  if (!(await esAdmin(sock, m.chat, m.sender, m))) {
    return m.reply('> ⛔ Solo los administradores pueden usar este comando.')
  }

  const db = cargarDB()
  db[m.chat] ??= {}

  const url = args.join(' ').trim()

  if (url) {
    try {
      const enlace = new URL(url)
      if (!['http:', 'https:'].includes(enlace.protocol)) throw new Error()

      db[m.chat].byeAudio = url
      delete db[m.chat].byeAudioFile
      guardarDB(db)

      return m.reply('> ✅ Audio de despedida guardado correctamente.')
    } catch {
      return m.reply('> ❌ La URL no es válida.')
    }
  }

  const citado = m.quoted
  if (!citado) {
    return m.reply('> ⚙️ Responde a un audio con .setbyeaudio o proporciona una URL.')
  }

  const mensaje = citado.message || {}
  const contenido = mensaje.ephemeralMessage?.message || mensaje

  if (!contenido.audioMessage) {
    return m.reply('> ❌ Debes responder a un mensaje de audio.')
  }

  try {
    fs.mkdirSync(AUDIO_DIR, { recursive: true })

    const buffer = await downloadMediaMessage(
      citado,
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    )

    if (!buffer?.length) throw new Error('Audio vacío')

    const archivo = path.join(
      AUDIO_DIR,
      `bye-${m.chat.replace(/[^a-zA-Z0-9]/g, '_')}.audio`
    )

    fs.writeFileSync(archivo, buffer)

    db[m.chat].byeAudioFile = archivo
    delete db[m.chat].byeAudio
    guardarDB(db)

    return m.reply('> ✅ Audio de despedida guardado correctamente.')
  } catch (error) {
    console.error(error)
    return m.reply('> ❌ No se pudo guardar el audio.')
  }
}

handler.command = ['setbyeaudio']
handler.help = ['setbyeaudio']
handler.tags = ['grupo']
handler.menu = true

export default handler