
import fs from 'node:fs'
import path from 'node:path'
import { sendButtons } from 'baileys-buttons'

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, 'antilink.json')

const DETECTAR_LINK =
  /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i

const handler = {}

function iniciarDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '{}')
  }
}

function cargarDB() {
  iniciarDB()

  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function guardarDB(db) {
  iniciarDB()
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

const normalizar = jid =>
  String(jid || '').replace(/:\d+@/, '@').trim()

function esAdmin(participante) {
  return ['admin', 'superadmin'].includes(participante?.admin)
}

function buscar(participantes, identificadores = []) {
  const ids = identificadores.filter(Boolean).map(normalizar)

  return participantes.find(p =>
    [p.id, p.jid, p.lid]
      .filter(Boolean)
      .map(normalizar)
      .some(id => ids.includes(id))
  )
}

function obtenerIdsUsuario(m) {
  return [
    m.key?.participant,
    m.key?.participantAlt,
    m.participant,
    m.sender,
    m.senderLid
  ]
}

function obtenerInfoBot(sock) {
  const botId = sock.user?.id || ''
  const botNumero = botId.split(':')[0].split('@')[0]

  return [
    botId,
    sock.user?.lid,
    `${botNumero}@s.whatsapp.net`
  ]
}

async function obtenerParticipantes(sock, chat) {
  const metadata = await sock.groupMetadata(chat)
  return metadata.participants || []
}

async function esAdminUsuario(sock, chat, m) {
  const participantes = await obtenerParticipantes(sock, chat)
  const usuario = buscar(participantes, obtenerIdsUsuario(m))

  return esAdmin(usuario)
}

async function esAdminBot(sock, chat) {
  const participantes = await obtenerParticipantes(sock, chat)
  const bot = buscar(participantes, obtenerInfoBot(sock))

  return esAdmin(bot)
}

async function cambiarEstado(sock, m, estado) {
  if (!m.isGroup) {
    return m.reply('> ⚠️ Este comando solo funciona en grupos.')
  }

  try {
    if (!(await esAdminUsuario(sock, m.chat, m))) {
      return m.reply('> ❌ Solo los administradores pueden cambiar el antilink.')
    }

    if (!(await esAdminBot(sock, m.chat))) {
      return m.reply('> ⚠️ Necesito ser administrador para administrar los mensajes.')
    }

    const db = cargarDB()
    db[m.chat] = estado
    guardarDB(db)

    return m.reply(
      estado
        ? '> ✅ El antilink ha sido activado.\n> 🚫 Los usuarios no administradores no podrán enviar enlaces.'
        : '> ✅ El antilink ha sido desactivado.'
    )
  } catch (error) {
    console.error('[ANTILINK ESTADO]', error)
    return m.reply('> ❌ No pude cambiar el estado del antilink.')
  }
}

handler.run = async (sock, m) => {
  if (!m.isGroup) {
    return m.reply('> ⚠️ Este comando solo funciona en grupos.')
  }

  const comando = (
    m.command ||
    m.textCommand?.split(/\s+/)[0]?.replace(/^[.!/#]+/, '') ||
    ''
  ).toLowerCase()

  if (comando === 'antilink_on') {
    return cambiarEstado(sock, m, true)
  }

  if (comando === 'antilink_off') {
    return cambiarEstado(sock, m, false)
  }

  try {
    if (!(await esAdminUsuario(sock, m.chat, m))) {
      return m.reply('> ❌ Solo los administradores pueden configurar el antilink.')
    }

    await sendButtons(
      sock,
      m.chat,
      '> 🛡️ *SISTEMA ANTILINK*\n\n> ¿Qué deseas hacer?\n\n> 🟢 Encender el antilink\n> 🔴 Apagar el antilink',
      [
        { buttonId: '.antilink_on', buttonText: { displayText: '🟢 Encender' }, type: 1 },
        { buttonId: '.antilink_off', buttonText: { displayText: '🔴 Apagar' }, type: 1 }
      ],
      { quoted: m }
    )
  } catch (error) {
    console.error('[ANTILINK MENU]', error)
    return m.reply('> ❌ No pude mostrar el menú del antilink.')
  }
}

// Detector de enlaces: se ejecuta con TODOS los mensajes.
handler.all = async (sock, m) => {
  if (!m.isGroup || m.fromMe) return

  const db = cargarDB()
  if (db[m.chat] !== true) return

  const texto = String(m.text || '')
  if (!texto || !DETECTAR_LINK.test(texto)) return

  try {
    // Los administradores pueden enviar enlaces.
    if (await esAdminUsuario(sock, m.chat, m)) return

    // El bot necesita ser administrador para borrar mensajes.
    if (!(await esAdminBot(sock, m.chat))) return

    await sock.sendMessage(m.chat, {
      delete: m.key
    })

    await sock.sendMessage(
      m.chat,
      {
        text: '> ⚠️ *SISTEMA ANTILINK*\n\n> 🚫 No puedes enviar enlaces en este grupo.\n> 👮 Respeta las reglas del grupo.',
        contextInfo: {
          isForwarded: true,
          forwardingScore: 1
        }
      },
      { quoted: m }
    )
  } catch (error) {
    console.error('[ANTILINK DETECTOR]', error)
  }
}

handler.command = ['antilink', 'antilink_on', 'antilink_off']
handler.help = ['antilink']
handler.tags = ['on-off']
handler.menu = true

export default handler
