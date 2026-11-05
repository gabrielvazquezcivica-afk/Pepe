
import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const API = 'https://api-faa.my.id/faa/pin-down?url='

const handler = {}

handler.run = async (sock, m, args = []) => {
    const url = args.join(' ').trim()

    if (!url) {
        return m.reply(
            '🐸 *PEPE BOT — PIN2*\n\n' +
            '📌 Descarga imágenes de Pinterest.\n\n' +
            '*Ejemplo:*\n.pin2 https://pin.it/xxxxx'
        )
    }

    if (!/^https?:\/\//i.test(url)) {
        return m.reply('❌ Enlace no válido.')
    }

    try {
        await m.reply('🔎 Obteniendo imágenes de Pinterest...')

        const response = await fetch(API + encodeURIComponent(url), {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            signal: AbortSignal.timeout(30000)
        })

        if (!response.ok) {
            throw new Error(`API respondió ${response.status}`)
        }

        const data = await response.json()

        if (!data.status || !data.result?.medias?.length) {
            return m.reply('❌ No se encontraron imágenes en ese enlace.')
        }

        const imagenes = data.result.medias.filter(media =>
            media.type === 'image' && media.url
        )

        if (!imagenes.length) {
            return m.reply('❌ No se encontraron imágenes disponibles.')
        }

        const titulo = data.result.title || 'Imágenes de Pinterest'

        await m.reply(
            `📌 *PINTEREST DESCARGADO*\n\n` +
            `📝 ${titulo}\n\n` +
            `🖼️ Imágenes encontradas: ${imagenes.length}\n` +
            `🐸 PEPE BOT`
        )

        for (const media of imagenes) {
            try {
                const imagen = await fetch(media.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    },
                    signal: AbortSignal.timeout(30000)
                })

                if (!imagen.ok) continue

                const buffer = Buffer.from(await imagen.arrayBuffer())

                if (!buffer.length) continue

                await sock.sendMessage(
                    m.chat,
                    {
                        image: buffer
                    },
                    { quoted: m }
                )
            } catch (error) {
                console.error('[PIN2] Error enviando imagen:', error.message)
            }
        }

    } catch (error) {
        console.error('[PIN2] Error:', error)
        return m.reply('❌ No se pudo descargar el contenido de Pinterest.')
    }
}

handler.command = ['pin2']
handler.help = ['pin2']
handler.tags = ['buscador']
handler.menu = true

export default handler
