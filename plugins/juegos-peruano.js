
const handler = {}

const FRASES = [
    [0, 10, '😂 Ni Machu Picchu sabe de dónde saliste.'],
    [11, 20, '🦙 Tu llama todavía no te reconoce.'],
    [21, 30, '🇵🇪 Se escucha una quena a lo lejos.'],
    [31, 40, '🍋 Ya estás buscando tu cevichito.'],
    [41, 50, '🦙 Tu espíritu andino está despertando.'],
    [51, 60, '😂 Ya casi dices causa cada dos palabras.'],
    [61, 70, '🍽️ El ceviche corre por tus venas.'],
    [71, 80, '🏔️ Machu Picchu te está esperando.'],
    [81, 90, '🇵🇪 Causa, ya eres patrimonio nacional.'],
    [91, 99, '🦙 Hasta las llamas te saludan de respeto.'],
    [100, 100, '👑 ¡PERUANO DE EXPORTACIÓN! Ni más ni menos, causa.']
]

handler.run = async (sock, m) => {
    const enviado = await sock.sendMessage(m.chat, {
        text: '> 🇵🇪 Calculando nivel de peruano... 🦙'
    }, { quoted: m })

    await new Promise(resolve => setTimeout(resolve, 2000))

    const porcentaje = Math.floor(Math.random() * 101)
    const frase = FRASES.find(([min, max]) =>
        porcentaje >= min && porcentaje <= max
    )

    return sock.sendMessage(m.chat, {
        text: `> 🇵🇪 Tu nivel de peruano es ${porcentaje}% 🦙\n\n> ${frase[2]}`,
        edit: enviado.key
    })
}

handler.command = ['peruano']
handler.help = ['peruano']
handler.tags = ['juegos']
handler.menu = true

export default handler
