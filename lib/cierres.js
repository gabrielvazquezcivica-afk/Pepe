import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.resolve('./database/cierres.json')

let intervalo = null
let revisando = false

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

export async function revisarCierres(sock) {
    if (!sock || revisando) return

    revisando = true

    try {
        const db = cargarDB()
        let cambios = false

        for (const [chat, registro] of Object.entries(db)) {
            if (!registro?.abrirEn) {
                delete db[chat]
                cambios = true
                continue
            }

            if (Date.now() < registro.abrirEn) continue

            try {
                await sock.groupSettingUpdate(chat, 'not_announcement')
                delete db[chat]
                cambios = true
            } catch (error) {
                // Se conserva el registro para volver a intentarlo.
            }
        }

        if (cambios) guardarDB(db)
    } finally {
        revisando = false
    }
}

export function iniciarRevisionCierres(obtenerSocket) {
    if (intervalo) return

    intervalo = setInterval(async () => {
        const sock = obtenerSocket()
        if (sock) await revisarCierres(sock)
    }, 15000)

    intervalo.unref?.()
}