
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.join('./database', 'rpg.json')
const RECOMPENSA = 500
const handler = {}

function cargarDB() {
    fs.mkdirSync('./database', { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[RPG DAILY] Error leyendo DB:', error)
        return {}
    }
}

function guardarDB(db) {
    const temporal = `${DB_FILE}.tmp`
    fs.writeFileSync(temporal, JSON.stringify(db, null, 2))
    fs.renameSync(temporal, DB_FILE)
}

function obtenerFecha() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date())
}

async function enviarYEditar(sock, chat, inicial, final, quoted) {
    const enviado = await sock.sendMessage(
        chat,
        { text: inicial },
        { quoted }
    )

    if (!enviado?.key) return enviado

    await new Promise(resolve => setTimeout(resolve, 1500))

    return sock.sendMessage(chat, {
        text: final,
        edit: enviado.key
    })
}

async function daily(sock, m) {
    const chat = m.key.remoteJid
    const id = m.sender || m.key.participant || chat
    const db = cargarDB()

    if (!db[id]) {
        return enviarYEditar(
            sock,
            chat,
            '> 🔎 Buscando tu registro...',
            '> ❌ No estás registrado en el RPG.\n\n> 📝 Regístrate usando:\n> .reg <nombre> <edad>',
            m
        )
    }

    const jugador = db[id]
    const hoy = obtenerFecha()

    if (!jugador.economia) jugador.economia = { monedas: 0 }

    if (jugador.daily === hoy) {
        return m.reply(
            '> ⏳ Ya reclamaste tu recompensa diaria.\n\n> 🎁 Vuelve mañana para recibir otras 500 monedas.'
        )
    }

    jugador.economia.monedas =
        (Number(jugador.economia.monedas) || 0) + RECOMPENSA

    jugador.daily = hoy

    guardarDB(db)

    return enviarYEditar(
        sock,
        chat,
        `> 🎁 Preparando recompensa diaria para @${id.split('@')[0]}...`,
        `╭━━━━━━━━━━━━━━━━━━╮
┃ 🎁 *RECOMPENSA DIARIA*
┃ 🐸 *PEPE BOT RPG*
╰━━━━━━━━━━━━━━━━━━╯

> 👤 Jugador: ${jugador.nombre}
> 💰 Recompensa: +${RECOMPENSA} monedas
> 🪙 Saldo: ${jugador.economia.monedas} monedas
> 📅 Fecha: ${hoy}

> ✅ ¡Has reclamado tu recompensa diaria!

━━━━━━━━━━━━━━━━━━
🐸 PEPE BOT • RPG`,
        m
    )
}

handler.run = async (sock, m) => daily(sock, m)

handler.command = ['daily']
handler.help = ['daily']
handler.tags = ['rpg']
handler.menu = true

export default handler
