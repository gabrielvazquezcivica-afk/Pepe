import fs from 'fs'
import path from 'path'

const DB_FILE = path.resolve('./database/bienvenidas.json')

function cargarDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return {}
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function guardarDB(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

const handler = {}

handler.run = async (sock, m) => {
  if (!m.isGroup) {
    return m.reply('❌ Este comando solo funciona en grupos.')
  }

  const db = cargarDB()

  if (!db[m.chat]) db[m.chat] = {}

  if (!db[m.chat].byeMessage) {
    return m.reply('⚠️ Este grupo no tiene un mensaje de despedida personalizado.')
  }

  delete db[m.chat].byeMessage
  guardarDB(db)

  await m.reply('✅ Se eliminó el mensaje personalizado de despedida. Se utilizará el mensaje predeterminado de Pepe Bot.')
}

handler.command = ['delbye']
handler.help = ['delbye']
handler.tags = ['grupo']
handler.menu = true

export default handler