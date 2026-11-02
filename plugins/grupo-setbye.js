
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

handler.run = async (sock, m, args) => {
    if (!m.isGroup) {
        return m.reply('> ✖️ Este comando solo funciona en grupos.')
    }

    const texto = args.join(' ').trim()

    if (!texto) {
        return m.reply(
            '> ⚙️ *PERSONALIZAR DESPEDIDA*\n\n' +
            '> Ejemplo:\n' +
            '> .setbye @user ha salido de @group. Ahora somos @count integrantes.\n\n' +
            '> Variables disponibles:\n' +
            '> @user — Mención del integrante\n' +
            '> @group — Nombre del grupo\n' +
            '> @count — Cantidad de integrantes'
        )
    }

    const db = cargarDB()

    if (!db[m.chat]) db[m.chat] = {}

    db[m.chat].byeMessage = texto
    guardarDB(db)

    return m.reply(
        '> ✅ *DESPEDIDA PERSONALIZADA GUARDADA*\n\n' +
        '> El mensaje se utilizará cuando alguien salga del grupo.'
    )
}

handler.command = ['setbye']
handler.help = ['setbye texto']
handler.tags = ['grupo']
handler.menu = true

export default handler
