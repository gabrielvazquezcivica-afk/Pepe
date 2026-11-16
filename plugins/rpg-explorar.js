
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.join('./database', 'rpg.json')
const COOLDOWN = 15 * 60 * 1000
const handler = {}

function cargarDB() {
    fs.mkdirSync('./database', { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[RPG EXPLORAR] Error leyendo DB:', error)
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

function obtenerExploracion() {
    const numero = Math.random() * 100

    if (numero < 30) {
        return {
            lugar: 'Bosque misterioso',
            emoji: '🌳',
            descripcion: 'Encontraste un árbol lleno de recursos.',
            recurso: 'madera',
            cantidad: aleatorio(2, 5),
            monedas: aleatorio(100, 180)
        }
    }

    if (numero < 55) {
        return {
            lugar: 'Cueva escondida',
            emoji: '🕳️',
            descripcion: 'Descubriste minerales entre las rocas.',
            recurso: 'hierro',
            cantidad: aleatorio(1, 3),
            monedas: aleatorio(150, 250)
        }
    }

    if (numero < 75) {
        return {
            lugar: 'Río cristalino',
            emoji: '🏞️',
            descripcion: 'Encontraste unas gemas brillantes.',
            recurso: 'gema',
            cantidad: aleatorio(1, 2),
            monedas: aleatorio(200, 300)
        }
    }

    if (numero < 90) {
        return {
            lugar: 'Ruinas antiguas',
            emoji: '🏛️',
            descripcion: 'Encontraste una reliquia de una civilización perdida.',
            recurso: 'reliquia',
            cantidad: 1,
            monedas: aleatorio(300, 450)
        }
    }

    return {
        lugar: 'Tesoro escondido',
        emoji: '🧰',
        descripcion: '¡Encontraste un cofre lleno de riquezas!',
        recurso: 'cofre',
        cantidad: 1,
        monedas: aleatorio(500, 800)
    }
}

function tiempoRestante(ms) {
    const minutos = Math.floor(ms / 60000)
    const segundos = Math.ceil((ms % 60000) / 1000)
    return `${minutos} minutos y ${segundos} segundos`
}

async function explorar(sock, m) {
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
    const ultimoUso = Number(jugador.explorar) || 0
    const restante = COOLDOWN - (ahora - ultimoUso)

    if (restante > 0) {
        return m.reply(
            `> ⏳ Ya has salido a explorar recientemente.\n\n> 🧭 Vuelve en: ${tiempoRestante(restante)}.`
        )
    }

    const resultado = obtenerExploracion()

    jugador.recursos ??= {}
    jugador.recursos[resultado.recurso] =
        (Number(jugador.recursos[resultado.recurso]) || 0) + resultado.cantidad

    jugador.economia.monedas =
        (Number(jugador.economia.monedas) || 0) + resultado.monedas

    jugador.explorar = ahora

    guardarDB(db)

    return enviarYEditar(
        sock,
        chat,
        `> 🔎 Preparando expedición para ${jugador.nombre}...`,
        `╭━━━━━━━━━━━━━━━━━━╮
┃ 🧭 *EXPLORACIÓN RPG*
┃ 🐸 *PEPE BOT RPG*
╰━━━━━━━━━━━━━━━━━━╯

> 👤 Jugador: ${jugador.nombre}

> ${resultado.emoji} Lugar: ${resultado.lugar}

> 📜 ${resultado.descripcion}

> 🎒 Objeto: ${resultado.recurso}
> 📦 Cantidad: x${resultado.cantidad}

> 💰 Recompensa: +${resultado.monedas} monedas
> 🪙 Saldo: ${jugador.economia.monedas} monedas

> ✅ ¡Expedición completada!

> ⏳ Próxima exploración: 15 minutos

━━━━━━━━━━━━━━━━━━
🐸 PEPE BOT • RPG`,
        m
    )
}

handler.run = async (sock, m) => explorar(sock, m)

handler.command = ['explorar', 'exploracion']
handler.help = ['explorar']
handler.tags = ['rpg']
handler.menu = true

export default handler
