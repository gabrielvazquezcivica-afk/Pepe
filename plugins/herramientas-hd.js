
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import pino from 'pino'

const API = 'https://api-faa.my.id/faa/superhd?url='
const UPLOAD_API = 'https://catbox.moe/user/api.php'

const logger = pino({ level: 'silent' })
const handler = {}

function desenvolverMensaje(contenido) {
    let actual = contenido

    while (actual) {
        const siguiente =
            actual.ephemeralMessage?.message ||
            actual.viewOnceMessage?.message ||
            actual.viewOnceMessageV2?.message ||
            actual.documentWithCaptionMessage?.message

        if (!siguiente) break
        actual = siguiente
    }

    return actual || {}
}

function obtenerImagen(contenido, profundidad = 0) {
    if (
        !contenido ||
        typeof contenido !== 'object' ||
        profundidad > 8
    ) {
        return null
    }

    const mensaje = desenvolverMensaje(contenido)

    if (mensaje.imageMessage) {
        return mensaje.imageMessage
    }

    for (const valor of Object.values(mensaje)) {
        if (valor && typeof valor === 'object') {
            const encontrada = obtenerImagen(
                valor,
                profundidad + 1
            )

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

        const contenido =
            citado.message ||
            citado.msg ||
            citado

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

async function subirImagen(buffer, mime) {
    const extension =
        mime.split('/')[1]?.split(';')[0] || 'jpg'

    const formulario = new FormData()

    formulario.append('reqtype', 'fileupload')

    formulario.append(
        'fileToUpload',
        new Blob([buffer], { type: mime }),
        `pepe-hd.${extension}`
    )

    const response = await fetch(UPLOAD_API, {
        method: 'POST',
        body: formulario,
        headers: {
            'User-Agent': 'PEPE-BOT'
        },
        signal: AbortSignal.timeout(90000)
    })

    const resultado = (await response.text()).trim()

    console.log('[HD] Catbox:', response.status, resultado)

    if (!response.ok) {
        throw new Error(
            `Catbox respondió ${response.status}: ${resultado}`
        )
    }

    if (!/^https:\/\/files\.catbox\.moe\/[^\s]+$/i.test(resultado)) {
        throw new Error(`Catbox rechazó la imagen: ${resultado}`)
    }

    return resultado
}

function buscarUrl(objeto, profundidad = 0) {
    if (objeto == null || profundidad > 7) return null

    if (typeof objeto === 'string') {
        return /^https?:\/\//i.test(objeto)
            ? objeto
            : null
    }

    if (typeof objeto !== 'object') return null

    const campos = [
        'downloadUrl',
        'url',
        'image',
        'img',
        'link',
        'result'
    ]

    for (const campo of campos) {
        if (objeto[campo]) {
            const encontrada = buscarUrl(
                objeto[campo],
                profundidad + 1
            )

            if (encontrada) return encontrada
        }
    }

    for (const valor of Object.values(objeto)) {
        const encontrada = buscarUrl(
            valor,
            profundidad + 1
        )

        if (encontrada) return encontrada
    }

    return null
}

async function mejorarImagen(url) {
    const response = await fetch(
        API + encodeURIComponent(url),
        {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            signal: AbortSignal.timeout(120000)
        }
    )

    if (!response.ok) {
        throw new Error(
            `SuperHD respondió ${response.status}`
        )
    }

    const contentType =
        response.headers.get('content-type') || ''

    if (contentType.startsWith('image/')) {
        return Buffer.from(await response.arrayBuffer())
    }

    const data = await response.json()

    console.log('[HD] Respuesta SuperHD:', JSON.stringify(data).slice(0, 1500))

    if (data.status === false) {
        throw new Error(
            data.message || 'SuperHD rechazó la imagen'
        )
    }

    const urlResultado = buscarUrl(data)

    if (urlResultado) {
        const descarga = await fetch(urlResultado, {
            signal: AbortSignal.timeout(90000)
        })

        if (!descarga.ok) {
            throw new Error(
                'No se pudo descargar la imagen mejorada'
            )
        }

        const buffer = Buffer.from(
            await descarga.arrayBuffer()
        )

        if (!buffer.length) {
            throw new Error('La imagen HD está vacía')
        }

        return buffer
    }

    const base64 =
        data.result?.base64 ||
        data.result?.image ||
        data.base64

    if (typeof base64 === 'string') {
        const limpio = base64.replace(
            /^data:image\/[^;]+;base64,/i,
            ''
        )

        const buffer = Buffer.from(limpio, 'base64')

        if (buffer.length) return buffer
    }

    throw new Error(
        'No se encontró la imagen en la respuesta de SuperHD'
    )
}

handler.run = async (sock, m) => {
    try {
        const chat = m.chat || m.key.remoteJid

        const fuente = obtenerFuente(m)

        if (!fuente) {
            return m.reply(
                '📸 *PEPE BOT — HD*\n\n' +
                'Responde a una imagen con `.hd` o envía una imagen junto al comando.'
            )
        }

        const datosImagen = obtenerImagen(fuente.message)

        if (!datosImagen) {
            return m.reply('❌ No pude reconocer la imagen.')
        }

        // Reacción
        await sock.sendMessage(chat, {
            react: {
                text: '✨',
                key: m.key
            }
        }).catch(() => {})

        // Descargar imagen original
        const buffer = await descargarImagen(fuente, sock)

        if (!buffer?.length) {
            throw new Error('No se pudo descargar la imagen original')
        }

        const mime = datosImagen.mimetype || 'image/jpeg'

        // Subir automáticamente a Catbox
        const url = await subirImagen(buffer, mime)

        // Mejorar imagen con SuperHD
        const imagenFinal = await mejorarImagen(url)

        // Enviar resultado
        await sock.sendMessage(
            chat,
            {
                image: imagenFinal,
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
