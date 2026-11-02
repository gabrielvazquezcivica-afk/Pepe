
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.resolve('./database/cierres.json')

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

export async function recuperarCierres(sock) {
    const db = cargarDB()

    for (const [chat, registro] of Object.entries(db)) {
        if (!registro?.abrirEn) continue

        const restante = registro.abrirEn - Date.now()

        if (restante <= 0) {
            try {
                await sock.groupSettingUpdate(chat, 'not_announcement')
                delete db[chat]
                guardarDB(db)
            } catch {}
        }
    }
}
