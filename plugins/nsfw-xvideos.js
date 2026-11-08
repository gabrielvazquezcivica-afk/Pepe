import fs from 'fs'
import config from '../config.js'

const API_URL = 'https://api.evogb.org/beta'

const API_KEY = 'evogb-R1Mofv5G'

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
            '> Ejemplo: .xvideos anime'
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

        url.searchParams.set('key', API_KEY)
        url.searchParams.set('query', query)

        const response = await fetch(url)
        const json = await response.json()

        if (!response.ok || !json.status) {
            return m.reply('> ❌ No se encontraron resultados.')
        }

        const resultado = json.data?.result

        if (!resultado) {
            return m.reply('> ❌ La API no devolvió resultados.')
        }

        return m.reply(
            `🐸 *PEPE BOT — VIDEOS*\n\n` +
            `🔎 *Búsqueda:* ${query}\n\n` +
            `${typeof resultado === 'string'
                ? resultado
                : JSON.stringify(resultado, null, 2)}\n\n` +
            `> ${config.BOT_NAME}`
        )

    } catch (error) {
        console.error('[VIDEOS]', error)

        return m.reply(
            '> ❌ Error al conectar con la API.'
        )
    }
}

handler.command = ['xvideos', 'video']
handler.help = ['xvideos <búsqueda>']
handler.tags = ['descargas']
handler.group = true
handler.menu = true

export default handler