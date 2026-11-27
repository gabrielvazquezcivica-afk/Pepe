
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
        // =================================
        // BUSCAR IMÁGENES
        // =================================

        const response = await axios.get(
            API_URL + encodeURIComponent(query),
            {
                timeout: 60000,
                headers: {
                    Accept: 'application/json'
                }
            }
        )

        const data = response.data

        if (
            !data?.status ||
            !Array.isArray(data.result) ||
            !data.result.length
        ) {
            throw new Error('La API no encontró imágenes.')
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

        // =================================
        // DESCARGAR Y PREPARAR IMÁGENES
        // =================================

        const imagenes = []

        for (const url of urls) {
            try {
                const result = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                })

                const buffer = Buffer.from(result.data)

                if (!buffer.length) continue

                imagenes.push(buffer)

            } catch (error) {
                console.error(
                    '[PEPE PIN] Error descargando imagen:',
                    error.message
                )
            }
        }

        if (!imagenes.length) {
            throw new Error('No se pudieron descargar las imágenes.')
        }

        // =================================
        // PREPARAR TARJETAS
        // =================================

        const cards = []

        for (let i = 0; i < imagenes.length; i++) {
            try {
                const media = await prepareWAMessageMedia(
                    {
                        image: imagenes[i]
                    },
                    {
                        upload: sock.waUploadToServer
                    }
                )

                if (!media?.imageMessage) {
                    throw new Error('No se pudo preparar la imagen.')
                }

                cards.push(
                    proto.Message.InteractiveMessage.NativeFlowMessage.fromObject
                        ? proto.Message.InteractiveMessage.CarouselMessage.Card.fromObject({
                            header: {
                                title: '🐸 PEPE BOT',
                                hasMediaAttachment: true,
                                ...media
                            },

                            body: {
                                text:
                                    '🎶 Pinterest\n\n' +
                                    '🎤 Autor: No disponible\n' +
                                    `🖼️ Imagen: ${i + 1}/${imagenes.length}`
                            },

                            footer: {
                                text: '💚 Pepe Pinterest 💚'
                            },

                            nativeFlowMessage: {
                                buttons: []
                            }
                        })
                        : {
                            header: {
                                title: '🐸 PEPE BOT',
                                hasMediaAttachment: true,
                                ...media
                            },

                            body: {
                                text:
                                    '🎶 Pinterest\n\n' +
                                    '🎤 Autor: No disponible\n' +
                                    `🖼️ Imagen: ${i + 1}/${imagenes.length}`
                            },

                            footer: {
                                text: '💚 Pepe Pinterest 💚'
                            },

                            nativeFlowMessage: {
                                buttons: []
                            }
                        }
                )

            } catch (error) {
                console.error(
                    `[PEPE PIN] Error preparando tarjeta ${i + 1}:`,
                    error.message
                )
            }
        }

        if (!cards.length) {
            throw new Error('No se pudieron preparar las tarjetas.')
        }

        // =================================
        // ENVIAR UNA SOLA IMAGEN
        // =================================

        if (cards.length === 1) {
            const media = await prepareWAMessageMedia(
                { image: imagenes[0] },
                { upload: sock.waUploadToServer }
            )

            await sock.sendMessage(chat, {
                image: imagenes[0],
                caption:
                    '🐸 *PEPE BOT — PINTEREST* 💚\n\n' +
                    `🔎 Búsqueda: ${query}\n` +
                    '🖼️ Imagen: 1/1'
            }, { quoted: m })

        } else {

            // =================================
            // CREAR CARRUSEL HORIZONTAL
            // =================================

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

                    header: {
                        title: 'Pinterest',
                        hasMediaAttachment: false
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
                throw new Error('No se pudo generar el mensaje del carrusel.')
            }

            await sock.relayMessage(
                chat,
                message.message,
                {
                    messageId: message.key.id
                }
            )
        }

        // =================================
        // FINALIZAR
        // =================================

        await sock.sendMessage(chat, {
            react: {
                text: '✅',
                key: m.key
            }
        }).catch(() => {})

    } catch (error) {
        console.error('[PEPE PIN ERROR]', error)

        await sock.sendMessage(chat, {
            react: {
                text: '❌',
                key: m.key
            }
        }).catch(() => {})

        await sock.sendMessage(chat, {
            text:
                '❌ *PEPE BOT — PINTEREST*\n\n' +
                'No se pudo enviar el carrusel.\n\n' +
                `📌 Error: ${error.message}`
        }, { quoted: m }).catch(() => {})
    }
}

handler.command = ['pin', 'pinterest']
handler.help = ['pin <búsqueda>']
handler.tags = ['buscador']
handler.menu = true

export default handler
