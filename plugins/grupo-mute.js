
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

function obtenerObjetivo(m) {
    return (
        m.mentionedJid?.[0] ||
        m.quoted?.sender ||
        null
    )
}

async function esAdmin(sock, m) {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) return false
    if (m.isAdmin === true) return true

    try {
        const metadata = await sock.groupMetadata(chat)
        const id = m.sender || m.key.participant

        const participante = metadata.participants.find(p =>
            p.id === id || p.lid === id
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
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'

        const bot = metadata.participants.find(p =>
            p.id === botId || p.lid === botId
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
        return m.reply('> ⚠️ Necesito ser administrador del grupo para poder mutear usuarios y borrar sus mensajes.')
    }

    const objetivo = obtenerObjetivo(m)

    if (!objetivo) {
        return m.reply('> ⚠️ Menciona o responde al mensaje del usuario que quieres mutear.')
    }

    const botNumero = sock.user.id.split(':')[0]
    const botJid = `${botNumero}@s.whatsapp.net`

    if (objetivo === botJid) {
        return m.reply('> ❌ No puedes mutear al bot.')
    }

    const db = cargarDB()

    if (!Array.isArray(db[chat])) {
        db[chat] = []
    }

    if (db[chat].includes(objetivo)) {
        return m.reply('> ⚠️ Ese usuario ya está muteado.')
    }

    db[chat].push(objetivo)
    guardarDB(db)

    const usuarioNumero = objetivo.split('@')[0]
    const adminNumero = (m.sender || '').split('@')[0]

    await sock.sendMessage(chat, {
        text: `> @${usuarioNumero} fue muteado por @${adminNumero}`,
        mentions: [objetivo, m.sender]
    }, { quoted: m })
}

handler.command = ['mute']
handler.help = ['mute']
handler.tags = ['grupo']
handler.menu = true

export default handler
