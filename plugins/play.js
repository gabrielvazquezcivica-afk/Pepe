
const handler = {
    command: ['play'],

    run: async (sock, m, args) => {
        const query = args.join(' ').trim()
        const prefix = '.'

        if (!query) {
            return m.reply('❗ Ejemplo: .play Table Dance')
        }

        let timer

        try {
            const api =
                'https://api-faa.my.id/faa/ytplay?query=' +
                encodeURIComponent(query)

            const response = await Promise.race([
                fetch(api),
                new Promise((_, reject) => {
                    timer = setTimeout(
                        () => reject(new Error('La API tardó demasiado')),
                        15000
                    )
                })
            ])

            clearTimeout(timer)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()
            const video = data.result

            if (!data.status || !video?.url || !video?.mp3) {
                throw new Error('No se encontró el resultado.')
            }

            const chat = m.chat || m.key.remoteJid

            // Obtener la miniatura para mostrarla en la ficha.
            const { generateWAMessageContent } =
                await import('@whiskeysockets/baileys')

            const { imageMessage } = await generateWAMessageContent(
                { image: { url: video.thumbnail } },
                { upload: sock.waUploadToServer }
            )

            const body =
                `🐸 *𝐏𝐄𝐏𝐄 𝐁𝐎𝐓*\n\n` +
                `🎵 *${video.title}*\n\n` +
                `👤 Artista: ${video.author || 'Desconocido'}\n` +
                `⏱️ Duración: ${video.duration_timestamp || 'N/A'}\n` +
                `👁️ Vistas: ${Number(video.views || 0).toLocaleString('es-MX')}\n\n` +
                `📥 Selecciona audio o video:`

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
                            header: {
                                hasMediaAttachment: true,
                                imageMessage
                            },
                            nativeFlowMessage: {
                                buttons: [{
                                    name: 'single_select',
                                    buttonParamsJson: JSON.stringify({
                                        title: '📥 ELEGIR FORMATO',
                                        sections: [{
                                            title: 'DESCARGAS',
                                            rows: [
                                                {
                                                    title: '🎧 Descargar audio MP3',
                                                    description: 'Audio de la canción',
                                                    id: `${prefix}playaudio ${video.url}`
                                                },
                                                {
                                                    title: '🎬 Descargar video MP4',
                                                    description: 'Video de la canción',
                                                    id: `${prefix}playmp4 ${video.url}`
                                                }
                                            ]
                                        }]
                                    })
                                }]
                            }
                        }
                    }
                }
            }

            await sock.relayMessage(
                chat,
                msg.viewOnceMessage.message,
                {}
            )

        } catch (error) {
            clearTimeout(timer)
            console.error('[PEPE PLAY]', error)
            await m.reply(`❌ Error en Play: ${error.message || error}`)
        }
    }
}

export default handler
