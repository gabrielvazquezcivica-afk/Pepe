
import axios from 'axios'

const API_URL = 'https://api-faa.my.id/faa/epsilon-ai?text='

const handler = {}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const consulta = args.join(' ').trim()

    if (!consulta) {
        return m.reply(
            '> ❌ Escribe un tema para investigar.\n\n> Ejemplo: .epsilon inteligencia artificial'
        )
    }

    try {
        await sock.sendMessage(chat, {
            react: {
                text: '🔬',
                key: m.key
            }
        })

        const { data } = await axios.get(
            API_URL + encodeURIComponent(consulta),
            { timeout: 30000 }
        )

        if (!data?.status || !Array.isArray(data.result) || !data.result.length) {
            return m.reply('> ❌ No se encontraron investigaciones.')
        }

        let texto = `╭━━━━━━━━━━━━━━━━━━╮
┃ 🔬 *EPSILON AI*
┃ 🐸 *PEPE BOT*
╰━━━━━━━━━━━━━━━━━━╯

🔎 *Consulta:* ${consulta}
📚 *Resultados encontrados:* ${data.total || data.result.length}

━━━━━━━━━━━━━━━━━━`

        for (const [index, item] of data.result.slice(0, 5).entries()) {
            texto += `

📄 *RESULTADO ${index + 1}*

📌 *Título:* ${item.title || 'Sin título'}
👨‍🔬 *Autores:* ${item.authors || 'No especificados'}
📅 *Año:* ${item.year || 'No especificado'}

📝 *Resumen:*
${item.abstract || 'Sin resumen disponible.'}

🔗 *Fuente:*
${item.url || 'No disponible'}

━━━━━━━━━━━━━━━━━━`
        }

        await sock.sendMessage(chat, {
            text: texto,
            linkPreview: false
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[EPSILON AI] Error:', error.message)

        await m.reply(
            '> ❌ Error al consultar Epsilon AI. Inténtalo nuevamente.'
        )
    }
}

handler.command = ['epsilon', 'investigar', 'investigacion']
handler.help = ['epsilon']
handler.tags = ['ia']
handler.menu = true

export default handler
