
import axios from 'axios'

const API_URL = 'https://api.waifu.pics/sfw/waifu'

const handler = {}

handler.run = async (sock, m) => {
    const chat = m.chat || m.key?.remoteJid

    try {
        await sock.sendMessage(chat, {
            react: {
                text: '🎨',
                key: m.key
            }
        })

        const { data } = await axios.get(API_URL, {
            timeout: 15000
        })

        if (!data?.url) {
            throw new Error('La API no devolvió una imagen.')
        }

        const imagen = await axios.get(data.url, {
            responseType: 'arraybuffer',
            timeout: 20000
        })

        await sock.sendMessage(chat, {
            image: Buffer.from(imagen.data),
            caption: '🐸 *PEPE BOT — ANIME*\n\n✨ Aquí tienes tu imagen aleatoria de anime.'
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[ANIME] Error:', error.message)

        await m.reply(
            '❌ No pude obtener la imagen de anime. Inténtalo nuevamente.'
        )
    }
}

handler.command = ['anime', 'waifu']
handler.help = ['anime']
handler.tags = ['herramientas']
handler.menu = true

export default handler
