
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import pino from 'pino'

const API = 'https://api-faa.my.id/faa/superhd?url='
const logger = pino({ level: 'silent' })

const handler = {}

function desenvolverMensaje(contenido) {
    let actual = contenido

    while (actual) {
        if (actual.ephemeralMessage?.message) {
            actual = actual.ephemeralMessage.message
            continue
        }

        if (actual.viewOnceMessage?.message) {
            actual = actual.viewOnceMessage.message
            continue
        }

        if (actual.viewOnceMessageV2?.message) {
            actual = actual.viewOnceMessageV2.message
            continue
        }

        if (actual.documentWithCaptionMessage?.message) {
            actual = actual.documentWithCaptionMessage.message
            continue
        }

        break
    }

    return actual || {}
}

function obtenerImagen(contenido, profundidad = 0) {
    if (!contenido || typeof contenido !== 'object' || profundidad > 8) {
        return null
    }

    const mensaje = desenvolverMensaje(contenido)

    if (mensaje.imageMessage) {
        return mensaje.imageMessage
    }

    for (const valor of Object.values(mensaje)) {
        if (valor && typeof valor === 'object') {
            const encontrada = obtenerImagen(valor, profundidad + 1)
            if (encontrada) return encontrada
        }
    }

    return null
}

function obtenerFuente(m) {
    const citados = [
        m.quoted?.fakeObj,
        m.quoted
    ]

    for (const citado of citados) {
        if (!citado) continue

        const contenido = citado.message || citado.msg || citado

        if (obtenerImagen(contenido)) {
            return citado.message
                ? citado
                : {
                    key: citado.key || m.key,
                    message: contenido
                }
        }
    }

    if (obtenerImagen(m.message)) {
        return m
    }

    return null
}

async function descargarImagen(mensaje, sock) {
    return downloadMediaMessage(
        mensaje,
        'buffer',
        {},
        {
            logger,
            reuploadRequest: sock.updateMediaMessage
        }
    )
}

async function mejorarImagen(buffer, mime) {
    const dataURL = `data:${mime};base64,${buffer.toString('base64')}`

    const response = await fetch(
        API + encodeURIComponent(dataURL),
        {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            signal: AbortSignal.timeout(90000)
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
        data.result?.downloadUrl ||
        data.result?.url ||
        data.result?.image ||
        data.result?.img ||
        data.result?.base64 ||
        data.downloadUrl ||
        data.url ||
        data.result

    if (typeof resultado !== 'string') {
        throw new Error('La API no devolvió una imagen reconocible')
    }

    if (/^https?:\/\//i.test(resultado)) {
        const descarga = await fetch(resultado, {
            signal: AbortSignal.timeout(90000)
        })

        if (!descarga.ok) {
            throw new Error('No se pudo descargar la imagen HD')
        }

        return Buffer.from(await descarga.arrayBuffer())
    }

    const base64 = resultado.replace(
        /^data:image\/[^;]+;base64,/i,
        ''
    )

    const imagen = Buffer.from(base64, 'base64')

    if (!imagen.length) {
        throw new Error('La imagen recibida está vacía')
    }

    return imagen
}

handler.run = async (sock, m) => {
    try {
        const chat = m.chat || m.key.remoteJid
        const fuente = obtenerFuente(m)

        if (!fuente) {
            return m.reply(
                '📸 Responde a una imagen con `.hd` o envía una imagen junto al comando.'
            )
        }

        const datosImagen = obtenerImagen(fuente.message)

        if (!datosImagen) {
            return m.reply('❌ No pude reconocer la imagen.')
        }

        // Reacción sin enviar mensaje de espera.
        await sock.sendMessage(chat, {
            react: {
                text: '✨',
                key: m.key
            }
        })

        const buffer = await descargarImagen(fuente, sock)

        if (!buffer?.length) {
            throw new Error('No se pudo descargar la imagen original')
        }

        const mime = datosImagen.mimetype || 'image/jpeg'

        const resultado = await mejorarImagen(buffer, mime)

        await sock.sendMessage(
            chat,
            {
                image: resultado,
                caption: '> 🖼️ Imagen mejorada'
            },
            {
                quoted: m
            }
        )

    } catch (error) {
        console.error('[HD] Error:', error)

        await m.reply(
            `❌ No se pudo mejorar la imagen.\n\n> ${error.message || 'Error desconocido'}`
        )
    }
}

handler.command = ['hd']
handler.help = ['hd']
handler.tags = ['herramientas']
handler.menu = true

export default handler
