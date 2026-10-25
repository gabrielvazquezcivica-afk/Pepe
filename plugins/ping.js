
const handler = async (m, { conn }) => {
    const inicio = Date.now()

    // Envía el mensaje inicial para medir la respuesta
    await conn.sendMessage(m.chat, {
        text: '🐸 *PEPE BOT*\n\n⚡ Midiendo velocidad...'
    }, { quoted: m })

    const velocidad = Date.now() - inicio

    await conn.sendMessage(m.chat, {
        text: `🐸 *PEPE BOT — VELOCIDAD*\n\n` +
              `⚡ *Latencia:* ${velocidad} ms\n` +
              `🚀 *Estado:* ${velocidad < 300 ? 'Excelente' : velocidad < 800 ? 'Bueno' : 'Lento'}\n` +
              `🤖 *Sistema:* En línea`
    }, { quoted: m })
}

handler.command = ['p', 'ping', 'velocidad']
handler.help = ['p']
handler.tags = ['informacion']
handler.menu = true

export default handler
