
import axios from 'axios'

import {
    proto,
    prepareWAMessageMedia,
    generateWAMessageFromContent
} from '@whiskeysockets/baileys'

const API_URL = 'https://api-faa.my.id/faa/pinterest?q='
const MAX_IMAGES = 10

const handler = {}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const query = args.join(' ').trim()

    if (!query) {
        return sock.sendMessage(chat, {
            text:
                '🐸 *PEPE BOT — PINTEREST* 💚\n\n' +
                '📌 Escribe qué imágenes quieres buscar.\n\n' +
                '✨ *Ejemplo:* .pin ranitas aesthetic'
        }, { quoted: m })
    }

    await sock.sendMessage(chat, {
        react: { text: '🔎', key: m.key }
    }).catch(() => {})

    try {
        // Buscar imágenes
        const response = await axios.get(
            API_URL + encodeURIComponent(query),
            {
                timeout: 60000,
                headers: { Accept: 'application/json' }
            }
        )

        const data = response.data

        if (
            !data?.status ||
            !Array.isArray(data.result) ||
            !data.result.length
        ) {
            throw new Error('No se encontraron imágenes.')
        }

        const urls = [
            ...new Set(
                data.result.filter(url =>
                    typeof url === 'string' &&
                    /^https:\/\/i\.pinimg\.com\//i.test(url)
                )
            )
        ].slice(0, MAX_IMAGES)

        if (!urls.length) {
            throw new Error('No hay imágenes válidas.')
        }

        // Descargar y preparar las imágenes
        const cards = []

        for (const url of urls) {
            try {
                const result = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                })

                const buffer = Buffer.from(result.data)

                if (!buffer.length) continue

                const media = await prepareWAMessageMedia(
                    { image: buffer },
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
                            '🎶 Pinterest\n\n' +
                            '🎤 Autor: No disponible\n' +
                            `🖼️ Imagen: ${cards.length + 1}/${urls.length}`
                    },

                    footer: {
                        text: '💚 Pepe Pinterest 💚'
                    }
                })

            } catch (error) {
                console.error(
                    '[PEPE PIN] Error preparando imagen:',
                    error.message
                )
            }
        }

        if (!cards.length) {
            throw new Error('No se pudieron preparar las imágenes.')
        }

        // Una sola imagen: enviar normalmente
        if (cards.length === 1) {
            const media = await sock.sendMessage(chat, {
                image: urls[0],
                caption:
                    '🐸 *PEPE BOT — PINTEREST* 💚\n\n' +
                    `🔎 Búsqueda: ${query}\n` +
                    '🖼️ Imagen: 1/1'
            }, { quoted: m })

            if (!media) {
                throw new Error('No se pudo enviar la imagen.')
            }

        } else {
            // Crear carrusel horizontal
            const interactiveMessage =
                proto.Message.InteractiveMessage.fromObject({
                    body: {
                        text:
                            '💚 *PEPE BOT — PINTEREST* 💚\n\n' +
                            'Desliza y disfruta~ ✨\n\n' +
                            `🔎 Búsqueda: ${query}\n` +
                            `🖼️ Resultados: ${cards.length} imágenes\n\n` +
                            'Desliza para ver todas~'
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
                    userJid: sock.user?.id,
                    quoted: m
                }
            )

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
        console.error('[PEPE PIN]', error)

        await sock.sendMessage(chat, {
            react: {
                text: '❌',
                key: m.key
            }
        }).catch(() => {})

        await sock.sendMessage(chat, {
            text:
                '❌ *PEPE BOT — PINTEREST*\n\n' +
                'No se pudo crear el carrusel.\n\n' +
                `Detalle: ${error.message}`
        }, { quoted: m }).catch(() => {})
    }
}

handler.command = ['pin', 'pinterest']
handler.help = ['pin <búsqueda>']
handler.tags = ['buscador']
handler.menu = true

export default handler
