
import yts from 'yt-search'
import { generateWAMessageContent } from '@whiskeysockets/baileys'

const handler = {
    command: ['play'],

    run: async (sock, m, args, context) => {
        const text = args.join(' ').trim()

        if (!text) {
            return m.reply(
                '❗ Escribe el nombre de la canción o video.\n\n' +
                'Ejemplo: .play Bad Bunny'
            )
        }

        try {
            await m.reply('🔎 Buscando resultados...')

            const result = await yts(text)
            const video = result.all?.[0]

            if (!video) {
                return m.reply('❌ No encontré resultados.')
            }

            const sender = m.sender || m.key?.participant || m.key?.remoteJid
            const chat = m.chat || m.key?.remoteJid
            const prefix = '.'

            const body =
                `🎵 *TIBU BOT — PLAY*\n\n` +
                `Hola @${sender.split('@')[0]} 👋\n\n` +
                `📌 *Resultado encontrado:*\n` +
                `🎶 *Título:* ${video.title}\n` +
                `⏱️ *Duración:* ${video.timestamp || 'Desconocida'}\n` +
                `👤 *Canal:* ${video.author?.name || 'Desconocido'}\n\n` +
                `Selecciona el formato que deseas descargar:`

            const { imageMessage } = await generateWAMessageContent(
                { image: { url: video.thumbnail } },
                { upload: sock.waUploadToServer }
            )

            const msg = {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: {
                            body: { text: body },
                            footer: {
                                text: '🌊 𝐓𝐈𝐁𝐔 𝐁𝐎𝐓 🦈'
                            },
                            header: {
                                hasMediaAttachment: true,
                                imageMessage
                            },
                            contextInfo: {
                                mentionedJid: [sender]
                            },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: 'single_select',
                                        buttonParamsJson: JSON.stringify({
                                            title: '📥 ELEGIR FORMATO',
                                            sections: [
                                                {
                                                    title: '🎧 AUDIO',
                                                    rows: [
                                                        {
                                                            title: '🎵 Descargar MP3',
                                                            description: 'Audio en formato MP3',
                                                            id: `${prefix}ytmp3 ${video.url}`
                                                        },
                                                        {
                                                            title: '📄 MP3 como documento',
                                                            description: 'Audio enviado como archivo',
                                                            id: `${prefix}ytmp3doc ${video.url}`
                                                        }
                                                    ]
                                                },
                                                {
                                                    title: '🎬 VIDEO',
                                                    rows: [
                                                        {
                                                            title: '📹 Descargar MP4',
                                                            description: 'Video en formato MP4',
                                                            id: `${prefix}ytmp4 ${video.url}`
                                                        },
                                                        {
                                                            title: '📄 MP4 como documento',
                                                            description: 'Video enviado como archivo',
                                                            id: `${prefix}ytmp4doc ${video.url}`
                                                        }
                                                    ]
                                                },
                                                {
                                                    title: 'ℹ️ INFORMACIÓN',
                                                    rows: [
                                                        {
                                                            title: '🔗 Abrir en YouTube',
                                                            description: 'Ver el video original',
                                                            id: `${prefix}ytlink ${video.url}`
                                                        }
                                                    ]
                                                }
                                            ]
                                        })
                                    }
                                ]
                            }
                        }
                    }
                }
            }

            await sock.relayMessage(
                chat,
                msg.viewOnceMessage.message,
                { messageId: undefined }
            )

        } catch (e) {
            console.error('Error en comando play:', e)
            await m.reply(
                `❌ No pude generar el menú.\n\n${e.message || e}`
            )
        }
    }
}

export default handler
