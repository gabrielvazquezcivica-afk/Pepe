
import axios from 'axios'

const API_URL = 'https://api-faa.my.id/faa/Wikipedia-search?q='

const handler = {}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const consulta = args.join(' ').trim()

    if (!consulta) {
        return m.reply(
            '> ❌ Escribe algo para buscar en Wikipedia.\n\n> Ejemplo: .wikipedia Free Fire'
        )
    }

    try {
        await sock.sendMessage(chat, {
            react: {
                text: '🔎',
                key: m.key
            }
        })

        const { data } = await axios.get(
            API_URL + encodeURIComponent(consulta),
            { timeout: 20000 }
        )

        const resultado = data?.result

        if (!data?.status || !resultado?.status) {
            return m.reply('> ❌ No encontré información sobre esa búsqueda.')
        }

        const titulo = resultado.title || 'Sin título'
        const resumen = resultado.summary || 'No hay resumen disponible.'
        const url = resultado.url || ''

        const relacionados = Array.isArray(resultado.search_results)
            ? resultado.search_results.slice(0, 3)
            : []

        let texto = `╭━━━━━━━━━━━━━━━━━━╮
┃ 📚 *WIKIPEDIA*
┃ 🐸 *PEPE BOT*
╰━━━━━━━━━━━━━━━━━━╯

🔎 *Búsqueda:* ${consulta}

📖 *${titulo}*

${resumen}

━━━━━━━━━━━━━━━━━━
🔗 *Artículo completo:*
${url}`

        if (relacionados.length) {
            texto += '\n\n📌 *RESULTADOS RELACIONADOS*\n'

            relacionados.forEach((item, index) => {
                texto += `\n${index + 1}. *${item.title || 'Sin título'}*\n`
                texto += `${item.snippet || 'Sin descripción.'}\n`
            })
        }

        await sock.sendMessage(chat, {
            text: texto,
            linkPreview: false
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[WIKIPEDIA] Error:', error.message)

        await m.reply(
            '> ❌ Ocurrió un error al consultar Wikipedia. Inténtalo nuevamente.'
        )
    }
}

handler.command = ['wikipedia', 'wiki']
handler.help = ['wikipedia']
handler.tags = ['ia']
handler.menu = true

export default handler
