
import axios from 'axios'
import { sendButtons } from 'baileys-buttons'

const API_URL = 'https://api-faa.my.id/faa/tts-legkap'

const voces = [
    { id: 'optimus_prime', nombre: 'Optimus Prime' },
    { id: 'mickey_mouse', nombre: 'Mickey Mouse' },
    { id: 'goku', nombre: 'Goku' }
]

const textosPendientes = new Map()

const handler = {}

function crearClave(m) {
    return `${m.key.remoteJid}:${m.key.participant || m.key.remoteJid}`
}

// Mostrar los tres botones
handler.run = async (sock, m, args = []) => {
    const texto = args.join(' ').trim()
    const chat = m.key.remoteJid

    if (!texto) {
        return m.reply(
            '🐸 *PEPE BOT — TTS*\n\n' +
            'Escribe el texto que quieres convertir en audio.\n\n' +
            'Ejemplo:\n.tts Hola grupo'
        )
    }

    if (texto.length > 500) {
        return m.reply('⚠️ El texto es demasiado largo. Máximo 500 caracteres.')
    }

    try {
        textosPendientes.set(crearClave(m), texto)

        await sock.sendMessage(chat, {
            react: { text: '🎙️', key: m.key }
        }).catch(() => {})

        const buttons = voces.map(voz => ({
            id: `.ttsvoice ${voz.id}`,
            displayText: `🎙️ ${voz.nombre}`
        }))

        await sendButtons(sock, chat, {
            title: '🐸 PEPE BOT',
            text: `📝 *Texto:*\n${texto}\n\n🎧 Selecciona una voz:`,
            footer: 'PEPE BOT • TTS',
            buttons,
            quoted: m
        })

    } catch (error) {
        console.error('[TTS MENU]', error)
        await m.reply('❌ No se pudieron mostrar los botones.')
    }
}

// Generar audio con la voz seleccionada
handler.voice = async (sock, m, args = []) => {
    const chat = m.key.remoteJid
    const clave = crearClave(m)
    const modelo = String(args[0] || '').toLowerCase()

    const voz = voces.find(v => v.id === modelo)

    if (!voz) {
        return m.reply('❌ Voz no válida.')
    }

    const texto = textosPendientes.get(clave)

    if (!texto) {
        return m.reply('⚠️ No hay texto pendiente. Utiliza .tts nuevamente.')
    }

    try {
        await sock.sendMessage(chat, {
            react: { text: '⏳', key: m.key }
        }).catch(() => {})

        const { data } = await axios.get(API_URL, {
            params: { text: texto },
            timeout: 60000
        })

        if (!data?.status || !Array.isArray(data.result)) {
            return m.reply('❌ La API no devolvió resultados válidos.')
        }

        const resultado = data.result.find(
            item => String(item.model).toLowerCase() === modelo
        )

        if (!resultado?.url) {
            return m.reply(`❌ No se pudo generar el audio con ${voz.nombre}.`)
        }

        await sock.sendMessage(chat, {
            audio: { url: resultado.url },
            mimetype: 'audio/mpeg',
            ptt: false
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

        await m.reply('❌ Error al generar el audio.')
    }
}

handler.command = ['tts', 'ttsvoice']
handler.help = ['tts <texto>']
handler.tags = ['herramientas']
handler.menu = true

export default handler
