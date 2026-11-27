
const handler = {}

handler.run = async (sock, m) => {
    const enviado = await sock.sendMessage(m.chat, {
        text: '> 🦊 Calculando nivel de zorra...'
    }, { quoted: m })

    await new Promise(resolve => setTimeout(resolve, 2000))

    const porcentaje = Math.floor(Math.random() * 101)

    return sock.sendMessage(m.chat, {
        text:
            `> 🦊 Tu nivel de zorra es ${porcentaje}%\n\n` +
            `> Eres más zorra que tu madre 🦊😂`,
        edit: enviado.key
    })
}

handler.command = ['zorra']
handler.help = ['zorra']
handler.tags = ['juegos']
handler.menu = true

export default handler
