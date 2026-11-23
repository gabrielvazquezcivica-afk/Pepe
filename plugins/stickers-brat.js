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
        throw new Error('FAA no devolvió contenido.')
    }

    return buffer
}

async function generarEvo(texto, animado) {
    const response = await axios.get(API_EVO, {
        params: {
            text: texto,
            animated: animado ? 'true' : 'false'
        },
        timeout: 60000,
        headers: {
            'x-api-key': API_EVO_KEY,
            Accept: 'application/json'
        }
    })

    const data = response.data

    if (!data?.status || !data?.result_url) {
        throw new Error('EvoGB no devolvió una URL válida.')
    }

    const archivo = await axios.get(data.result_url, {
        responseType: 'arraybuffer',
        timeout: 60000
    })

    const buffer = Buffer.from(archivo.data)

    if (!buffer.length) {
        throw new Error('EvoGB devolvió un archivo vacío.')
    }

    return buffer
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

        let buffer
        let apiUsada = 'FAA'

        try {
            buffer = await generarFAA(texto, animado)
        } catch (errorFAA) {
            console.error('FAA falló, intentando EvoGB:', errorFAA.message)

            apiUsada = 'EvoGB'
            buffer = await generarEvo(texto, animado)
        }

        const webp = await toSticker(buffer, animado)

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

        console.log(`Brat generado correctamente usando ${apiUsada}`)

    } catch (error) {
        console.error(`Error .${comando}:`, error.message)

        await sock.sendMessage(m.chat, {
            react: {
                text: '❌',
                key: m.key
            }
        })

        await m.reply(
            comando === 'bratv'
                ? '❌ No se pudo generar el Brat animado. Las dos APIs fallaron.'
                : '❌ No se pudo generar el Brat. Las dos APIs fallaron.'
        )
    }
}

handler.command = ['brat', 'bratv']
handler.help = ['brat <texto>', 'bratv <texto>']
handler.tags = ['stickers']
handler.menu = true

export default handler