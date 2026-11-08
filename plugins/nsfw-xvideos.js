import fs from 'fs'
import path from 'path'
import config from '../config.js'

const DB_FILE = path.resolve('./database/nsfw.json')

// Configura aquí una API de búsqueda de videos no explícitos.
const API_URL = 'URL_DE_TU_API'
const API_KEY = 'TU_API_KEY'

const handler = {}

function cargarNSFW() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

handler.run = async (sock, m, args = []) => {
    const from = m.chat
    const query = args.join(' ').trim()

    // Protección NSFW
    if (m.isGroup) {
        const nsfw = cargarNSFW()

        if (nsfw[from]?.bloqueado !== false) {
            return m.reply(
                `> 🔒 Los comandos están bloqueados en este grupo.\n\n` +
                `> Un administrador puede activarlos con .nsfw on\n\n` +
                `> ${config.BOT_NAME}`
            )
        }
    }

    if (!query) {
        return m.reply(
            '> 🔎 Escribe qué video quieres buscar.\n\n' +
            '> Ejemplo: .videos anime'
        )
    }

    try {
        const url = new URL(API_URL)

        url.searchParams.set('key', API_KEY)
        url.searchParams.set('query', query)

        await sock.sendMessage(from, {
            react: {
                text: '🔎',
                key: m.key
            }
        })

        const response = await fetch(url)
        const contenido = await response.text()

        console.log('[VIDEOS] HTTP:', response.status)

        let json

        try {
            json = JSON.parse(contenido)
        } catch {
            console.error(
                '[VIDEOS] Respuesta no JSON:',
                contenido.slice(0, 500)
            )

            return m.reply(
                '> ❌ El servidor devolvió HTML o una respuesta no válida.\n\n' +
                '> Comprueba la protección y la dirección de la API.'
            )
        }

        if (!response.ok || json.status !== true) {
            return m.reply(
                '> ❌ La API no pudo completar la búsqueda.'
            )
        }

        const resultado = json.data?.result

        if (!resultado) {
            return m.reply(
                '> ❌ La API no devolvió resultados.'
            )
        }

        const texto = typeof resultado === 'string'
            ? resultado
            : JSON.stringify(resultado, null, 2)

        return m.reply(
            `🐸 *PEPE BOT — VIDEOS*\n\n` +
            `🔎 *Búsqueda:* ${query}\n\n` +
            `${texto}\n\n` +
            `> ${config.BOT_NAME}`
        )

    } catch (error) {
        console.error('[VIDEOS]', error)

        return m.reply(
            '> ❌ Error al conectar con el servidor.'
        )
    }
}

handler.command = ['videos', 'video']
handler.help = ['videos <búsqueda>']
handler.tags = ['descargas']
handler.group = true
handler.menu = true

export default handler