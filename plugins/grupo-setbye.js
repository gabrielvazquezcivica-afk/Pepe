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
  const participante = metadata.participants.find(p =>
    [p.id, p.jid, p.lid].filter(Boolean).some(id => normalizar(id) === normalizar(sender))
  )
  return ['admin', 'superadmin'].includes(participante?.admin)
}

const handler = {}

handler.run = async (sock, m, args) => {
  if (!m.isGroup) return m.reply('> ❌ Este comando solo funciona en grupos.')
  if (!(await esAdmin(sock, m.chat, m.sender))) {
    return m.reply('> ⛔ Solo los administradores pueden usar este comando.')
  }

  const texto = args.join(' ').trim()
  if (!texto) {
    return m.reply('> ⚙️ Ejemplo: .setbye ¡Hasta pronto @user! @group ahora tiene @count integrantes.')
  }

  const db = cargarDB()
  db[m.chat] ??= {}
  db[m.chat].byeMessage = texto
  guardarDB(db)

  return m.reply('> ✅ Mensaje de despedida personalizado guardado.')
}

handler.command = ['setbye']
handler.help = ['setbye']
handler.tags = ['grupo']
handler.menu = true

export default handler