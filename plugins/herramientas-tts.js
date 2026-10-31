
import axios from 'axios'

const API_URL = 'https://api-faa.my.id/faa/tts-legkap'

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

function crearClave(m) {
    const chat = m.key.remoteJid
    const usuario = m.key.participant || m.key.remoteJid
    return `${chat}:${usuario}`
}

// Mostrar las nueve voces en una lista interactiva
async function mostrarVoces(sock, m, texto) {
    const chat = m.key.remoteJid
    const clave = crearClave(m)

    textosPendientes.set(clave, texto)

    const rows = voces.map(voz => ({
        title: `🎙️ ${voz.nombre}`,
        description: `Generar audio con ${voz.nombre}`,
        rowId: `.ttsvoice ${voz.id}`
    }))

    await sock.sendMessage(chat, {
        text: `🐸 *PEPE BOT — TTS*\n\n📝 *Texto:*\n${texto}\n\n🎧 Selecciona una de las nueve voces:`,
        footer: 'PEPE BOT • Conversión de texto a voz',
        title: 'Selecciona una voz',
        buttonText: '🎙️ VER TODAS LAS VOCES',
        sections: [
            {
                title: 'Voces disponibles',
                rows
            }
        ]
    }, { quoted: m })
}

// Comando principal
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
        return m.reply('⚠️ El texto es demasiado largo. Máximo 500 caracteres.')
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

// Procesar la selección de voz
handler.voice = async (sock, m, args = []) => {
    const chat = m.key.remoteJid
    const clave = crearClave(m)
    const modelo = String(args[0] || '').toLowerCase()

    const voz = voces.find(v => v.id === modelo)

    if (!voz) {
        return m.reply('❌ La voz seleccionada no existe.')
    }

    const texto = textosPendientes.get(clave)

    if (!texto) {
        return m.reply(
            '⚠️ No hay ningún texto pendiente.\n' +
            'Utiliza `.tts` para comenzar nuevamente.'
        )
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
            return m.reply(
                `❌ No se pudo generar el audio con *${voz.nombre}*.\n` +
                'Intenta seleccionar otra voz.'
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
