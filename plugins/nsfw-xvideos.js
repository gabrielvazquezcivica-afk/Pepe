import fs from 'fs'
import config from '../config.js'

const API_URL = 'evogb-R1Mofv5G'

const handler = {}

handler.run = async (sock, m, args = []) => {
    const from = m.chat
    const query = args.join(' ').trim()

    // 🔞 Protección NSFW
    if (m.isGroup) {
        let nsfw = {}

        try {
            nsfw = JSON.parse(
                fs.readFileSync('./database/nsfw.json', 'utf8')
            )
        } catch {}

        if (nsfw[from]?.bloqueado !== false) {
            return m.reply(
                `> 🔒 Los comandos NSFW están bloqueados en este grupo.\n\n` +
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
        await sock.sendMessage(from, {
            react: {
                text: '🔎',
                key: m.key
            }
        })

        const url = new URL(API_URL)
        url.searchParams.set('query', query)

        const response = await fetch(url)
        const json = await response.json()

        if (!response.ok || !json.status) {
            return m.reply('> ❌ No se encontraron resultados.')
        }

        const resultados = json.data?.results || []

        if (!resultados.length) {
            return m.reply('> ❌ La búsqueda no devolvió resultados.')
        }

        const texto = resultados.slice(0, 5).map((item, i) => {
            return `${i + 1}. *${item.title || 'Sin título'}*\n${item.url || ''}`
        }).join('\n\n')

        return m.reply(
            `🐸 *PEPE BOT — VIDEOS*\n\n` +
            `🔎 Búsqueda: ${query}\n\n` +
            `${texto}\n\n` +
            `> ${config.BOT_NAME}`
        )

    } catch (error) {
        console.error('[VIDEOS]', error)

        return m.reply(
            '> ❌ Error al conectar con el servidor de búsqueda.'
        )
    }
}

handler.command = ['xvideos', 'video']
handler.help = ['xvideos <búsqueda>']
handler.tags = ['nsfw']
handler.menu = true

export default handler