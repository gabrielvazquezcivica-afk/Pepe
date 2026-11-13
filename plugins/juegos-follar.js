
const handler = {}

handler.run = async (sock, m) => {
    if (!m.isGroup) {
        return m.reply('> ⚠️ Este comando solo funciona en grupos.')
    }

    const contexto = m.message?.extendedTextMessage?.contextInfo
    const menciones = contexto?.mentionedJid || []
    const citado = m.quoted

    const persona1 = m.sender
    let persona2 = null

    if (menciones.length >= 1) {
        persona2 = menciones[0]
    } else if (citado) {
        persona2 =
            citado.sender ||
            citado.key?.participant ||
            citado.key?.participantAlt
    } else {
        return m.reply(
            '> ⚠️ ¿Cómo usar el comando?\n\n' +
            '> .follar @usuario\n' +
            '> También puedes responder a un mensaje con .follar'
        )
    }

    if (!persona1 || !persona2) {
        return m.reply('> ❌ No pude identificar a los participantes.')
    }

    if (persona1 === persona2) {
        return m.reply('> 😂 No puedes seleccionarte a ti mismo.')
    }

    const name1 = persona1.split('@')[0].split(':')[0]
    const name2 = persona2.split('@')[0].split(':')[0]

    const texto =
        `🤤👅🥵 ACABAS DE FOLLAR 🥵👅🤤

@${name1} SE ACABA DE FOLLAR A LA PERRA DE @${name2} AH 4 PATAS MIENTRAS GEMIA COMO UNA MALDITA PERRA (Aaah...Aaah, no pares, sigue, sigue) Y LA HAS DEJADO TAN REVENTADA QUE NO PUEDE NI SOSTENER SU PROPIO CUERPO LA MALDITA PERRA 😳🔥

🤤 @${name2} YA TE HAN FOLLADO 🥵`

    await sock.sendMessage(m.chat, {
        react: {
            text: '🥵',
            key: m.key
        }
    })

    await sock.sendMessage(m.chat, {
        text: texto,
        mentions: [persona1, persona2]
    }, { quoted: m })
}

handler.command = ['follar']
handler.help = ['follar @usuario']
handler.tags = ['juegos']
handler.menu = true

export default handler
