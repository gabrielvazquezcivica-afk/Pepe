
const handler = {}

const fs = await import('node:fs')
const path = await import('node:path')

const DB_FILE = './database/marry.json'

function cargarDB() {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))

        return {
            matrimonios: db.matrimonios || {},
            pendientes: db.pendientes || {}
        }
    } catch {
        return {
            matrimonios: {},
            pendientes: {}
        }
    }
}

function guardarDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

function limpiarJid(jid) {
    return jid?.split(':')[0] || jid
}

function mencionar(jid) {
    return `@${jid.split('@')[0]}`
}

function buscarPareja(db, jid) {
    jid = limpiarJid(jid)

    for (const [persona, pareja] of Object.entries(db.matrimonios)) {
        if (limpiarJid(persona) === jid) return pareja
        if (limpiarJid(pareja) === jid) return persona
    }

    return null
}

handler.run = async (sock, m) => {
    try {
        const usuario = limpiarJid(m.sender)
        const db = cargarDB()

        const pareja = buscarPareja(db, usuario)

        if (!pareja) {
            return m.reply(
                '> 💔 No estás casado actualmente.'
            )
        }

        delete db.matrimonios[usuario]
        delete db.matrimonios[pareja]

        guardarDB(db)

        return sock.sendMessage(m.chat, {
            text:
                `> 💔 *DIVORCIO REGISTRADO* 💔\n\n` +
                `> ${mencionar(usuario)} y ${mencionar(pareja)} ya no están casados.\n\n` +
                `> 🐸 Ambos están solteros nuevamente.`,
            mentions: [usuario, pareja]
        }, { quoted: m })

    } catch (error) {
        console.error('[DIVORCIO]', error)
        return m.reply(
            '> ❌ Ocurrió un error al procesar el divorcio.'
        )
    }
}

handler.command = ['divorcio']
handler.help = ['divorcio']
handler.tags = ['juegos']
handler.menu = true

export default handler
