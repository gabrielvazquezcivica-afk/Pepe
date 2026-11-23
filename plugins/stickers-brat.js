import axios from 'axios'
import { toSticker } from '../lib/sticker.js'

const API_FAA_BRAT = 'https://api-faa.my.id/faa/brathd'
const API_FAA_BRATV = 'https://api-faa.my.id/faa/bratvid'

const API_EVO = 'https://api.evogb.org/tools/brat'
const API_EVO_KEY = 'evogb-R1Mofv5G'

const handler = {}

async function generarFAA(texto, animado) {
    const response = await axios.get(
        animado ? API_FAA_BRATV : API_FAA_BRAT,
        {
            params: { text: texto },
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                Accept: animado ? 'video/*' : 'image/*'
            }
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

    const contentType = String(
        response.headers['content-type'] || ''
    ).toLowerCase()

    const bufferRespuesta = Buffer.from(response.data)

    if (!bufferRespuesta.length) {
        throw new Error('EvoGB devolvió una respuesta vacía')
    }

    console.log('📡 EvoGB Content-Type:', contentType)

    if (contentType.includes('json')) {
        let data

        try {
            data = JSON.parse(bufferRespuesta.toString())
        } catch {
            throw new Error('EvoGB devolvió un JSON inválido')
        }

        console.log('📡 Respuesta EvoGB:', JSON.stringify(data, null, 2))

        const url =
            data.result_url ||
            data.url ||
            data.result?.url ||
            data.result?.result_url

        if (!url) {
            throw new Error(
                `EvoGB no devolvió URL: ${JSON.stringify(data)}`
            )
        }

        const archivo = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000
        })

        const buffer = Buffer.from(archivo.data)

        if (!buffer.length) {
            throw new Error('El archivo descargado está vacío')
        }

        const tipoArchivo = String(
            archivo.headers['content-type'] || ''
        ).toLowerCase()

        return {
            buffer,
            animado:
                animado &&
                (
                    tipoArchivo.includes('video') ||
                    tipoArchivo.includes('gif')
                )
        }
    }

    if (
        contentType.includes('image/') ||
        contentType.includes('video/') ||
        contentType.includes('application/octet-stream')
    ) {
        console.log('✅ EvoGB devolvió archivo directamente')

        return {
            buffer: bufferRespuesta,
            animado: animado && (
                contentType.includes('video/') ||
                contentType.includes('gif')
            )
        }
    }

    const esPNG =
        bufferRespuesta[0] === 0x89 &&
        bufferRespuesta[1] === 0x50 &&
        bufferRespuesta[2] === 0x4E &&
        bufferRespuesta[3] === 0x47

    const esJPEG =
        bufferRespuesta[0] === 0xFF &&
        bufferRespuesta[1] === 0xD8 &&
        bufferRespuesta[2] === 0xFF

    const esGIF =
        bufferRespuesta.toString('ascii', 0, 3) === 'GIF'

    const esWEBP =
        bufferRespuesta.toString('ascii', 8, 12) === 'WEBP'

    const esMP4 =
        bufferRespuesta.toString('ascii', 4, 8) === 'ftyp'

    if (esPNG || esJPEG || esGIF || esWEBP || esMP4) {
        console.log('✅ EvoGB devolvió archivo binario')

        return {
            buffer: bufferRespuesta,
            animado: animado && (esGIF || esMP4)
        }
    }

    console.log(
        '⚠️ Respuesta EvoGB:',
        bufferRespuesta.toString().slice(0, 500)
    )

    throw new Error(`Formato desconocido: ${contentType}`)
}

async function generarBrat(texto, animado) {
    try {
        console.log('🟢 Intentando API FAA...')

        return await generarFAA(texto, animado)

    } catch (errorFAA) {
        console.error('❌ FAA falló:', errorFAA.message)

        console.log('🟡 Intentando API EvoGB...')

        try {
            return await generarEvo(texto, animado)

        } catch (errorEvo) {
            console.error('❌ EvoGB falló:', errorEvo.message)

            throw new Error(
                `FAA: ${errorFAA.message}\nEvoGB: ${errorEvo.message}`
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
        console.error(`❌ Error .${comando}:`, error.message)

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