import axios from 'axios'
import { toSticker } from '../lib/sticker.js'

const API_FAA_BRAT = 'https://api-faa.my.id/faa/brathd'
const API_FAA_BRATV = 'https://api-faa.my.id/faa/bratvid'

const API_EVO = 'https://api.evogb.org/tools/brat'
const API_EVO_KEY = 'evogb-R1Mofv5G'

const handler = {}

// ==============================
// FAA API
// ==============================

async function generarFAA(texto, animado) {
    const response = await axios.get(
        animado ? API_FAA_BRATV : API_FAA_BRAT,
        {
            params: {
                text: texto
            },
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                Accept: animado ? 'video/*' : 'image/*'
            }
        }
    )

    const buffer = Buffer.from(response.data)

    if (!buffer.length) {
        throw new Error('FAA devolvió un archivo vacío.')
    }

    return buffer
}

// ==============================
// EvoGB API
// ==============================

async function generarEvo(texto, animado) {
    try {
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

        console.log(
            '📡 Respuesta EvoGB:',
            JSON.stringify(data, null, 2)
        )

        if (!data?.status || !data?.result_url) {
            throw new Error(
                `EvoGB no devolvió una URL válida: ${JSON.stringify(data)}`
            )
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

    } catch (error) {
        const status = error.response?.status

        let respuesta = error.message

        if (error.response?.data) {
            respuesta = Buffer.isBuffer(error.response.data)
                ? error.response.data.toString()
                : JSON.stringify(error.response.data)
        }

        console.error('❌ Error EvoGB:')
        console.error('Status:', status || 'Sin status')
        console.error('Respuesta:', respuesta)

        throw new Error(
            status
                ? `EvoGB HTTP ${status}: ${respuesta}`
                : respuesta
        )
    }
}

// ==============================
// GENERADOR PRINCIPAL
// ==============================

async function generarBrat(texto, animado) {
    try {
        console.log('🟢 Intentando API FAA...')

        const buffer = await generarFAA(texto, animado)

        console.log('✅ Brat generado con FAA')

        return buffer

    } catch (errorFAA) {
        console.error('❌ FAA falló:', errorFAA.message)

        console.log('🟡 Intentando API EvoGB...')

        try {
            const buffer = await generarEvo(texto, animado)

            console.log('✅ Brat generado con EvoGB')

            return buffer

        } catch (errorEvo) {
            console.error('❌ EvoGB también falló:', errorEvo.message)

            throw new Error(
                `FAA: ${errorFAA.message}\nEvoGB: ${errorEvo.message}`
            )
        }
    }
}

// ==============================
// COMANDO
// ==============================

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

        const buffer = await generarBrat(texto, animado)

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
                ? '❌ No se pudo generar el Brat animado.\n\nLas APIs FAA y EvoGB fallaron.'
                : '❌ No se pudo generar el Brat.\n\nLas APIs FAA y EvoGB fallaron.'
        )
    }
}

// ==============================
// CONFIGURACIÓN DEL PLUGIN
// ==============================

handler.command = ['brat', 'bratv']
handler.help = ['brat <texto>', 'bratv <texto>']
handler.tags = ['stickers']
handler.menu = true

export default handler