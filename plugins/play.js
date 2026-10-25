
const handler = {
    command: ['play'],

    run: async (sock, m, args) => {
        const query = args.join(' ').trim()

        if (!query) {
            return m.reply(
                '❗ Escribe el nombre de una canción o video.\n\n' +
                'Ejemplo: .play La Santa Grifa'
            )
        }

        try {
            await m.reply('🔎 PEPE BOT está buscando tu canción...')

            const api =
                'https://api-faa.my.id/faa/ytplay?query=' +
                encodeURIComponent(query)

            const response = await fetch(api)
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status} en la API`)
            }

            const data = await response.json()
            const video = data.result

            if (!data.status || !video?.url || !video?.mp3) {
                throw new Error('La API no devolvió un resultado válido.')
            }

            const chat = m.chat || m.key.remoteJid
            const body =
                `🐸 *𝐏𝐄𝐏𝐄 𝐁𝐎𝐓*\n\n` +
                `🎵 *${video.title}*\n\n` +
                `👤 *Artista:* ${video.author || 'Desconocido'}\n` +
                `⏱️ *Duración:* ${video.duration_timestamp || 'Desconocida'}\n` +
                `👁️ *Vistas:* ${Number(video.views || 0).toLocaleString('es-MX')}\n\n` +
                `📥 Selecciona el formato que deseas:`

            const msg = {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: {
                            body: { text: body },
                            footer: { text: '🐸 𝐏𝐄𝐏𝐄 𝐁𝐎𝐓' },
                            header: { title: '🎶 PLAY' },
                            nativeFlowMessage: {
                                buttons: [{
                                    name: 'single_select',
                                    buttonParamsJson: JSON.stringify({
                                        title: '📥 ELEGIR FORMATO',
                                        sections: [
                                            {
                                                title: '🎧 AUDIO',
                                                rows: [
                                                    {
                                                        title: '🎵 Descargar MP3',
                                                        description: 'Audio',
                                                        id: `.playaudio ${video.url}`
                                                    }
                                                ]
                                            },
                                            {
                                                title: '🎬 VIDEO',
                                                rows: [
                                                    {
                                                        title: '📹 Descargar MP4',
                                                        description: 'Video',
                                                        id: `.playmp4 ${video.url}`
                                                    }
                                                ]
                                            },
                                            {
                                                title: 'ℹ️ INFORMACIÓN',
                                                rows: [{
                                                    title: '🔗 Abrir en YouTube',
                                                    description: 'Ver video original',
                                                    id: `.playlink ${video.url}`
                                                }]
                                            }
                                        ]
                                    })
                                }]
                            }
                        }
                    }
                }
            }

            await sock.relayMessage(chat, msg.viewOnceMessage.message, {})

        } catch (error) {
            console.error('[PEPE PLAY]', error)
            await m.reply(
                `❌ Error en Play:\n${error.message || error}`
            )
        }
    }
}

export default handler
