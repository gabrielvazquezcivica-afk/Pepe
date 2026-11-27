
import axios from 'axios'

import {
    proto,
    prepareWAMessageMedia,
    generateWAMessageFromContent
} from '@whiskeysockets/baileys'

const API_URL = 'https://api.stellarwa.xyz/anime/bluearchive?key=api-xyjFx'
const MAX_IMAGES = 5

const handler = {}

handler.run = async (sock, m) => {
    const chat = m.chat || m.key?.remoteJid

    await sock.sendMessage(chat, {
        react: {
            text: '🔎',
            key: m.key
        }
    }).catch(() => {})

    try {
        const imagenes = []

        // Obtener imágenes de Blue Archive
        for (let i = 0; i < MAX_IMAGES; i++) {
            try {
                const response = await axios.get(API_URL, {
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    headers: {
                        Accept: 'image/*'
                    }
                })

                const buffer = Buffer.from(response.data)
                const contentType =
                    response.headers['content-type'] || ''

                if (
                    buffer.length &&
                    contentType.includes('image')
                ) {
                    imagenes.push(buffer)
                }

            } catch (error) {
                console.error(
                    `[PEPE BLUEARCHIVE] Imagen ${i + 1}:`,
                    error.message
                )
            }
        }

        if (!imagenes.length) {
            throw new Error(
                'La API no devolvió imágenes válidas.'
            )
        }

        // Una imagen: envío normal
        if (imagenes.length === 1) {
            await sock.sendMessage(chat, {
                image: imagenes[0],
                caption:
                    '🐸 *PEPE BOT — BLUE ARCHIVE* 💚\n\n' +
                    '🎀 Imagen de Blue Archive\n' +
                    '💚 Disfruta de la imagen~'
            }, { quoted: m })

        } else {
            const Interactive =
                proto.Message.InteractiveMessage

            if (
                typeof Interactive?.fromObject !== 'function'
            ) {
                throw new Error(
                    'Baileys no tiene disponible InteractiveMessage.'
                )
            }

            const cards = []

            // Preparar las tarjetas
            for (let i = 0; i < imagenes.length; i++) {
                const media = await prepareWAMessageMedia(
                    {
                        image: imagenes[i]
                    },
                    {
                        upload: sock.waUploadToServer
                    }
                )

                if (!media?.imageMessage) continue

                cards.push({
                    header: {
                        title: '🐸 PEPE BOT',
                        hasMediaAttachment: true,
                        imageMessage: media.imageMessage
                    },

                    body: {
                        text:
                            '🎀 *BLUE ARCHIVE*\n\n' +
                            `🖼️ Imagen: ${i + 1}/${imagenes.length}\n` +
                            '✨ Personajes de Blue Archive'
                    },

                    footer: {
                        text: '💚 Pepe Bot 💚'
                    },

                    nativeFlowMessage: {
                        buttons: [],
                        messageVersion: 1
                    }
                })
            }

            if (!cards.length) {
                throw new Error(
                    'No se pudieron preparar las tarjetas.'
                )
            }

            // Construir carrusel
            const interactiveMessage =
                Interactive.fromObject({
                    body: {
                        text:
                            '🐸 💚 *PEPE BOT — BLUE ARCHIVE* 💚\n\n' +
                            '🎀 Imágenes de Blue Archive\n\n' +
                            `🖼️ Resultados: ${cards.length}\n\n` +
                            'Desliza para ver todas~ ✨'
                    },

                    footer: {
                        text: '🐸 PEPE BOT'
                    },

                    carouselMessage: {
                        cards,
                        messageVersion: 1
                    }
                })

            const message = generateWAMessageFromContent(
                chat,
                {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage
                        }
                    }
                },
                {
                    userJid: sock.user.id,
                    quoted: m
                }
            )

            if (!message?.message || !message?.key?.id) {
                throw new Error(
                    'No se pudo generar el carrusel.'
                )
            }

            await sock.relayMessage(
                chat,
                message.message,
                {
                    messageId: message.key.id
                }
            )
        }

        await sock.sendMessage(chat, {
            react: {
                text: '✅',
                key: m.key
            }
        }).catch(() => {})

    } catch (error) {
        console.error('[PEPE BLUEARCHIVE]', error)

        await sock.sendMessage(chat, {
            react: {
                text: '❌',
                key: m.key
            }
        }).catch(() => {})

        await sock.sendMessage(chat, {
            text:
                '❌ *PEPE BOT — BLUE ARCHIVE*\n\n' +
                'No se pudieron obtener las imágenes.\n\n' +
                `Error: ${error.message}`
        }, { quoted: m })
    }
}

handler.command = ['anime']
handler.help = ['anime']
handler.tags = ['herramientas']
handler.menu = true

export default handler
