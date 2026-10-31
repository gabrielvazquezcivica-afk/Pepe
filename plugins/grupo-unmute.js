
import fs from 'node:fs'
import path from 'node:path'

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, 'muteados.json')

const handler = {}

function cargarDB() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true })
    }

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(DB_DIR, { recursive: true })

    const temporal = `${DB_FILE}.tmp`
    fs.writeFileSync(temporal, JSON.stringify(db, null, 2))
    fs.renameSync(temporal, DB_FILE)
}

function limpiarJid(jid = '') {
    return String(jid).replace(/:\d+@/, '@').trim()
}

function obtenerObjetivo(m) {
    return (
        m.mentionedJid?.[0] ||
        m.quoted?.sender ||
        null
    )
}

async function esAdmin(sock, m) {
    if (m.isAdmin === true) return true

    try {
        const metadata = await sock.groupMetadata(m.key.remoteJid)
        const id = limpiarJid(m.sender || m.key.participant)

        const participante = metadata.participants.find(p =>
            [p.id, p.lid].filter(Boolean).map(limpiarJid).includes(id)
        )

        return Boolean(
            participante?.admin === 'admin' ||
            participante?.admin === 'superadmin'
        )
    } catch {
        return false
    }
}

async function esBotAdmin(sock, chat) {
    try {
        const metadata = await sock.groupMetadata(chat)
        const botId = limpiarJid(sock.user.id)

        const bot = metadata.participants.find(p =>
            [p.id, p.lid].filter(Boolean).map(limpiarJid).includes(botId)
        )

        return Boolean(
            bot?.admin === 'admin' ||
            bot?.admin === 'superadmin'
        )
    } catch {
        return false
    }
}

handler.run = async (sock, m) => {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
    }

    if (!(await esAdmin(sock, m))) {
        return m.reply('> ⚠️ Solamente los administradores pueden usar este comando.')
    }

    if (!(await esBotAdmin(sock, chat))) {
        return m.reply('> ⚠️ Necesito ser administrador del grupo para administrar los usuarios muteados.')
    }

    const objetivo = obtenerObjetivo(m)

    if (!objetivo) {
        return m.reply('> ⚠️ Menciona o responde al usuario que quieres desmutear.')
    }

    const db = cargarDB()
    const muteados = db[chat] || []
    const objetivoLimpio = limpiarJid(objetivo)

    const posicion = muteados.findIndex(
        jid => limpiarJid(jid) === objetivoLimpio
    )

    if (posicion === -1) {
        return m.reply('> ⚠️ Ese usuario no está muteado.')
    }

    muteados.splice(posicion, 1)

    if (muteados.length) {
        db[chat] = muteados
    } else {
        delete db[chat]
    }

    guardarDB(db)

    const usuarioNumero = objetivo.split('@')[0]
    const adminNumero = (m.sender || '').split('@')[0]

    await sock.sendMessage(chat, {
        text: `> ✅ @${usuarioNumero} fue desmuteado por @${adminNumero}`,
        mentions: [objetivo, m.sender].filter(Boolean)
    }, { quoted: m })
}

handler.command = ['unmute']
handler.help = ['unmute']
handler.tags = ['grupo']
handler.menu = true

export default handler
