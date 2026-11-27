
import axios from 'axios'

const handler = {}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid

    try {
        let url = args.join(' ').trim()

        if (!url && m.quoted) {
            url = m.quoted.text || ''
        }

        if (!url) {
            return m.reply(
                '> ⚠️ Envía un enlace de TikTok.\n\n' +
                '> Ejemplo: .tt https://www.tiktok.com/@usuario/video/123'
            )
        }

        if (!/tiktok\.com/i.test(url)) {
            return m.reply('> ❌ El enlace debe ser de TikTok.')
        }

        // Reacción de búsqueda
        await sock.sendMessage(chat, {
            react: {
                text: '🔎',
                key: m.key
            }
        })

        const api = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`

        const { data } = await axios.get(api, {
            timeout: 60000
        })

        if (!data?.status || !data?.result) {
            return m.reply('> ❌ No se pudo obtener el contenido.')
        }

        const r = data.result

        const caption =
            `> 🎵 *TIKTOK DESCARGADO*\n\n` +
            `> 👤 ${r.author?.nickname || 'Desconocido'} (@${r.author?.username || 'usuario'})\n` +
            `> 📝 ${r.title || 'Sin descripción'}\n` +
            `> 👁️ ${r.stats?.views || '0'} vistas\n` +
            `> ❤️ ${r.stats?.likes || '0'} me gusta\n` +
            `> ⏱️ ${r.duration || 'Sin duración'}`

        // Publicaciones de imágenes
        if (r.type === 'image') {
            const imagenes = Array.isArray(r.data) ? r.data : []

            if (!imagenes.length) {
                return m.reply('> ❌ No se encontraron imágenes.')
            }

            await sock.sendMessage(chat, {
                text: `${caption}\n\n> 🖼️ Fotos: ${imagenes.length}`
            }, { quoted: m })

            for (const imagen of imagenes) {
                const imageUrl = typeof imagen === 'string'
                    ? imagen
                    : imagen.url

                if (!imageUrl) continue

                await sock.sendMessage(chat, {
                    image: { url: imageUrl }
                }, { quoted: m })
            }

            await sock.sendMessage(chat, {
                react: { text: '✅', key: m.key }
            })

            return
        }

        // Obtener video: HD > SD > principal > WM
        const video =
            r.alternatives?.hd ||
            r.alternatives?.sd ||
            r.data ||
            r.alternatives?.selected ||
            r.alternatives?.wm

        if (!video || typeof video !== 'string') {
            console.log('[TIKTOK] Respuesta:', JSON.stringify(data, null, 2))
            return m.reply('> ❌ No se encontró el enlace del video.')
        }

        // Descargar video
        const response = await axios.get(video, {
            responseType: 'arraybuffer',
            timeout: 120000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            maxContentLength: 100 * 1024 * 1024
        })

        const buffer = Buffer.from(response.data)

        if (!buffer.length) {
            return m.reply('> ❌ El video llegó vacío.')
        }

        // Enviar video
        await sock.sendMessage(chat, {
            video: buffer,
            mimetype: 'video/mp4',
            caption
        }, { quoted: m })

        // Reacción final
        await sock.sendMessage(chat, {
            react: {
                text: '✅',
                key: m.key
            }
        })

    } catch (error) {
        console.error('[PEPE TIKTOK]', error.response?.data || error.message)

        await m.reply(
            '> ❌ Ocurrió un error al descargar el TikTok.'
        )
    }
}

handler.command = ['tt', 'tiktok']
handler.help = ['tt <enlace>']
handler.tags = ['descargas']
handler.menu = true

export default handler
