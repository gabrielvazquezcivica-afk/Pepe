
const handler = {}

const FRASES = [
    '💗 ¡La química se nota!',
    '💕 Pareja con mucha conexión.',
    '🥰 ¡Aquí hay algo especial!',
    '💘 El destino los juntó.',
    '❤️ Dúo con mucha química.',
    '✨ ¡Hacen bonita pareja!',
    '😍 ¿Será que aquí nace el amor?',
    '💞 Una combinación inesperada.'
]

function mezclar(array) {
    const copia = [...array]

    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copia[i], copia[j]] = [copia[j], copia[i]]
    }

    return copia
}

handler.run = async (sock, m) => {
    if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos.')
    }

    try {
        const metadata = await sock.groupMetadata(m.chat)

        const participantes = metadata.participants
            .map(p => p.id || p.jid)
            .filter(Boolean)
            .filter((id, i, arr) => arr.indexOf(id) === i)
            .filter(id => id !== sock.user.id.split(':')[0] + '@s.whatsapp.net')

        if (participantes.length < 2) {
            return m.reply('❌ No hay suficientes participantes.')
        }

        const mezclados = mezclar(participantes)
        const cantidad = Math.min(5, Math.floor(mezclados.length / 2))

        let texto = `╭━━〔 💘 TOP PAREJAS 〕━━⬣\n`
        texto += `┃ 💞 Grupo: ${metadata.subject}\n`
        texto += `┃ 🏆 Parejas seleccionadas: ${cantidad}\n`
        texto += `╰━━━━━━━━━━━━━━━━⬣\n\n`

        const menciones = []

        for (let i = 0; i < cantidad; i++) {
            const persona1 = mezclados[i * 2]
            const persona2 = mezclados[i * 2 + 1]

            menciones.push(persona1, persona2)

            const frase = FRASES[
                Math.floor(Math.random() * FRASES.length)
            ]

            texto += `╭━━〔 💗 PAREJA ${i + 1} 〕━━⬣\n`
            texto += `┃ @${persona1.split('@')[0].split(':')[0]}\n`
            texto += `┃ 💞 +\n`
            texto += `┃ @${persona2.split('@')[0].split(':')[0]}\n`
            texto += `┃\n`
            texto += `┃ ${frase}\n`
            texto += `╰━━━━━━━━━━━━━━━━⬣\n\n`
        }

        await sock.sendMessage(m.chat, {
            react: {
                text: '💘',
                key: m.key
            }
        })

        await sock.sendMessage(m.chat, {
            text: texto.trim(),
            mentions: menciones
        }, { quoted: m })

    } catch (error) {
        console.error('[TOPPAREJAS]', error)
        await m.reply('❌ No pude generar las parejas. Inténtalo nuevamente.')
    }
}

handler.command = ['topparejas']
handler.help = ['topparejas']
handler.tags = ['juegos']
handler.menu = true

export default handler
