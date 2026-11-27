
const handler = {}

const FRASES = [
    [0, 10, '🗿 Cupido anda buscando la dirección equivocada.'],
    [11, 20, '😂 Apenas se detecta una pequeña señal de arcoíris.'],
    [21, 30, '👀 Hay miradas sospechosas por ahí.'],
    [31, 40, '💗 El radar empieza a hacer bip bip.'],
    [41, 50, '🤨 Aquí hay algo que no nos están contando.'],
    [51, 60, '🌈 El arcoíris ya te tiene en sus contactos.'],
    [61, 70, '💅 Las chicas bonitas ya te llaman la atención.'],
    [71, 80, '💕 Tu corazón tiene preferencias muy claras.'],
    [81, 90, '👑 Cupido ya se consiguió una novia.'],
    [91, 99, '🌈 El arcoíris te nombró embajadora oficial.'],
    [100, 100, '💖 ¡REINA! Hasta Cupido te pide consejos.']
]

handler.run = async (sock, m) => {
    const enviado = await sock.sendMessage(m.chat, {
        text: '> 💗 Calculando nivel de lesbiana... 🌈'
    }, { quoted: m })

    await new Promise(resolve => setTimeout(resolve, 2000))

    const porcentaje = Math.floor(Math.random() * 101)
    const frase = FRASES.find(([min, max]) =>
        porcentaje >= min && porcentaje <= max
    )

    return sock.sendMessage(m.chat, {
        text: `> 🌈 Tu nivel de lesbiana es ${porcentaje}% 💗\n\n> ${frase[2]}`,
        edit: enviado.key
    })
}

handler.command = ['lesbiana']
handler.help = ['lesbiana']
handler.tags = ['juegos']
handler.menu = true

export default handler
