
const handler = {}

const FRASES = [
    [0, 10, '🗿 Ni el arcoíris sabe quién eres.'],
    [11, 20, '😂 Apenas te está llegando la señal del orgullo.'],
    [21, 30, '🤨 Hay un arcoíris sospechoso siguiéndote.'],
    [31, 40, '💅 Se te cayó un poquito de glitter.'],
    [41, 50, '👀 No confirmamos nada, pero tampoco lo negamos.'],
    [51, 60, '🌈 Ya estás saludando al arcoíris de lejos.'],
    [61, 70, '💅 Caminar contigo ya parece pasarela.'],
    [71, 80, '✨ El glitter viene incluido de nacimiento.'],
    [81, 90, '👑 ¡Reina, se te olvidó quitarte la corona!'],
    [91, 99, '🏳️‍🌈 El arcoíris te pidió autógrafo.'],
    [100, 100, '💅 ¡DIOSA! Hasta las divas te tienen envidia.']
]

handler.run = async (sock, m) => {
    const enviado = await sock.sendMessage(m.chat, {
        text: '> 🌈 Calculando nivel de gay... 💅'
    }, { quoted: m })

    await new Promise(resolve => setTimeout(resolve, 2000))

    const porcentaje = Math.floor(Math.random() * 101)
    const frase = FRASES.find(([min, max]) =>
        porcentaje >= min && porcentaje <= max
    )

    return sock.sendMessage(m.chat, {
        text: `> 🌈 Tu nivel de gay es ${porcentaje}% 💅\n\n> ${frase[2]}`,
        edit: enviado.key
    })
}

handler.command = ['gay']
handler.help = ['gay']
handler.tags = ['juegos']
handler.menu = true

export default handler
