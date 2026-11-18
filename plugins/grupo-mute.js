
import fs from 'node:fs'
import path from 'node:path'

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, 'muteados.json')

const handler = {}

const normalizar = jid =>
    String(jid || '')
        .replace(/:\d+@/, '@')
        .trim()
        .toLowerCase()

const limpiarNumero = jid =>
    String(jid || '').replace(/\D/g, '')

const esAdmin = participante =>
    ['admin', 'superadmin'].includes(participante?.admin)

function obtenerIdsParticipante(participante) {
    if (!participante) return []

    return [
        participante.id,
        participante.jid,
        participante.lid,
        participante.phoneNumber
    ].filter(Boolean).map(normalizar)
}

function buscar(participantes, identificadores = []) {
    const ids = identificadores.filter(Boolean).map(normalizar)

    return participantes.find(p =>
        obtenerIdsParticipante(p).some(id => ids.includes(id))
    )
}

async function obtenerIdsObjetivo(sock, chat, objetivo) {
    const ids = new Set([normalizar(objetivo)])

    try {
        const metadata = await sock.groupMetadata(chat)

        const participante = metadata.participants?.find(p =>
            obtenerIdsParticipante(p).some(id => ids.has(id))
        )

        if (participante) {
            for (const id of obtenerIdsParticipante(participante)) {
                ids.add(id)
            }
        }
    } catch (error) {
        console.error('[MUTE] Error obteniendo identificadores:', error)
    }

    return [...ids].filter(Boolean)
}

function cargarDB() {
    try {
        fs.mkdirSync(DB_DIR, { recursive: true })

        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, '{}')
        }

        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[MUTE] Error leyendo DB:', error)
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(DB_DIR, { recursive: true })

    const temporal = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`

    fs.writeFileSync(temporal, JSON.stringify(db, null, 2))
    fs.renameSync(temporal, DB_FILE)
}

async function obtenerPermisos(sock, m) {
    try {
        const chat = m.key.remoteJid
        const metadata = await sock.groupMetadata(chat)
        const participantes = metadata.participants || []

        const idsEjecutor = [
            m.key?.participant,
            m.key?.participantAlt,
            m.participant,
            m.sender,
            m.senderLid
        ]

        const adminEjecutor = buscar(participantes, idsEjecutor)

        if (!esAdmin(adminEjecutor)) {
            return { admin: false, botAdmin: false }
        }

        const botId = sock.user?.id || ''
        const botNumero = botId.split(':')[0].split('@')[0]

        const idsBot = [
            botId,
            sock.user?.lid,
            `${botNumero}@s.whatsapp.net`
        ]

        const botInfo = buscar(participantes, idsBot)

        return {
            admin: true,
            botAdmin: esAdmin(botInfo)
        }
    } catch (error) {
        console.error('[MUTE] Error comprobando permisos:', error)
        return { admin: false, botAdmin: false }
    }
}

function obtenerObjetivo(m) {
    const contexto =
        m.message?.extendedTextMessage?.contextInfo ||
        m.message?.imageMessage?.contextInfo ||
        m.message?.videoMessage?.contextInfo ||
        m.message?.documentMessage?.contextInfo ||
        {}

    return (
        contexto.mentionedJid?.[0] ||
        contexto.participant ||
        m.mentionedJid?.[0] ||
        m.quoted?.sender ||
        null
    )
}

handler.run = async (sock, m) => {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
    }

    const permisos = await obtenerPermisos(sock, m)

    if (!permisos.admin) {
        return m.reply('> 🚫 Solo los administradores pueden usar .mute.')
    }

    if (!permisos.botAdmin) {
        return m.reply('> ⚠️ Necesito ser administrador del grupo para mutear usuarios y borrar sus mensajes.')
    }

    const objetivo = obtenerObjetivo(m)

    if (!objetivo) {
        return m.reply('> ⚠️ Menciona al usuario o responde a uno de sus mensajes.')
    }

    const idsObjetivo = await obtenerIdsObjetivo(sock, chat, objetivo)
    const db = cargarDB()

    if (!Array.isArray(db[chat])) {
        db[chat] = []
    }

    const yaMuteado = db[chat].some(jid =>
        idsObjetivo.includes(normalizar(jid))
    )

    if (yaMuteado) {
        return m.reply('> ⚠️ Ese usuario ya está muteado.')
    }

    db[chat].push(...idsObjetivo)
    db[chat] = [...new Set(db[chat].map(normalizar))]

    guardarDB(db)

    const ejecutor = m.sender || m.key.participant
    const usuarioNumero = limpiarNumero(objetivo)
    const adminNumero = limpiarNumero(ejecutor)

    await sock.sendMessage(chat, {
        text: `> 🔇 @${usuarioNumero} fue muteado por @${adminNumero}`,
        mentions: [objetivo, ejecutor].filter(Boolean)
    }, { quoted: m })
}

handler.command = ['mute']
handler.help = ['mute @usuario']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
