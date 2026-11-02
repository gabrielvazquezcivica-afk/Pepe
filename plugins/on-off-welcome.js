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
  const normalizar = jid => String(jid || '').replace(/:\d+@/, '@')
  const ids = [sender, globalThis?.senderLid].filter(Boolean).map(normalizar)

  const participante = metadata.participants.find(p =>
    [p.id, p.jid, p.lid].filter(Boolean).some(id => ids.includes(normalizar(id)))
  )

  return ['admin', 'superadmin'].includes(participante?.admin)
}

const handler = {}

handler.run = async (sock, m, args) => {
  if (!m.isGroup) return m.reply('> ❌ Este comando solo funciona en grupos.')

  if (!(await esAdmin(sock, m.chat, m.sender))) {
    return m.reply('> ⛔ Solo los administradores pueden usar este comando.')
  }

  const opcion = args[0]?.toLowerCase()

  if (!['on', 'off'].includes(opcion)) {
    return m.reply('> ⚙️ Usa:\n> .welcome on\n> .welcome off')
  }

  const db = cargarDB()
  db[m.chat] ??= {}
  db[m.chat].welcome = opcion === 'on'
  guardarDB(db)

  return m.reply(
    opcion === 'on'
      ? '> ✅ Bienvenida activada correctamente.'
      : '> 🔕 Bienvenida desactivada correctamente.'
  )
}

handler.command = ['welcome']
handler.help = ['welcome on/off']
handler.tags = ['on-off']
handler.menu = true

export default handler