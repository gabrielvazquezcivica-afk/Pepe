import fs from 'fs'
import path from 'path'

const ruta = path.join(process.cwd(), 'database', 'afk.json')

function leerDB() {
    try {
        if (!fs.existsSync(ruta)) {
            fs.mkdirSync(path.dirname(ruta), { recursive: true })
            fs.writeFileSync(ruta, '{}')
        }

        return JSON.parse(fs.readFileSync(ruta, 'utf8'))
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
        .replace(/[^0-9]/g, '')
}

const handler = {}

handler.run = async (sock, m, args = []) => {
    const from = m.key.remoteJid

    if (!from?.endsWith('@g.us')) {
        return sock.sendMessage(from, {
            text: '> ❌ Este comando solo funciona en grupos.'
        }, { quoted: m })
    }

    const sender = limpiarJid(
        m.key.participant ||
        m.key.participantAlt ||
        m.sender
    )

    const razon = args.join(' ').trim() || 'Sin razón especificada'

    const db = leerDB()

    if (!db[from]) db[from] = {}

    db[from][sender] = {
        razon,
        timestamp: Date.now(),
        numero: numeroDeJid(sender)
    }

    guardarDB(db)

    let nombreGrupo = 'Grupo'

    try {
        const metadata = await sock.groupMetadata(from)
        nombreGrupo = metadata.subject || 'Grupo'
    } catch {}

    return sock.sendMessage(from, {
        text:
`╭─── ⋆⋅☆⋅⋆ ───╮
       💤 *𝐔𝐒𝐔𝐀𝐑𝐈𝐎 𝐀𝐅𝐊*
╰─── ⋆⋅☆⋅⋆ ───╯

> 🐸 @${numeroDeJid(sender)}
> 💬 Se encuentra ausente.
> 📝 Razón: ${razon}

─── ⋆⋅☆⋅⋆ ──
> 🌿 ${nombreGrupo}`,
        mentions: [sender]
    }, { quoted: m })
}

handler.command = ['afk']
handler.help = ['afk <razón>']
handler.tags = ['herramientas']
handler.menu = true

export default handler