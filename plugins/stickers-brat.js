import axios from 'axios'
import { toSticker } from '../lib/sticker.js'

const API_FAA_BRAT = 'https://api-faa.my.id/faa/brathd'
const API_FAA_BRATV = 'https://api-faa.my.id/faa/bratvid'

const API_EVO = 'https://api.evogb.org/tools/brat'
const API_EVO_KEY = 'TU_API_KEY'

const handler = {}

async function generarFAA(texto, animado) {
    const response = await axios.get(
        animado ? API_FAA_BRATV : API_FAA_BRAT,
        {
            params: { text: texto },
            responseType: 'arraybuffer',
            timeout: 60000
        }
    )

    const buffer = Buffer.from(response.data)

    if (!buffer.length) {
        throw new Error('FAA devolvió un archivo vacío')
    }

    return {
        buffer,
        animado
    }
}

function detectarArchivo(buffer, contentType = '') {
    contentType = contentType.toLowerCase()

    const esPNG = buffer.subarray(0, 4).equals(
        Buffer.from([0x89, 0x50, 0x4E, 0x47])
    )

    const esJPEG = buffer.subarray(0, 3).equals(
        Buffer.from([0xFF, 0xD8, 0xFF])
    )

    const esGIF = buffer.toString('ascii', 0, 3) === 'GIF'

    const esWEBP = buffer.toString('ascii', 8, 12) === 'WEBP'

    const esMP4 = buffer.toString('ascii', 4, 8) === 'ftyp'

    if (esMP4 || contentType.includes('video/')) {
        return true
    }

    if (esGIF || contentType.includes('gif')) {
        return true
    }

    if (esPNG || esJPEG) {
        return false
    }

    if (esWEBP) {
        return buffer.includes(Buffer.from('ANIM'))
    }

    return contentType.includes('image/') && contentType.includes('gif')
}

async function descargarArchivo(url) {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000
    })

    const buffer = Buffer.from(response.data)

    if (!buffer.length) {
        throw new Error('El archivo descargado está vacío')
    }

    return {
        buffer,
        animado: detectarArchivo(
            buffer,
            response.headers['content-type']
        )
    }
}

async function generarEvo(texto, animado) {
    const response = await axios.get(API_EVO, {
        params: {
            text: texto,
            animated: animado ? 'true' : 'false'
        },
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
            'x-api-key': API_EVO_KEY,
            Accept: 'application/json, image/*, video/*'
        }
    })

    const buffer = Buffer.from(response.data)
    const contentType = String(
        response.headers['content-type'] || ''
    ).toLowerCase()

    if (!buffer.length) {
        throw new Error('EvoGB devolvió una respuesta vacía')
    }

    console.log('EvoGB Content-Type:', contentType)

    // Respuesta JSON
    if (
        contentType.includes('json') ||
        buffer[0] === 0x7B
    ) {
        let data

        try {
            data = JSON.parse(buffer.toString())
        } catch {
            throw new Error('EvoGB devolvió JSON inválido')
        }

        console.log('Respuesta EvoGB:', JSON.stringify(data))

        if (data.status === false) {
            throw new Error(data.message || 'EvoGB indicó un error')
        }

        const url =
            data.result_url ||
            data.url ||
            data.result?.result_url ||
            data.result?.url

        if (!url) {
            throw new Error(
                `No se encontró URL en la respuesta: ${JSON.stringify(data)}`
            )
        }

        return descargarArchivo(url)
    }

    // Respuesta directa de imagen o video
    console.log('EvoGB devolvió contenido binario')

    return {
        buffer,
        animado: detectarArchivo(buffer, contentType)
    }
}

async function generarBrat(texto, animado) {
    try {
        console.log('Intentando API FAA...')

        return await generarFAA(texto, animado)

    } catch (errorFAA) {
        console.error('FAA falló:', errorFAA.message)

        console.log('Intentando API EvoGB...')

        try {
            return await generarEvo(texto, animado)

        } catch (errorEvo) {
            console.error('EvoGB falló:', errorEvo.message)

            throw new Error(
                `FAA: ${errorFAA.message} | EvoGB: ${errorEvo.message}`
            )
        }
    }
}

handler.run = async (sock, m, args = []) => {
    const comando = String(m.command || '').toLowerCase()
    const animado = comando === 'bratv'

    try {
        const texto = args.join(' ').trim()

        if (!texto) {
            return m.reply(
                animado
                    ? '🐸 Escribe el texto para crear tu Brat animado.\n\nEjemplo: *.bratv Pepe Bot*'
                    : '🐸 Escribe el texto para crear tu Brat.\n\nEjemplo: *.brat Pepe Bot*'
            )
        }

        const limite = animado ? 300 : 500

        if (texto.length > limite) {
            return m.reply(`❌ Máximo ${limite} caracteres.`)
        }

        await sock.sendMessage(m.chat, {
            react: {
                text: '⏳',
                key: m.key
            }
        })

        const resultado = await generarBrat(texto, animado)

        const webp = await toSticker(
            resultado.buffer,
            resultado.animado
        )

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
        console.error(`Error .${comando}:`, error.message)

        await sock.sendMessage(m.chat, {
            react: {
                text: '❌',
                key: m.key
            }
        })

        await m.reply(
            animado
                ? '❌ No se pudo generar el Brat animado. Ambas APIs fallaron.'
                : '❌ No se pudo generar el Brat. Ambas APIs fallaron.'
        )
    }
}

handler.command = ['brat', 'bratv']
handler.help = ['brat <texto>', 'bratv <texto>']
handler.tags = ['stickers']
handler.menu = true

export default handler