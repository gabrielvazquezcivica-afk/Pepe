
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.join('./database', 'rpg.json')
const handler = {}

function cargarDB() {
    fs.mkdirSync('./database', { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[RPG BALANCE] Error leyendo DB:', error)
        return {}
    }
}

handler.run = async (sock, m) => {
    const chat = m.chat || m.key?.remoteJid
    const id = m.sender || m.key?.participant

    if (!id) return m.reply('> ❌ No pude identificar tu usuario.')

    const db = cargarDB()

    // Consultar a otro jugador respondiendo a su mensaje
    const citado = m.message?.extendedTextMessage?.contextInfo?.participant ||
        m.quoted?.sender ||
        null

    const objetivoId = citado || id
    const jugador = db[objetivoId]

    if (!jugador) {
        return m.reply(
            citado
                ? '> ❌ Ese jugador no está registrado en el RPG.'
                : '> ❌ No estás registrado en el RPG.\n\n> 📝 Regístrate usando:\n> .reg <nombre> <edad>'
        )
    }

    const monedas = Number(jugador.economia?.monedas) || 0

    const esPropio = objetivoId === id

    const texto = `╭━━━━━━━━━━━━━━━━━━╮
┃ 🪙 *BALANCE RPG*
┃ 🐸 *PEPE BOT*
╰━━━━━━━━━━━━━━━━━━╯

> 👤 Jugador: *${jugador.nombre}*
> 🪙 Monedas: *${monedas.toLocaleString('es-MX')}*
> 📊 Estado: ${monedas > 0 ? 'Con monedas' : 'Sin monedas'}

${esPropio
    ? '> 💰 Este es tu saldo actual.'
    : '> 🔎 Saldo del jugador consultado.'}

━━━━━━━━━━━━━━━━━━
🐸 PEPE BOT • RPG`

    return sock.sendMessage(
        chat,
        {
            text: texto,
            mentions: [objetivoId]
        },
        { quoted: m }
    )
}

handler.command = ['balance', 'bal']
handler.help = ['balance']
handler.tags = ['rpg']
handler.menu = true

export default handler
