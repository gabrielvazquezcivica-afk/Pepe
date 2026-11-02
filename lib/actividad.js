import fs from 'node:fs'
import path from 'node:path'

const DB_DIR = path.resolve('./database')
const DB_FILE = path.join(DB_DIR, 'actividad.json')

function cargarDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return {}
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(DB_DIR, { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

export function registrarActividad(message) {
    const chat = message?.key?.remoteJid

    if (!chat?.endsWith('@g.us')) return
    if (message.key.fromMe) return

    const participante =
        message.key.participant ||
        message.key.participantAlt

    if (!participante) return

    const db = cargarDB()
    const id = participante.replace(/:\d+@/, '@')

    if (!db[chat]) db[chat] = {}
    if (!db[chat][id]) {
        db[chat][id] = {
            mensajes: 0,
            ultimaActividad: 0
        }
    }

    db[chat][id].mensajes++
    db[chat][id].ultimaActividad = Date.now()

    guardarDB(db)
}