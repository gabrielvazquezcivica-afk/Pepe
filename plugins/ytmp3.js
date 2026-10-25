
const handler = {
    command: ['playaudio'],

    run: async (sock, m, args) => {
        const url = args[0]

        if (!url || !url.startsWith('https://')) {
            return m.reply('❌ El enlace de audio no es válido.')
        }

        try {
            await sock.sendMessage(
                m.chat,
                {
                    audio: { url },
                    mimetype: 'audio/mpeg',
                    fileName: 'PEPE-BOT.mp3'
                },
                { quoted: m }
            )
        } catch (error) {
            console.error('[PEPE AUDIO]', error)
            await m.reply('❌ No se pudo enviar el MP3.')
        }
    }
}

export default handler
