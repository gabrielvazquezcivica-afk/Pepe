
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import pino from 'pino'

const API = 'https://api-faa.my.id/faa/hdv4?image='
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
            const encontrado = obtenerImagen(valor, profundidad + 1)
            if (encontrado) return encontrado
        }
    }

    return null
}

function obtenerFuente(m) {
    // Primero revisamos la imagen citada.
    const citados = [
        m.quoted?.fakeObj,
        m.quoted
    ]

    for (const citado of citados) {
        if (!citado) continue

        const contenido = citado.message || citado.msg || citado

        if (obtenerImagen(contenido)) {
            // downloadMediaMessage necesita un mensaje completo.
            if (citado.message) return citado

            return {
                key: citado.key || m.key,
                message: contenido
            }
        }
    }

    // Si no hay imagen citada, revisamos el mensaje actual.
    if (obtenerImagen(m.message)) {
        return m
    }

    return null
}

async function descargarImagen(mensaje) {
    return downloadMediaMessage(
        mensaje,
        'buffer',
        {},
        {
            logger,
            reuploadRequest: async msg =>
                await sockActual.updateMediaMessage(msg)
        }
    )
}

let sockActual = null

async function mejorarImagen(buffer, mime) {
    const base64 = buffer.toString('base64')
    const imagenData = `data:${mime};base64,${base64}`

    const response = await fetch(
        API + encodeURIComponent(imagenData),
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

    const base64Resultado = resultado.replace(
        /^data:image\/[^;]+;base64,/i,
        ''
    )

    const imagen = Buffer.from(base64Resultado, 'base64')

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
                '🐸 *PEPE BOT — HD*\n\n' +
                '📸 No encontré ninguna imagen.\n\n' +
                'Puedes:\n' +
                '• Enviar una imagen con el comando `.hd`.\n' +
                '• Responder directamente a una imagen con `.hd`.'
            )
        }

        const datosImagen = obtenerImagen(fuente.message)

        if (!datosImagen) {
            return m.reply('❌ No pude identificar la imagen.')
        }

        await m.reply('✨ Mejorando imagen a HD, espera un momento...')

        const buffer = await downloadMediaMessage(
            fuente,
            'buffer',
            {},
            {
                logger,
                reuploadRequest: sock.updateMediaMessage
            }
        )

        if (!buffer?.length) {
            throw new Error('No se pudo descargar la imagen original')
        }

        const mime = datosImagen.mimetype || 'image/jpeg'

        const imagenFinal = await mejorarImagen(buffer, mime)

        await sock.sendMessage(
            chat,
            {
                image: imagenFinal,
                caption: '✨ *IMAGEN MEJORADA A HD*\n\n🐸 PEPE BOT'
            },
            { quoted: m }
        )

    } catch (error) {
        console.error('[HD] Error:', error)

        await m.reply(
            '❌ No se pudo mejorar la imagen.\n\n' +
            `⚠️ ${error.message || 'Error desconocido'}`
        )
    }
}

handler.command = ['hd']
handler.help = ['hd']
handler.tags = ['herramientas']
handler.menu = true

export default handler
