import fs from 'fs'
import path from 'path'
import config from '../config.js'

const DB_FILE = path.resolve('./database/nsfw.json')

// Sustituye por el endpoint de una API de videos no explícitos.
const API_URL = 'https://api.evogb.org/beta#nsfw-search-xvideos'

const API_KEY = evogb-R1Mofv5G'

const handler = {}

function cargarDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat
    const query = args.join(' ').trim()

    // Protección NSFW
    if (m.isGroup) {
        const db = cargarDB()

        if (db[chat]?.bloqueado !== false) {
            return m.reply(
                `> 🔒 Los comandos NSFW están bloqueados en este grupo.\n\n` +
                `> Un administrador puede activarlos con .nsfw on\n\n` +
                `> ${config.BOT_NAME}`
            )
        }
    }

    if (!query) {
        return m.reply(
            '> 🔎 Escribe el nombre del video que quieres buscar.\n\n' +
            '> Ejemplo: .videos anime'
        )
    }

    try {
        await sock.sendMessage(chat, {
            react: {
                text: '🔎',
                key: m.key
            }
        })

        const url = new URL(API_URL)
        url.searchParams.set('key', API_KEY)
        url.searchParams.set('query', query)

        const response = await fetch(url)
        const content = await response.text()

        let json

        try {
            json = JSON.parse(content)
        } catch {
            console.error('[VIDEOS] Respuesta inválida:', content.slice(0, 500))

            return m.reply(
                '> ❌ El servidor no devolvió JSON válido.'
            )
        }

        if (!response.ok || json.status !== true) {
            return m.reply(
                '> ❌ No se pudo realizar la búsqueda.'
            )
        }

        const resultado = json.data?.result

        if (!resultado) {
            return m.reply(
                '> ❌ No se encontraron resultados.'
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