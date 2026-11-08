
const API = 'https://api-faa.my.id/faa/igdl?url='

const handler = {}

function obtenerUrl(m, args) {
    const texto = [
        args.join(' '),
        m.text || '',
        m.body || ''
    ].filter(Boolean).join(' ')

    return texto.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s]+/i)?.[0]
}

handler.run = async (sock, m, args = []) => {
    try {
        const url = obtenerUrl(m, args)

        if (!url) {
            return m.reply(
                '🐸 *PEPE BOT — INSTAGRAM DOWNLOADER*\n\n' +
                '❌ Ingresa un enlace de Instagram.\n\n' +
                '*Ejemplo:*\n' +
                '.ig https://www.instagram.com/reel/XXXXXXXX/'
            )
        }

        await m.reply('⏳ Descargando contenido de Instagram...')

        const respuesta = await fetch(
            API + encodeURIComponent(url),
            {
                method: 'GET',
                headers: {
                    accept: 'application/json'
                },
                signal: AbortSignal.timeout(60000)
            }
        )

        if (!respuesta.ok) {
            throw new Error(`API respondió ${respuesta.status}`)
        }

        const data = await respuesta.json()

        if (!data.status || !Array.isArray(data.result?.url) || !data.result.url.length) {
            return m.reply('❌ No se pudo obtener el contenido. Verifica el enlace e inténtalo nuevamente.')
        }

        const resultado = data.result
        const metadata = resultado.metadata || {}
        const enlaces = resultado.url.filter(Boolean)

        for (const mediaUrl of enlaces) {
            const esVideo = metadata.isVideo === true ||
                /\.mp4(?:[?#]|$)/i.test(mediaUrl)

            if (esVideo) {
                await sock.sendMessage(m.chat, {
                    video: { url: mediaUrl },
                    caption: `🐸 *PEPE BOT — INSTAGRAM*\n\n${metadata.caption || '✅ Video descargado correctamente.'}`,
                    mimetype: 'video/mp4'
                }, { quoted: m })
            } else {
                await sock.sendMessage(m.chat, {
                    image: { url: mediaUrl },
                    caption: '🐸 *PEPE BOT — INSTAGRAM*\n\n✅ Imagen descargada correctamente.'
                }, { quoted: m })
            }
        }

    } catch (error) {
        console.error('[IG DOWNLOADER]', error)

        return m.reply(
            '❌ Ocurrió un error al descargar el contenido de Instagram.\n\n' +
            'Puede que el enlace no esté disponible o que la API esté temporalmente caída.'
        )
    }
}

handler.command = ['ig', 'instagram', 'igdl']
handler.help = ['ig']
handler.tags = ['descargas']
handler.menu = true

export default handler
