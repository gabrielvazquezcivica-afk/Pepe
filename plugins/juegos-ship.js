
const handler = {}

handler.run = async (sock, m, args) => {
    if (!m.isGroup) {
        return m.reply('> ❌ Este comando solo funciona en grupos.')
    }

    try {
        const participantes = m.message?.extendedTextMessage?.contextInfo
        const citado = m.quoted || null

        const obtenerJid = (texto) => {
            const coincidencia = texto?.match(/@(\d{5,})/)
            return coincidencia ? coincidencia[1] : null
        }

        const menciones = participantes?.mentionedJid || []

        let persona1 = null
        let persona2 = null

        if (menciones.length >= 2) {
            persona1 = menciones[0]
            persona2 = menciones[1]
        } else if (menciones.length === 1) {
            persona1 = menciones[0]
            persona2 = m.sender
        } else if (citado) {
            persona1 =
                citado.sender ||
                citado.key?.participant ||
                citado.key?.participantAlt

            persona2 = m.sender
        } else {
            return m.reply(
                '> 💘 ¿Cómo usar .ship?\n\n' +
                '> • .ship @usuario @usuario\n' +
                '> • .ship @usuario\n' +
                '> • Responde a un mensaje con .ship\n\n' +
                '> ¡Descubre qué porcentaje de compatibilidad tienen! 💞'
            )
        }

        if (!persona1 || !persona2) {
            return m.reply('> ❌ No pude identificar a las dos personas.')
        }

        if (persona1 === persona2) {
            return m.reply('> 😂 No puedes hacer ship contigo mismo.')
        }

        const porcentaje = Math.floor(Math.random() * 101)

        let resultado

        if (porcentaje >= 90) resultado = '💍 ¡Pareja perfecta!'
        else if (porcentaje >= 70) resultado = '💗 ¡Hay mucha química!'
        else if (porcentaje >= 50) resultado = '💕 Puede surgir algo.'
        else if (porcentaje >= 30) resultado = '💞 Una amistad especial.'
        else resultado = '🤣 Parece que no hay mucha química.'

        const barra = '❤️'.repeat(Math.round(porcentaje / 10)) +
            '🤍'.repeat(10 - Math.round(porcentaje / 10))

        await sock.sendMessage(m.chat, {
            react: {
                text: '💘',
                key: m.key
            }
        })

        await sock.sendMessage(m.chat, {
            text:
                `> 💘 SHIP DEL GRUPO\n\n` +
                `> 💗 @${persona1.split('@')[0].split(':')[0]}\n` +
                `> 💞 +\n` +
                `> 💗 @${persona2.split('@')[0].split(':')[0]}\n\n` +
                `> ❤️ Compatibilidad: ${porcentaje}%\n` +
                `> ${barra}\n\n` +
                `> ${resultado}`,
            mentions: [persona1, persona2]
        }, { quoted: m })

    } catch (error) {
        console.error('[SHIP]', error)
        await m.reply('> ❌ Ocurrió un error al generar el ship.')
    }
}

handler.command = ['ship']
handler.help = ['ship']
handler.tags = ['juegos']
handler.menu = true

export default handler
