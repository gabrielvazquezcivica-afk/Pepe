
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.join('./database', 'rpg.json')
const handler = {}

const COOLDOWN = 30 * 60 * 1000
const PROBABILIDAD_EXITO = 60

function cargarDB() {
    fs.mkdirSync('./database', { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[RPG ROBAR] Error leyendo DB:', error)
        return {}
    }
}

function guardarDB(db) {
    const temporal = `${DB_FILE}.tmp`
    fs.writeFileSync(temporal, JSON.stringify(db, null, 2))
    fs.renameSync(temporal, DB_FILE)
}

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function tiempoRestante(ms) {
    const minutos = Math.ceil(ms / 60000)
    const horas = Math.floor(minutos / 60)
    const restantes = minutos % 60

    return horas > 0
        ? `${horas} hora(s) y ${restantes} minuto(s)`
        : `${restantes} minuto(s)`
}

async function enviarYEditar(sock, chat, inicial, final, quoted, menciones = []) {
    const enviado = await sock.sendMessage(
        chat,
        {
            text: inicial,
            mentions: menciones
        },
        { quoted }
    )

    if (!enviado?.key) return enviado

    await esperar(1500)

    return sock.sendMessage(chat, {
        text: final,
        mentions: menciones,
        edit: enviado.key
    })
}

handler.run = async (sock, m) => {
    const chat = m.chat || m.key?.remoteJid
    const id = m.sender || m.key?.participant

    if (!m.isGroup) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
    }

    if (!id) {
        return m.reply('> ❌ No pude identificar tu usuario.')
    }

    const db = cargarDB()

    // Comprobar registro del ladrón
    if (!db[id]) {
        return enviarYEditar(
            sock,
            chat,
            '> 🔎 Revisando tu registro...',
            '> ❌ No estás registrado en el RPG.\n\n> 📝 Regístrate usando:\n> .reg <nombre> <edad>',
            m
        )
    }

    const jugador = db[id]

    if (!jugador.economia) {
        jugador.economia = { monedas: 0 }
    }

    const ahora = Date.now()
    const ultimoRobo = Number(jugador.ultimoRobo) || 0
    const restante = COOLDOWN - (ahora - ultimoRobo)

    if (restante > 0) {
        return m.reply(
            `> ⏳ Ya realizaste un robo recientemente.\n\n> 🕒 Tiempo restante: ${tiempoRestante(restante)}`
        )
    }

    // Obtener participantes del grupo
    let metadata

    try {
        metadata = await sock.groupMetadata(chat)
    } catch (error) {
        console.error('[RPG ROBAR] Error obteniendo participantes:', error)
        return m.reply('> ❌ No pude obtener los participantes del grupo.')
    }

    // Buscar jugadores registrados con monedas, excluyendo al ladrón
    const candidatos = metadata.participants
        .map(participante => participante.id || participante.jid)
        .filter(participanteId => {
            if (!participanteId || participanteId === id) return false

            const objetivo = db[participanteId]

            return (
                objetivo &&
                objetivo.registrado &&
                Number(objetivo.economia?.monedas || 0) > 0
            )
        })

    if (candidatos.length === 0) {
        return m.reply(
            '> ❌ No hay otros jugadores registrados con monedas en este grupo.\n\n> 🐸 ¡Invita a otros jugadores a registrarse!'
        )
    }

    // Elegir víctima aleatoria
    const victimaId = candidatos[
        Math.floor(Math.random() * candidatos.length)
    ]

    const victima = db[victimaId]

    if (!victima.economia) {
        victima.economia = { monedas: 0 }
    }

    // Iniciar tiempo de espera
    jugador.ultimoRobo = ahora

    const exito = Math.random() * 100 < PROBABILIDAD_EXITO

    let resultado

    if (exito) {
        const cantidadSolicitada = Math.floor(Math.random() * 401) + 100

        const cantidad = Math.min(
            cantidadSolicitada,
            Number(victima.economia.monedas) || 0
        )

        victima.economia.monedas -= cantidad
        jugador.economia.monedas =
            (Number(jugador.economia.monedas) || 0) + cantidad

        resultado = `> ✅ ¡ROBO EXITOSO!\n\n> 💰 ${jugador.nombre} le robó *${cantidad} monedas* a ${victima.nombre}.\n\n> 🪙 Monedas de ${jugador.nombre}: ${jugador.economia.monedas}\n> 🪙 Monedas de ${victima.nombre}: ${victima.economia.monedas}`
    } else {
        const perdidaSolicitada = Math.floor(Math.random() * 101) + 50

        const perdida = Math.min(
            Number(jugador.economia.monedas) || 0,
            perdidaSolicitada
        )

        jugador.economia.monedas -= perdida

        resultado = `> ❌ ¡ROBO FALLIDO!\n\n> 🕵️ ${jugador.nombre} intentó robarle a ${victima.nombre}, pero fue descubierto.\n\n> 💸 Perdió ${perdida} monedas.\n> 🪙 Saldo de ${jugador.nombre}: ${jugador.economia.monedas} monedas.`
    }

    guardarDB(db)

    const inicial =
        `> 🕵️ *${jugador.nombre}* está intentando robarle a @${victimaId.split('@')[0]}...\n\n> 🎲 Calculando resultado...`

    const final =
        `╭━━━━━━━━━━━━━━━━━━╮
┃ 🕵️ *INTENTO DE ROBO*
┃ 🐸 *PEPE BOT RPG*
╰━━━━━━━━━━━━━━━━━━╯

> 👤 Ladrón: @${id.split('@')[0]}
> 🎯 Objetivo: @${victimaId.split('@')[0]}

${resultado}

> ⏳ Próximo robo: 30 minutos

━━━━━━━━━━━━━━━━━━
🐸 PEPE BOT • RPG`

    return enviarYEditar(
        sock,
        chat,
        inicial,
        final,
        m,
        [id, victimaId]
    )
}

handler.command = ['robar']
handler.help = ['robar']
handler.tags = ['rpg']
handler.menu = true

export default handler
