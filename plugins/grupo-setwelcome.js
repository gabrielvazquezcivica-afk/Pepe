
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

  const idsSender = [
    sender,
    mSenderLid(sender)
  ].filter(Boolean).map(normalizar)

  const participante = metadata.participants.find(p =>
    [p.id, p.jid, p.lid]
      .filter(Boolean)
      .some(id => idsSender.includes(normalizar(id)))
  )

  return ['admin', 'superadmin'].includes(participante?.admin)
}

function mSenderLid(sender) {
  return sender
}

// Obtener el texto conservando los saltos de línea
function obtenerTexto(m) {
  const texto = m.text || m.body || ''

  return String(texto)
    .replace(/^[.!/#]setwelcome\b/i, '')
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
