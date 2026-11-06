
const API = 'https://api-faa.my.id/faa/hdv4?image='

const handler = {}

function obtenerImagen(m) {
    const mensaje = m.message || {}
    const citado = m.quoted?.message || {}

    const contenido = {
        ...mensaje,
        ...citado
    }

    const imagen =
        contenido.imageMessage ||
        contenido.viewOnceMessage?.message?.imageMessage ||
        contenido.viewOnceMessageV2?.message?.imageMessage

    return imagen
}

handler.run = async (sock, m) => {
    try {
        const imagen = obtenerImagen(m)

        if (!imagen) {
            return m.reply(
                '🐸 *PEPE BOT — HD*\n\n' +
                'Envía una imagen con el comando `.hd` o responde a una imagen con `.hd`.'
            )
        }

        const buffer = await sock.downloadMediaMessage(
            m.quoted?.message ? m.quoted : m
        ).catch(() => null)

        if (!buffer) {
            return m.reply('❌ No pude descargar la imagen.')
        }

        await m.reply('✨ Mejorando calidad de imagen...')

        const base64 = buffer.toString('base64')
        const mime = imagen.mimetype || 'image/jpeg'

        const response = await fetch(
            API + encodeURIComponent(`data:${mime};base64,${base64}`),
            {
                signal: AbortSignal.timeout(60000)
            }
        )

        if (!response.ok) {
            throw new Error(`API respondió ${response.status}`)
        }

        const data = await response.json()

        if (data.status === false) {
            throw new Error(data.message || 'La API rechazó la imagen')
        }

        const resultado =
            data.result?.url ||
            data.result?.image ||
            data.result?.downloadUrl ||
            data.result ||
            data.url

        let imagenFinal

        if (typeof resultado === 'string' && resultado.startsWith('data:image')) {
            imagenFinal = Buffer.from(resultado.split(',')[1], 'base64')
        } else if (typeof resultado === 'string' && /^https?:\/\//i.test(resultado)) {
            const descarga = await fetch(resultado, {
                signal: AbortSignal.timeout(60000)
            })

            if (!descarga.ok) throw new Error('No se pudo descargar el resultado')

            imagenFinal = Buffer.from(await descarga.arrayBuffer())
        } else if (typeof resultado === 'string' && resultado.length > 100) {
            imagenFinal = Buffer.from(resultado, 'base64')
        } else {
            throw new Error('Formato de respuesta desconocido')
        }

        await sock.sendMessage(
            m.chat,
            {
                image: imagenFinal,
                caption: '✨ *Imagen mejorada a HD*\n🐸 PEPE BOT'
            },
            { quoted: m }
        )

    } catch (error) {
        console.error('[HD] Error:', error)
        return m.reply('❌ No se pudo mejorar la imagen. Inténtalo nuevamente.')
    }
}

handler.command = ['hd']
handler.help = ['hd']
handler.tags = ['herramientas']
handler.menu = true

export default handler
