
import fs from 'node:fs'
import path from 'node:path'

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
        return m.reply('> ✖️ Este comando solo funciona en grupos.')
    }

    const db = cargarDB()

    if (!db[m.chat]?.welcomeMessage) {
        return m.reply('> ⚠️ Este grupo no tiene una bienvenida personalizada.')
    }

    delete db[m.chat].welcomeMessage
    guardarDB(db)

    return m.reply(
        '> ✅ *BIENVENIDA RESTAURADA*\n\n' +
        '> Se eliminó el mensaje personalizado.\n' +
        '> Pepe Bot volverá a utilizar la bienvenida predeterminada.'
    )
}

handler.command = ['delwelcome']
handler.help = ['delwelcome']
handler.tags = ['grupo']
handler.menu = true

export default handler
