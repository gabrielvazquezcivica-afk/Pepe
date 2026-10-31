import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const afkPath = path.join(
    process.cwd(),
    'database',
    'afk.json'
)

function leerAFK() {
    try {
        if (!fs.existsSync(afkPath)) return {}

        return JSON.parse(
            fs.readFileSync(afkPath, 'utf8')
        )
    } catch {
        return {}
    }
}

function limpiarJid(jid = '') {
    return String(jid)
        .replace(/:\d+@/, '@')
        .trim()
}

function footer(nombreGrupo) {
    return `\n\n> ${nombreGrupo}`
}

const handler = {}

handler.run = async (sock, m, args = []) => {
    const from = m.key.remoteJid

    const senderIds = [
        m.key.participant,
        m.key.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ].filter(Boolean).map(limpiarJid)

    if (!from?.endsWith('@g.us')) {
        return sock.sendMessage(
            from,
            {
                text: '⚠️ Este comando solo funciona en grupos.'
            },
            { quoted: m }
        )
    }

    let metadata

    try {
        metadata = await sock.groupMetadata(from)
    } catch {
        return sock.sendMessage(
            from,
            {
                text: '❌ No pude leer la información del grupo.'
            },
            { quoted: m }
        )
    }

    const participantes = metadata.participants || []

    const userInfo = participantes.find(p => {
        const ids = [
            p.id,
            p.jid,
            p.lid
        ].filter(Boolean).map(limpiarJid)

        return ids.some(id => senderIds.includes(id))
    })

    const isAdmin =
        userInfo?.admin === 'admin' ||
        userInfo?.admin === 'superadmin'

    if (!isAdmin) {
        return sock.sendMessage(
            from,
            {
                text: '🚫 Solo los administradores pueden usar este comando.'
            },
            { quoted: m }
        )
    }

    // Usuarios AFK
    const afkDB = leerAFK()
    const grupoAFK = afkDB[from] || {}

    // Participantes que no están AFK
    const todosLosUsuarios = participantes
        .map(p => limpiarJid(p.id || p.jid))
        .filter(Boolean)

    const mentions = todosLosUsuarios.filter(
        jid => !grupoAFK[jid]
    )

    // Obtener texto del comando
    const body =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        ''

    const text = body.replace(/^\.?n\s*/i, '')

    // Mensaje citado
    const quoted =
        m.message
            ?.extendedTextMessage
            ?.contextInfo
            ?.quotedMessage

    const nombreGrupo = metadata.subject || 'Grupo'

    // .n <texto>
    if (text.trim()) {
        return sock.sendMessage(
            from,
            {
                text: `${text}${footer(nombreGrupo)}`,
                mentions
            },
            { quoted: m }
        )
    }

    // .n respondiendo a un mensaje
    if (quoted) {
        const type = Object.keys(quoted)[0]
        const contenido = quoted[type]

        let msg = {}

        if (
            type === 'conversation' ||
            type === 'extendedTextMessage'
        ) {
            msg.text = (
                quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                ''
            ) + footer(nombreGrupo)
        } else {
            const mediaType = type.replace('Message', '')

            const stream = await downloadContentFromMessage(
                contenido,
                mediaType
            )

            let buffer = Buffer.from([])

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk])
            }

            msg[mediaType] = buffer

            if (
                mediaType === 'image' ||
                mediaType === 'video' ||
                mediaType === 'document'
            ) {
                msg.caption = (
                    contenido?.caption || ''
                ) + footer(nombreGrupo)
            }

            if (mediaType === 'audio') {
                msg.ptt = contenido?.ptt || false
                msg.mimetype =
                    contenido?.mimetype || 'audio/mp4'
            }

            if (mediaType === 'document') {
                msg.fileName =
                    contenido?.fileName || 'archivo'

                msg.mimetype =
                    contenido?.mimetype ||
                    'application/octet-stream'
            }

            if (mediaType === 'sticker') {
                msg.mimetype = 'image/webp'
            }
        }

        msg.mentions = mentions

        return sock.sendMessage(
            from,
            msg,
            { quoted: m }
        )
    }

    return sock.sendMessage(
        from,
        {
            text: '❌ Usa `.n texto` o responde a un mensaje.'
        },
        { quoted: m }
    )
}

handler.command = ['n']
handler.help = ['n <texto>']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true

export default handler