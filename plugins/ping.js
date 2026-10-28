const handler = {}

handler.run = async (sock, m, args = []) => {
    const inicio = Date.now()
    const chat = m.chat || m.key?.remoteJid

    // Adaptarse al socket que entrega el index
    const conn = sock?.sendMessage
        ? sock
        : sock?.conn

    if (!conn?.sendMessage) {
        throw new Error('No se encontró sendMessage en el socket recibido.')
    }

    // Enviar un solo mensaje inicial
    const enviado = await conn.sendMessage(chat, {
        text: '🐸 *PEPE BOT*\n\n⚡ Midiendo velocidad...'
    }, { quoted: m })

    const velocidad = Date.now() - inicio

    const estado = velocidad < 300
        ? 'Excelente'
        : velocidad < 800
            ? 'Bueno'
            : 'Lento'

    const texto =
        `🐸 *PEPE BOT — VELOCIDAD*\n\n` +
        `⚡ *Latencia:* ${velocidad} ms\n` +
        `🚀 *Estado:* ${estado}\n` +
        `🤖 *Sistema:* En línea`

    // Editar el mensaje enviado
    await conn.sendMessage(chat, {
        text: texto,
        edit: enviado.key
    })
}

handler.command = ['p', 'ping', 'velocidad']
handler.help = ['p']
handler.tags = ['informacion']
handler.menu = true

export default handler