
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.join('./database', 'rpg.json')
const COOLDOWN = 10 * 60 * 1000
const handler = {}

function cargarDB() {
    fs.mkdirSync('./database', { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[RPG MINAR] Error leyendo DB:', error)
        return {}
    }
}

function guardarDB(db) {
    const temporal = `${DB_FILE}.tmp`
    fs.writeFileSync(temporal, JSON.stringify(db, null, 2))
    fs.renameSync(temporal, DB_FILE)
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

function aleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function obtenerMaterial() {
    const numero = Math.random() * 100

    if (numero < 35) {
        return {
            nombre: 'Piedra',
            emoji: '🪨',
            clave: 'piedra',
            cantidad: aleatorio(2, 5),
            monedas: aleatorio(50, 100)
        }
    }

    if (numero < 60) {
        return {
            nombre: 'Hierro',
            emoji: '⛓️',
            clave: 'hierro',
            cantidad: aleatorio(1, 4),
            monedas: aleatorio(100, 180)
        }
    }

    if (numero < 80) {
        return {
            nombre: 'Carbón',
            emoji: '⚫',
            clave: 'carbon',
            cantidad: aleatorio(2, 5),
            monedas: aleatorio(80, 140)
        }
    }

    if (numero < 95) {
        return {
            nombre: 'Oro',
            emoji: '🥇',
            clave: 'oro',
            cantidad: aleatorio(1, 2),
            monedas: aleatorio(200, 300)
        }
    }

    return {
        nombre: 'Diamante',
        emoji: '💎',
        clave: 'diamante',
        cantidad: 1,
        monedas: aleatorio(350, 500)
    }
}

function tiempoRestante(ms) {
    const minutos = Math.floor(ms / 60000)
    const segundos = Math.ceil((ms % 60000) / 1000)
    return `${minutos} minutos y ${segundos} segundos`
}

async function minar(sock, m) {
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

    if (!jugador.economia) jugador.economia = { monedas: 0 }

    const ahora = Date.now()
    const ultimoUso = Number(jugador.minar) || 0
    const restante = COOLDOWN - (ahora - ultimoUso)

    if (restante > 0) {
        return m.reply(
            `> ⏳ Ya has utilizado la minería.\n\n> ⛏️ Vuelve en: ${tiempoRestante(restante)}.`
        )
    }

    const material = obtenerMaterial()

    jugador.recursos ??= {}
    jugador.recursos[material.clave] =
        (Number(jugador.recursos[material.clave]) || 0) + material.cantidad

    jugador.economia.monedas =
        (Number(jugador.economia.monedas) || 0) + material.monedas

    jugador.minar = ahora

    guardarDB(db)

    return enviarYEditar(
        sock,
        chat,
        `> 🔎 Buscando una mina para ${jugador.nombre}...`,
        `╭━━━━━━━━━━━━━━━━━━╮
┃ ⛏️ *MINERÍA RPG*
┃ 🐸 *PEPE BOT RPG*
╰━━━━━━━━━━━━━━━━━━╯

> 👤 Jugador: ${jugador.nombre}
> 🏔️ Lugar: Mina abandonada

> ${material.emoji} Material: ${material.nombre}
> 📦 Cantidad: x${material.cantidad}
> 💰 Recompensa: +${material.monedas} monedas

> 🪙 Saldo: ${jugador.economia.monedas} monedas

> ✅ ¡Has terminado de minar!

> ⏳ Próxima minería: 10 minutos

━━━━━━━━━━━━━━━━━━
🐸 PEPE BOT • RPG`,
        m
    )
}

handler.run = async (sock, m) => minar(sock, m)

handler.command = ['minar', 'mina']
handler.help = ['minar']
handler.tags = ['rpg']
handler.menu = true

export default handler
