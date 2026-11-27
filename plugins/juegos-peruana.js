
const handler = {}

const FRASES = [
    [0, 10, '😂 Ni Machu Picchu sabe de dónde saliste.'],
    [11, 20, '🦙 Tu llama todavía no te reconoce, causa.'],
    [21, 30, '🇵🇪 Se escucha una quena cada vez más cerca.'],
    [31, 40, '💅 Ya te está dando antojo de un cevichito.'],
    [41, 50, '😂 Tu lado peruano está despertando.'],
    [51, 60, '🍋 Ya dices causa hasta cuando saludas.'],
    [61, 70, '🦙 Las llamas ya te consideran de la familia.'],
    [71, 80, '💖 Reina, ya tienes tu lugar en Machu Picchu.'],
    [81, 90, '🇵🇪 Causa, eres orgullo nacional.'],
    [91, 99, '👑 Hasta la mismísima llama te pide autógrafo.'],
    [100, 100, '💅 ¡PERUANA DE EXPORTACIÓN! Qué elegancia, causa.']
]

handler.run = async (sock, m) => {
    const enviado = await sock.sendMessage(m.chat, {
        text: '> 🇵🇪 Calculando nivel de peruana... 💅'
    }, { quoted: m })

    await new Promise(resolve => setTimeout(resolve, 2000))

    const porcentaje = Math.floor(Math.random() * 101)
    const frase = FRASES.find(([min, max]) =>
        porcentaje >= min && porcentaje <= max
    )

    return sock.sendMessage(m.chat, {
        text: `> 🇵🇪 Tu nivel de peruana es ${porcentaje}% 💅\n\n> ${frase[2]}`,
        edit: enviado.key
    })
}

handler.command = ['peruana']
handler.help = ['peruana']
handler.tags = ['juegos']
handler.menu = true

export default handler
