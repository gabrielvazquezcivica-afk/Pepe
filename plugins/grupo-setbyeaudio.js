
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

  const ids = [
    sender,
    m.senderLid,
    m.key?.participantAlt,
    m.key?.participant
  ].filter(Boolean).map(normalizar)

  const participante = metadata.participants.find(p =>
    [p.id, p.jid, p.lid]
      .filter(Boolean)
      .some(id => ids.includes(normalizar(id)))
  )

  return ['admin', 'superadmin'].includes(participante?.admin)
}

// Obtener el mensaje original y comprobar que contiene audio
function obtenerMensajeCitado(citado) {
  if (!citado) return null

  const original = citado.fakeObj || citado
  let mensaje = original.message || {}

  while (
    mensaje.ephemeralMessage ||
    mensaje.viewOnceMessage ||
    mensaje.viewOnceMessageV2 ||
    mensaje.viewOnceMessageV2Extension
  ) {
    mensaje =
      mensaje.ephemeralMessage?.message ||
      mensaje.viewOnceMessage?.message ||
      mensaje.viewOnceMessageV2?.message ||
      mensaje.viewOnceMessageV2Extension?.message ||
      mensaje
  }

  if (!mensaje.audioMessage) return null

  return original
}

const handler = {}

handler.run = async (sock, m, args) => {
  if (!m.isGroup) {
    return m.reply('> ❌ Este comando solo funciona en grupos.')
  }

  if (!(await esAdmin(sock, m.chat, m.sender, m))) {
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

      db[m.chat].byeAudio = url
      delete db[m.chat].byeAudioFile

      guardarDB(db)

      return m.reply('> ✅ Audio de despedida guardado correctamente.')
    } catch {
      return m.reply('> ❌ La URL no es válida.')
    }
  }

  // Opción 2: guardar un audio respondido
  const citado = m.quoted

  if (!citado) {
    return m.reply(
      '> ⚙️ Responde directamente a un audio con .setbyeaudio\n' +
      '> También puedes proporcionar una URL.'
    )
  }

  const original = obtenerMensajeCitado(citado)

  if (!original) {
    return m.reply('> ❌ El mensaje citado no contiene un audio válido.')
  }

  try {
    fs.mkdirSync(AUDIO_DIR, { recursive: true })

    const buffer = await downloadMediaMessage(
      original,
      'buffer',
      {},
      {
        logger: console,
        reuploadRequest: sock.updateMediaMessage
      }
    )

    if (!buffer?.length) {
      throw new Error('Audio vacío')
    }

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
    console.error('Error guardando audio de despedida:', error)

    return m.reply(
      '> ❌ No se pudo descargar el audio.\n' +
      '> Intenta responder nuevamente al audio original.'
    )
  }
}

handler.command = ['setbyeaudio']
handler.help = ['setbyeaudio']
handler.tags = ['grupo']
handler.menu = true

export default handler
