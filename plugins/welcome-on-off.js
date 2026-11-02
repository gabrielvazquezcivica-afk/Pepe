
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

const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@').trim()

function buscar(participantes, identificadores = []) {
    const ids = identificadores.filter(Boolean).map(normalizar)

    return participantes.find(p => {
        const idsParticipante = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizar)

        return idsParticipante.some(id => ids.includes(id))
    })
}

const handler = {}

handler.run = async (sock, m, args) => {
    if (!m.isGroup) {
        return m.reply('> ✖️ Este comando solo funciona en grupos.')
    }

    const metadata = await sock.groupMetadata(m.chat)
    const participantes = metadata.participants || []

    const usuario = buscar(participantes, [
        m.key?.participant,
        m.key?.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ])

    if (!['admin', 'superadmin'].includes(usuario?.admin)) {
        return m.reply('> ✖️ Solo los administradores pueden cambiar esta configuración.')
    }

    const opcion = String(args[0] || '').toLowerCase()

    if (!['on', 'off'].includes(opcion)) {
        return m.reply(
            '> ⚙️ *CONFIGURACIÓN DE BIENVENIDAS*\n\n' +
            '> .welcome on — Activar\n' +
            '> .welcome off — Desactivar'
        )
    }

    const db = cargarDB()

    if (!db[m.chat]) db[m.chat] = {}

    const activar = opcion === 'on'

    if (db[m.chat].welcome === activar) {
        return m.reply(
            activar
                ? '> ⚠️ Las bienvenidas ya están activadas.'
                : '> ⚠️ Las bienvenidas ya están desactivadas.'
        )
    }

    db[m.chat].welcome = activar
    guardarDB(db)

    return m.reply(
        activar
            ? '> ✅ *BIENVENIDAS ACTIVADAS*\n\n> Pepe Bot dará la bienvenida a los nuevos integrantes.'
            : '> ❌ *BIENVENIDAS DESACTIVADAS*\n\n> Pepe Bot dejará de enviar bienvenidas.'
    )
}

handler.command = ['welcome']
handler.help = ['welcome on', 'welcome off']
handler.tags = ['on-off']
handler.menu = true

export default handler
