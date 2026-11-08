import fs from 'fs'
import path from 'node:path'
import config from '../config.js'

const DB_FILE = path.resolve('./database/nsfw.json')
const API_URL = 'https://api.stellarwa.xyz/nsfw/search/xnxx?key=api-hbWMB'
const API_KEY = 'api-hbWMB'

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
        url.searchParams.set('query', query)
        url.searchParams.set('key', API_KEY)

        const response = await fetch(url)
        const content = await response.text()

        let json

        try {
            json = JSON.parse(content)
        } catch {
            console.error('[VIDEOS] Respuesta no JSON:', content.slice(0, 500))
            return m.reply('> ❌ El servidor no devolvió JSON válido.')
        }

        if (!response.ok || json.status !== true) {
            return m.reply('> ❌ No se pudo realizar la búsqueda.')
        }

        const resultados = json.resultados || []

        if (!resultados.length) {
            return m.reply('> ❌ No se encontraron resultados.')
        }

        const texto = resultados.slice(0, 5).map((item, i) => {
            return `${i + 1}. *${item.title || 'Sin título'}*
👁️ Visitas: ${item.views || 'N/D'}
🎞️ Calidad: ${item.resolution || 'N/D'}
⏱️ Duración: ${item.duration || 'N/D'}`
        }).join('\n\n')

        return m.reply(
            `🐸 *PEPE BOT — VIDEOS*\n\n` +
            `🔎 Búsqueda: ${query}\n\n` +
            `${texto}\n\n` +
            `> ${config.BOT_NAME}`
        )

    } catch (error) {
        console.error('[VIDEOS]', error)
        return m.reply('> ❌ Error al conectar con la API.')
    }
}

handler.command = ['videos', 'video']
handler.help = ['videos <búsqueda>']
handler.tags = ['descargas']
handler.group = true
handler.menu = true

export default handler