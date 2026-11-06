import { downloadContentFromMessage } from '@whiskeysockets/baileys'

function obtenerCitado(m) {
    const msg = m.message
    if (!msg) return null

    const tipos = [
        msg.extendedTextMessage,
        msg.imageMessage,
        msg.videoMessage,
        msg.audioMessage,
        msg.documentMessage,
        msg.buttonsResponseMessage,
        msg.listResponseMessage
    ]

    for (const tipo of tipos) {
        if (tipo?.contextInfo?.quotedMessage) {
            return tipo.contextInfo.quotedMessage
        }
    }

    return null
}

function detectarViewOnce(message) {
    if (!message) return false

    if (
        message.viewOnceMessage ||
        message.viewOnceMessageV2 ||
        message.viewOnceMessageV2Extension
    ) return true

    if (message.ephemeralMessage?.message) {
        return detectarViewOnce(message.ephemeralMessage.message)
    }

    if (message.documentWithCaptionMessage?.message) {
        return detectarViewOnce(message.documentWithCaptionMessage.message)
    }

    return false
}

function obtenerMedia(message) {
    if (!message) return null

    if (message.ephemeralMessage?.message) {
        return obtenerMedia(message.ephemeralMessage.message)
    }

    if (message.documentWithCaptionMessage?.message) {
        return obtenerMedia(message.documentWithCaptionMessage.message)
    }

    if (message.imageMessage) {
        return { tipo: 'image', media: message.imageMessage }
    }

    if (message.videoMessage) {
        return { tipo: 'video', media: message.videoMessage }
    }

    if (message.audioMessage) {
        return { tipo: 'audio', media: message.audioMessage }
    }

    return null
}

async function descargarMedia(media, tipo) {
    const stream = await downloadContentFromMessage(media, tipo)
    const chunks = []

    for await (const chunk of stream) {
        chunks.push(chunk)
    }

    return Buffer.concat(chunks)
}

const handler = {}

handler.run = async (sock, m) => {
    const from = m.chat || m.key.remoteJid
    const quoted = obtenerCitado(m)

    if (!quoted) {
        return m.reply(
            '👁️ *VER MEDIA*\n\n' +
            'Responde a una imagen, video o audio con:\n' +
            '> *.ver*\n\n' +
            '🐸 *PEPE BOT*'
        )
    }

    if (detectarViewOnce(quoted)) {
        return m.reply(
            '🔒 Este contenido está protegido con Ver una vez.\n\n' +
            'Solicita que te lo reenvíen como archivo normal.\n\n' +
            '🐸 *PEPE BOT*'
        )
    }

    const encontrado = obtenerMedia(quoted)

    if (!encontrado) {
        return m.reply('❌ No encontré multimedia compatible.')
    }

    try {
        const { tipo, media } = encontrado
        const buffer = await descargarMedia(media, tipo)

        if (tipo === 'image') {
            await sock.sendMessage(
                from,
                { image: buffer, caption: media.caption || '' },
                { quoted: m }
            )
        }

        if (tipo === 'video') {
            await sock.sendMessage(
                from,
                { video: buffer, caption: media.caption || '' },
                { quoted: m }
            )
        }

        if (tipo === 'audio') {
            await sock.sendMessage(
                from,
                {
                    audio: buffer,
                    mimetype: media.mimetype || 'audio/mpeg',
                    ptt: Boolean(media.ptt)
                },
                { quoted: m }
            )
        }

    } catch (error) {
        console.error('❌ VER ERROR:', error)

        await m.reply('❌ No pude procesar el archivo multimedia.')
    }
}

handler.command = ['ver']
handler.help = ['ver']
handler.tags = ['herramientas']
handler.menu = true

export default handler