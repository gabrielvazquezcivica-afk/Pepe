import axios from 'axios'
import { toSticker } from '../lib/sticker.js'

const API_URL = 'https://api-faa.my.id/faa/brathd'

const handler = {}

handler.run = async (sock, m, args) => {
    try {
        const texto = args.join(' ').trim()

        if (!texto) {
            return m.reply('> 🐸 Escribe el texto para crear tu Brat.\n\nEjemplo: *.brat Pepe Bot*')
        }

        if (texto.length > 500) {
            return m.reply('> ❌ El texto no puede superar los 500 caracteres.')
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
            timeout: 60000
        })

        const imagen = Buffer.from(response.data)

        if (!imagen.length) {
            throw new Error('La API no devolvió ninguna imagen.')
        }

        const webp = await toSticker(imagen)

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
        console.error('Error en .brat:', error.response?.data || error)

        await m.reply('❌ No se pudo generar el Brat. Inténtalo nuevamente.')
    }
}

handler.command = ['brat']
handler.help = ['brat <texto>']
handler.tags = ['herramientas']
handler.menu = true

export default handler