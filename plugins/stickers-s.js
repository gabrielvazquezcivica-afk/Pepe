import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { toSticker } from '../lib/sticker.js'

const handler = {}

function unwrapMessage(message) {
    let msg = message

    while (msg) {
        if (msg.ephemeralMessage) {
            msg = msg.ephemeralMessage.message
        } else if (msg.viewOnceMessage) {
            msg = msg.viewOnceMessage.message
        } else if (msg.viewOnceMessageV2) {
            msg = msg.viewOnceMessageV2.message
        } else if (msg.documentWithCaptionMessage) {
            msg = msg.documentWithCaptionMessage.message
        } else {
            break
        }
    }

    return msg
}

function getMediaMessage(m) {
    const current = unwrapMessage(m.message || {})
    const quoted = unwrapMessage(
        m.msg?.contextInfo?.quotedMessage ||
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        {}
    )

    const currentType = Object.keys(current).find(key =>
        ['imageMessage', 'videoMessage'].includes(key)
    )

    if (currentType) {
        return {
            message: m,
            type: currentType
        }
    }

    if (Object.keys(quoted).length) {
        const quotedType = Object.keys(quoted).find(key =>
            ['imageMessage', 'videoMessage'].includes(key)
        )

        if (quotedType) {
            return {
                message: {
                    key: {
                        remoteJid: m.chat,
                        id: m.msg?.contextInfo?.stanzaId ||
                            m.message?.extendedTextMessage?.contextInfo?.stanzaId,
                        participant: m.msg?.contextInfo?.participant ||
                            m.message?.extendedTextMessage?.contextInfo?.participant
                    },
                    message: quoted
                },
                type: quotedType
            }
        }
    }

    return null
}

handler.run = async (sock, m) => {
    try {
        const media = getMediaMessage(m)

        if (!media) {
            return m.reply(
                '🐸 Envía una imagen o video junto con *.s*, o responde a uno con *.s*.'
            )
        }

        const isVideo = media.type === 'videoMessage'

        if (isVideo) {
            const videoMessage = media.message.message?.videoMessage
            const seconds = videoMessage?.seconds || 0

            if (seconds > 10) {
                return m.reply('❌ El video no puede durar más de 10 segundos.')
            }
        }

        await sock.sendMessage(m.chat, {
            react: {
                text: '⏳',
                key: m.key
            }
        })

        const buffer = await downloadMediaMessage(
            media.message,
            'buffer',
            {},
            {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            }
        )

        const webp = await toSticker(buffer, isVideo)

        await sock.sendMessage(m.chat, {
            sticker: webp
        }, {
            quoted: m
        })

        await sock.sendMessage(m.chat, {
            react: {
                text: '✅',
                key: m.key
            }
        })

    } catch (error) {
        console.error('Error en .s:', error)
        await m.reply('❌ No se pudo convertir el archivo en sticker.')
    }
}

handler.command = ['s', 'sticker']
handler.help = ['s']
handler.tags = ['stickers']
handler.menu = true

export default handler