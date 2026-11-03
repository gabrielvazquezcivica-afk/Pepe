
import fs from 'fs'
import path from 'path'

const DB_FILE = path.resolve('./database/bienvenidas.json')

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

  const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@')

  const idsSender = [sender].filter(Boolean).map(normalizar)

  const participante = metadata.participants.find(p =>
    [p.id, p.jid, p.lid]
      .filter(Boolean)
      .some(id => idsSender.includes(normalizar(id)))
  )

  return ['admin', 'superadmin'].includes(participante?.admin)
}

function extraerTexto(message) {
  let contenido = message?.message

  while (contenido) {
    if (contenido.ephemeralMessage?.message) {
      contenido = contenido.ephemeralMessage.message
      continue
    }

    if (contenido.viewOnceMessage?.message) {
      contenido = contenido.viewOnceMessage.message
      continue
    }

    if (contenido.viewOnceMessageV2?.message) {
      contenido = contenido.viewOnceMessageV2.message
      continue
    }

    break
  }

  return (
    contenido?.extendedTextMessage?.text ??
    contenido?.conversation ??
    contenido?.imageMessage?.caption ??
    contenido?.videoMessage?.caption ??
    ''
  )
}

function obtenerTexto(m) {
  const texto = extraerTexto(m).replace(/\r\n/g, '\n')

  // Quitar únicamente el comando y su primer espacio o salto
  return texto
    .replace(/^[.!/#]setwelcome\b[ \t]*/i, '')
    .replace(/^\n/, '')
    .trim()
}

const handler = {}

handler.run = async (sock, m, args) => {
  if (!m.isGroup) {
    return m.reply('> ❌ Este comando solo funciona en grupos.')
  }

  if (!(await esAdmin(sock, m.chat, m.sender))) {
    return m.reply('> ⛔ Solo los administradores pueden usar este comando.')
  }

  const texto = obtenerTexto(m)

  if (!texto) {
    return m.reply(
      '> ⚙️ Escribe el mensaje que deseas configurar.\n' +
      '> Ejemplo:\n' +
      '> .setwelcome ¡Hola @user!\n' +
      '> Bienvenido a @group.\n' +
      '> Somos @count integrantes.'
    )
  }

  const db = cargarDB()
  db[m.chat] ??= {}
  db[m.chat].welcomeMessage = texto

  guardarDB(db)

  return m.reply('> ✅ Mensaje de bienvenida personalizado guardado.')
}

handler.command = ['setwelcome']
handler.help = ['setwelcome']
handler.tags = ['grupo']
handler.menu = true

export default handler
