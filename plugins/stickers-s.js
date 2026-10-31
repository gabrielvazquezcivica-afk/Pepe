import { toSticker } from '../lib/sticker.js'

const handler = {}

handler.run = async (sock, m) => {
    try {
        const quoted = m.quoted || m
        const mime = quoted.mimetype || quoted.msg?.mimetype || ''

        const isImage = mime.startsWith('image/')
        const isVideo = mime.startsWith('video/')

        if (!isImage && !isVideo) {
            return m.reply(
                '> 🐸 Responde a una imagen o video con el comando *.s* para convertirlo en sticker.'
            )
        }

        if (isVideo) {
            const seconds = quoted.seconds || quoted.msg?.seconds || 0

            if (seconds > 10) {
                return m.reply('> ❌ El video no puede durar más de 10 segundos.')
            }
        }

        await sock.sendMessage(m.chat, {
            react: {
                text: '⏳',
                key: m.key
            }
        })

        const buffer = await quoted.download()

        if (!buffer) {
            throw new Error('No se pudo descargar el archivo.')
        }

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
        console.error('Error en comando .s:', error)

        await m.reply('> ❌ Ocurrió un error al crear el sticker.')
    }
}

handler.command = ['s', 'sticker']
handler.help = ['s']
handler.tags = ['herramientas']
handler.menu = true

export default handler