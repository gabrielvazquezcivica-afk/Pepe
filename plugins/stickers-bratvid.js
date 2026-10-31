import axios from 'axios'
import { toSticker } from '../lib/sticker.js'

const API_URL = 'https://api-faa.my.id/faa/bratvid'

const handler = {}

handler.run = async (sock, m, args) => {
    try {
        const texto = args.join(' ').trim()

        if (!texto) {
            return m.reply(
                '🐸 Escribe el texto para crear tu Brat animado.\n\nEjemplo: *.bratv Pepe Bot*'
            )
        }

        if (texto.length > 300) {
            return m.reply('❌ Máximo 300 caracteres.')
        }

        await sock.sendMessage(m.chat, {
            react: {
                text: '⏳',
                key: m.key
            }
        })

        const response = await axios.get(API_URL, {
            params: { text: texto },
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                Accept: 'video/*'
            }
        })

        const video = Buffer.from(response.data)

        if (!video.length) {
            throw new Error('La API no devolvió un video.')
        }

        const webp = await toSticker(video, true)

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
        console.error('Error .bratv:', error.message)

        await m.reply('❌ No se pudo generar el Brat animado.')
    }
}

handler.command = ['bratv']
handler.help = ['bratv <texto>']
handler.tags = ['stickers']
handler.menu = true

export default handler