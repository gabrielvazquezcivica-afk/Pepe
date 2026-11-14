
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
        console.error('[RPG PERFIL] Error leyendo DB:', error)
        return {}
    }
}

function formatearFecha(timestamp) {
    if (!timestamp) return 'No disponible'

    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short'
    }).format(new Date(timestamp))
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

async function mostrarPerfil(sock, m) {
    const chat = m.key.remoteJid
    const id = m.sender || m.key.participant || chat
    const db = cargarDB()
    const jugador = db[id]

    if (!jugador) {
        return enviarYEditar(
            sock,
            chat,
            '> 🔎 Buscando tu perfil en la base de datos...',
            '> ❌ No estás registrado en el RPG.\n\n> 📝 Para crear tu perfil utiliza:\n> .reg <nombre> <edad>\n\n> Ejemplo: .reg Gabo 18',
            m
        )
    }

    const fecha = formatearFecha(jugador.registrado)

    const texto = `╭━━━━━━━━━━━━━━━━━━╮
┃ 🐸 *PEPE BOT RPG*
┃ 👤 *PERFIL DEL JUGADOR*
╰━━━━━━━━━━━━━━━━━━╯

> 🏷️ Nombre: ${jugador.nombre}
> 🎂 Edad: ${jugador.edad}
> 🆔 ID: ${id.split('@')[0]}
> 📅 Registro: ${fecha}

╭━━━━━━━━━━━━━━━━━━╮
┃ ⚔️ *ESTADÍSTICAS*
╰━━━━━━━━━━━━━━━━━━╯

> ⭐ Nivel: 1
> ✨ Experiencia: 0 XP
> ❤️ Estado: Registrado
> 🎒 Inventario: Vacío

━━━━━━━━━━━━━━━━━━
🐸 *PEPE BOT • RPG*`

    return sock.sendMessage(
        chat,
        {
            text: texto,
            mentions: [id]
        },
        { quoted: m }
    )
}

handler.run = async (sock, m) => {
    return mostrarPerfil(sock, m)
}

handler.command = ['perfil', 'profile']
handler.help = ['perfil']
handler.tags = ['rpg']
handler.menu = true

export default handler
