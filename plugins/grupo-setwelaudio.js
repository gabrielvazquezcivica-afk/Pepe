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

async function esAdmin(sock, chat, sender) {
  const metadata = await sock.groupMetadata(chat)
  const normalizar = jid => String(jid || '').replace(/:\d+@/, '@')

  const participante = metadata.participants.find(p =>
    [p.id, p.jid, p.lid]
      .filter(Boolean)
      .some(id => normalizar(id) === normalizar(sender))
  )

  return ['admin', 'superadmin'].includes(participante?.admin)
}

const handler = {}

handler.run = async (sock, m, args) => {
  if (!m.isGroup) {
    return m.reply('> ❌ Este comando solo funciona en grupos.')
  }

  if (!(await esAdmin(sock, m.chat, m.sender))) {
    return m.reply('> ⛔ Solo los administradores pueden usar este comando.')
  }

  const db = cargarDB()
  db[m.chat] ??= {}

  // Opción 1: guardar una URL
  const url = args.join(' ').trim()

  if (url) {
    try {
      const enlace = new URL(url)

      if (!['http:', 'https:'].includes(enlace.protocol)) {
        throw new Error('Protocolo inválido')
      }

      db[m.chat].welcomeAudio = url
      delete db[m.chat].welcomeAudioFile
      guardarDB(db)

      return m.reply('> ✅ URL del audio de bienvenida guardada correctamente.')
    } catch {
      return m.reply('> ❌ La URL no es válida.')
    }
  }

  // Opción 2: guardar un audio respondido
  const citado = m.quoted

  if (!citado) {
    return m.reply(
      '> ⚙️ ¿Cómo configurar el audio?\n\n' +
      '> 1. Responde a un audio con .setwelaudio\n' +
      '> 2. O utiliza una URL:\n' +
      '> .setwelaudio https://ejemplo.com/audio.mp3'
    )
  }

  const mensaje = citado.message || {}
  const contenido = mensaje.audioMessage
    ? mensaje
    : mensaje.ephemeralMessage?.message || mensaje

  if (!contenido.audioMessage) {
    return m.reply('> ❌ Debes responder a un mensaje que contenga un audio.')
  }

  try {
    fs.mkdirSync(AUDIO_DIR, { recursive: true })

    const buffer = await downloadMediaMessage(
      citado,
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    )

    if (!buffer || !buffer.length) {
      throw new Error('Audio vacío')
    }

    const archivo = path.join(
      AUDIO_DIR,
      `welcome-${m.chat.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
    )

    fs.writeFileSync(archivo, buffer)

    db[m.chat].welcomeAudioFile = archivo
    delete db[m.chat].welcomeAudio
    guardarDB(db)

    return m.reply('> ✅ Audio de bienvenida guardado correctamente.')
  } catch (error) {
    console.error('Error guardando audio:', error)
    return m.reply('> ❌ No se pudo guardar el audio. Intenta responder nuevamente al archivo.')
  }
}

handler.command = ['setwelaudio']
handler.help = ['setwelaudio']
handler.tags = ['grupo']
handler.menu = true

export default handler