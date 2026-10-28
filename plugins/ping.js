const handler = async (sock, m) => {
    const inicio = Date.now()
    const chat = m.chat || m.key?.remoteJid

    // Envía un único mensaje inicial
    const enviado = await sock.sendMessage(chat, {
        text: '🐸 *PEPE BOT*\n\n⚡ Midiendo velocidad...'
    }, { quoted: m })

    // Mide el tiempo de respuesta
    const velocidad = Date.now() - inicio

    const estado = velocidad < 300
        ? 'Excelente'
        : velocidad < 800
            ? 'Bueno'
            : 'Lento'

    const texto = `🐸 *PEPE BOT — VELOCIDAD*\n\n` +
        `⚡ *Latencia:* ${velocidad} ms\n` +
        `🚀 *Estado:* ${estado}\n` +
        `🤖 *Sistema:* En línea`

    // Edita el mensaje anterior en vez de enviar otro
    await sock.sendMessage(chat, {
        text: texto,
        edit: enviado.key
    })
}

handler.command = ['p', 'ping', 'velocidad']
handler.help = ['p']
handler.tags = ['informacion']
handler.menu = true

export default handler