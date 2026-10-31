import axios from 'axios'
import { sendButtons } from 'baileys-buttons'

const API_URL = 'https://api-faa.my.id/faa/tts-legkap?text='

const voces = [
    { id: 'nahida', nombre: 'Nahida' },
    { id: 'nami', nombre: 'Nami' },
    { id: 'ana', nombre: 'Ana' },
    { id: 'optimus_prime', nombre: 'Optimus Prime' },
    { id: 'goku', nombre: 'Goku' },
    { id: 'elon_musk', nombre: 'Elon Musk' },
    { id: 'mickey_mouse', nombre: 'Mickey Mouse' },
    { id: 'kendrick_lamar', nombre: 'Kendrick Lamar' },
    { id: 'eminem', nombre: 'Eminem' }
]

const textosPendientes = new Map()

const handler = {}

// Crear la clave para guardar el texto por chat y usuario
function crearClave(m) {
    return `${m.key.remoteJid}:${m.key.participant || m.key.remoteJid}`
}

// Mostrar todas las voces en un solo menú
async function mostrarVoces(sock, m, texto) {
    const chat = m.key.remoteJid
    const clave = crearClave(m)

    textosPendientes.set(clave, texto)

    const buttons = voces.map(voz => ({
        id: `.ttsvoice ${voz.id}`,
        displayText: `🎙️ ${voz.nombre}`
    }))

    await sendButtons(sock, chat, {
        title: '🐸 PEPE BOT',
        text: `🗣️ *Texto:*\n${texto}\n\n🎧 Selecciona una voz:`,
        footer: 'PEPE BOT • TTS',
        buttons,
        quoted: m
    })
}

// Comando .tts
handler.run = async (sock, m, args = []) => {
    const texto = args.join(' ').trim()

    if (!texto) {
        return m.reply(
            '🐸 *PEPE BOT — TTS*\n\n' +
            'Escribe el texto que quieres convertir en audio.\n\n' +
            'Ejemplo:\n.tts Hola, ¿cómo estás?'
        )
    }

    if (texto.length > 500) {
        return m.reply('⚠️ El texto es demasiado largo. Intenta con uno más corto.')
    }

    try {
        await sock.sendMessage(m.key.remoteJid, {
            react: { text: '🎙️', key: m.key }
        }).catch(() => {})

        await mostrarVoces(sock, m, texto)

    } catch (error) {
        console.error('[TTS MENU]', error)
        await m.reply('❌ No se pudo mostrar el menú de voces.')
    }
}

// Seleccionar una voz y generar el audio
handler.voice = async (sock, m, args = []) => {
    const chat = m.key.remoteJid
    const clave = crearClave(m)
    const modelo = String(args[0] || '').toLowerCase()

    const voz = voces.find(v => v.id === modelo)

    if (!voz) {
        return m.reply('❌ Esa voz no existe.')
    }

    const texto = textosPendientes.get(clave)

    if (!texto) {
        return m.reply('⚠️ No encontré un texto pendiente. Usa .tts nuevamente.')
    }

    try {
        await sock.sendMessage(chat, {
            react: { text: '⏳', key: m.key }
        }).catch(() => {})

        const { data } = await axios.get(API_URL + encodeURIComponent(texto), {
            timeout: 60000
        })

        if (!data?.status || !Array.isArray(data.result)) {
            return m.reply('❌ La API no devolvió resultados válidos.')
        }

        const resultado = data.result.find(
            item => String(item.model).toLowerCase() === modelo
        )

        if (!resultado?.url) {
            return m.reply(
                `❌ No se pudo generar el audio con la voz *${voz.nombre}*.\n` +
                'Prueba seleccionando otra voz.'
            )
        }

        await sock.sendMessage(chat, {
            audio: { url: resultado.url },
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: m })

        textosPendientes.delete(clave)

        await sock.sendMessage(chat, {
            react: { text: '✅', key: m.key }
        }).catch(() => {})

    } catch (error) {
        console.error('[TTS ERROR]', error?.response?.data || error)

        await sock.sendMessage(chat, {
            react: { text: '❌', key: m.key }
        }).catch(() => {})

        await m.reply('❌ Ocurrió un error al generar el audio.')
    }
}

handler.command = ['tts', 'ttsvoice']
handler.help = ['tts <texto>']
handler.tags = ['herramientas']
handler.menu = true

export default handler