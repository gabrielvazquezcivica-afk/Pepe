import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.join('./database', 'rpg.json')
const handler = {}

const TRABAJOS = [
    '🍕 Trabajaste como repartidor',
    '🔧 Trabajaste como mecánico',
    '🏪 Trabajaste en una tienda',
    '💻 Trabajaste como programador',
    '🚕 Trabajaste como conductor',
    '🍔 Trabajaste en un restaurante',
    '🎮 Trabajaste como entrenador gamer',
    '🐸 Ayudaste a Pepe Bot con sus tareas'
]

const MIN_RECOMPENSA = 100
const MAX_RECOMPENSA = 500
const COOLDOWN = 60 * 60 * 1000

function cargarDB() {
    fs.mkdirSync('./database', { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[RPG WORK] Error leyendo DB:', error)
        return {}
    }
}

function guardarDB(db) {
    const temporal = `${DB_FILE}.tmp`
    fs.writeFileSync(temporal, JSON.stringify(db, null, 2))
    fs.renameSync(temporal, DB_FILE)
}

function tiempoRestante(ms) {
    const minutos = Math.ceil(ms / 60000)
    const horas = Math.floor(minutos / 60)
    const restantes = minutos % 60

    if (horas > 0) {
        return `${horas} hora(s) y ${restantes} minuto(s)`
    }

    return `${restantes} minuto(s)`
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

async function trabajar(sock, m) {
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
    const ahora = Date.now()

    if (!jugador.economia) {
        jugador.economia = { monedas: 0 }
    }

    const ultimoTrabajo = Number(jugador.ultimoWork) || 0
    const restante = COOLDOWN - (ahora - ultimoTrabajo)

    if (restante > 0) {
        return m.reply(
            `> ⏳ Ya trabajaste recientemente.\n\n> 🕒 Vuelve en: ${tiempoRestante(restante)}`
        )
    }

    const recompensa = Math.floor(
        Math.random() * (MAX_RECOMPENSA - MIN_RECOMPENSA + 1)
    ) + MIN_RECOMPENSA

    const trabajo = TRABAJOS[
        Math.floor(Math.random() * TRABAJOS.length)
    ]

    jugador.economia.monedas =
        (Number(jugador.economia.monedas) || 0) + recompensa

    jugador.ultimoWork = ahora

    guardarDB(db)

    return enviarYEditar(
        sock,
        chat,
        `> 💼 @${id.split('@')[0]} está trabajando...`,
        `╭━━━━━━━━━━━━━━━━━━╮
┃ 💼 *TRABAJO COMPLETADO*
┃ 🐸 *PEPE BOT RPG*
╰━━━━━━━━━━━━━━━━━━╯

> 👤 Jugador: ${jugador.nombre}
> ${trabajo}
> 💰 Ganancia: +${recompensa} monedas
> 🪙 Saldo: ${jugador.economia.monedas} monedas

> ⏳ Próximo trabajo: 1 hora

━━━━━━━━━━━━━━━━━━
🐸 PEPE BOT • RPG`,
        m
    )
}

handler.run = async (sock, m) => trabajar(sock, m)

handler.command = ['work']
handler.help = ['work']
handler.tags = ['rpg']
handler.menu = true

export default handler