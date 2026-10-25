
const handler = {
    command: ['playmp4'],

    run: async (sock, m, args) => {
        const url = args[0]

        if (!url || !/^https:\/\/(www\.)?youtube\.com\/watch\?v=/i.test(url) &&
            !/^https:\/\/youtu\.be\//i.test(url)) {
            return m.reply('❌ El enlace de YouTube no es válido.')
        }

        try {
            await m.reply('🎬 Obteniendo el video MP4...')

            const api =
                'https://api-faa.my.id/faa/ytplayvid?q=' +
                encodeURIComponent(url)

            const response = await fetch(api)
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`)
            }

            const data = await response.json()
            const downloadUrl = data.result?.download_url

            if (!data.status || !downloadUrl) {
                throw new Error('La API no devolvió el enlace MP4.')
            }

            await sock.sendMessage(
                m.chat,
                {
                    video: { url: downloadUrl },
                    mimetype: 'video/mp4',
                    fileName: 'PEPE-BOT.mp4',
                    caption: '🎬 *Descargado por PEPE BOT* 🐸'
                },
                { quoted: m }
            )

        } catch (error) {
            console.error('[PEPE MP4]', error)
            await m.reply(
                `❌ No se pudo enviar el video.\n${error.message || error}`
            )
        }
    }
}

export default handler
