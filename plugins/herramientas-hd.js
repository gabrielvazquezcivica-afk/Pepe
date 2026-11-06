
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import pino from 'pino'

const API = 'https://api-faa.my.id/faa/superhd?url='
const UPLOAD_API = 'https://litterbox.catbox.moe/resources/internals/api.php'

const logger = pino({ level: 'silent' })
const handler = {}

function desenvolverMensaje(contenido) {
    let actual = contenido

    while (actual) {
        if (
            actual.ephemeralMessage?.message ||
            actual.viewOnceMessage?.message ||
            actual.viewOnceMessageV2?.message ||
            actual.documentWithCaptionMessage?.message
        ) {
            actual =
                actual.ephemeralMessage?.message ||
                actual.viewOnceMessage?.message ||
                actual.viewOnceMessageV2?.message ||
                actual.documentWithCaptionMessage?.message
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

    if (mensaje.imageMessage) return mensaje.imageMessage

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

    if (obtenerImagen(m.message)) return m

    return null
}

async function subirImagen(buffer, mime) {
    const extension = mime.split('/')[1]?.split(';')[0] || 'jpg'

    const formulario = new FormData()

    formulario.append('reqtype', 'fileupload')
    formulario.append('time', '1h')
    formulario.append(
        'fileToUpload',
        new Blob([buffer], { type: mime }),
        `pepe-hd.${extension}`
    )

    const response = await fetch(UPLOAD_API, {
        method: 'POST',
        body: formulario,
        signal: AbortSignal.timeout(60000)
    })

    if (!response.ok) {
        throw new Error('No se pudo alojar temporalmente la imagen')
    }

    const url = (await response.text()).trim()

    if (!/^https:\/\/[^\s]+$/i.test(url)) {
        throw new Error('El alojamiento no devolvió una URL válida')
    }

    return url
}

function buscarUrl(objeto, profundidad = 0) {
    if (profundidad > 6 || objeto == null) return null

    if (typeof objeto === 'string') {
        return /^https?:\/\//i.test(objeto) ? objeto : null
    }

    if (typeof objeto !== 'object') return null

    const preferidos = [
        'downloadUrl',
        'url',
        'image',
        'img',
        'link',
        'result'
    ]

    for (const campo of preferidos) {
        if (objeto[campo]) {
            const encontrada = buscarUrl(objeto[campo], profundidad + 1)
            if (encontrada) return encontrada
        }
    }

    for (const valor of Object.values(objeto)) {
        const encontrada = buscarUrl(valor, profundidad + 1)
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
        throw new Error(`SuperHD respondió ${response.status}`)
    }

    const tipo = response.headers.get('content-type') || ''

    if (tipo.startsWith('image/')) {
        return Buffer.from(await response.arrayBuffer())
    }

    const data = await response.json()

    if (data.status === false) {
        throw new Error(data.message || 'SuperHD rechazó la imagen')
    }

    const resultado = buscarUrl(data)

    if (resultado) {
        const descarga = await fetch(resultado, {
            signal: AbortSignal.timeout(90000)
        })

        if (!descarga.ok) {
            throw new Error('No se pudo descargar la imagen mejorada')
        }

        return Buffer.from(await descarga.arrayBuffer())
    }

    const base64 =
        data.result?.base64 ||
        data.result?.image ||
        data.base64

    if (typeof base64 === 'string') {
        const limpio = base64.replace(/^data:image\/[^;]+;base64,/i, '')
        const buffer = Buffer.from(limpio, 'base64')

        if (buffer.length) return buffer
    }

    throw new Error('No se encontró la imagen en la respuesta de SuperHD')
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

        await sock.sendMessage(chat, {
            react: {
                text: '✨',
                key: m.key
            }
        })

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

        const mime = datosImagen?.mimetype || 'image/jpeg'

        // Subida temporal automática.
        const urlTemporal = await subirImagen(buffer, mime)

        // Procesamiento mediante SuperHD.
        const imagenFinal = await mejorarImagen(urlTemporal)

        await sock.sendMessage(
            chat,
            {
                image: imagenFinal,
                caption: '> 🖼️ Imagen mejorada'
            },
            { quoted: m }
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
