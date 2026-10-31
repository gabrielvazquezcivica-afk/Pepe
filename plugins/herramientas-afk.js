
import fs from 'node:fs'
import path from 'node:path'

const ruta = path.join(process.cwd(), 'database', 'afk.json')

function leerDB() {
    try {
        if (!fs.existsSync(ruta)) {
            fs.mkdirSync(path.dirname(ruta), { recursive: true })
            fs.writeFileSync(ruta, '{}')
        }

        const contenido = fs.readFileSync(ruta, 'utf8')
        return contenido.trim() ? JSON.parse(contenido) : {}
    } catch {
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(path.dirname(ruta), { recursive: true })
    fs.writeFileSync(ruta, JSON.stringify(db, null, 2))
}

function limpiarJid(jid = '') {
    return String(jid).replace(/:\d+@/, '@').trim()
}

function numeroDeJid(jid = '') {
    return limpiarJid(jid)
        .replace(/@.+$/, '')
        .replace(/\D/g, '')
}

const handler = {}

handler.run = async (sock, m, args = []) => {
    const from = m.key.remoteJid

    if (!from?.endsWith('@g.us')) {
        return m.reply('❌ Este comando solo funciona en grupos.')
    }

    const sender =
        m.key.participant ||
        m.key.participantAlt ||
        m.sender

    if (!sender) {
        return m.reply('❌ No pude identificar tu usuario.')
    }

    const jid = limpiarJid(sender)
    const numero = numeroDeJid(jid)
    const razon = args.join(' ').trim() || 'Sin razón especificada'

    const db = leerDB()

    if (!db[from]) db[from] = {}

    db[from][jid] = {
        razon,
        timestamp: Date.now(),
        numero
    }

    guardarDB(db)

    return sock.sendMessage(from, {
        text:
`╭─── ⋆⋅☆⋅⋆ ───╮
       💤 𝐔𝐒𝐔𝐀𝐑𝐈𝐎 𝐀𝐅𝐊
╰─── ⋆⋅☆⋅⋆ ───╯

> 🐸 @${numero}
> 💬 Se encuentra ausente.
> 📝 Razón: ${razon}`,
        mentions: [sender]
    }, { quoted: m })
}

handler.command = ['afk']
handler.help = ['afk <razón>']
handler.tags = ['herramientas']
handler.menu = true
handler.group = true

export default handler
