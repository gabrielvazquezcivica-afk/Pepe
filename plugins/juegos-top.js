
const handler = {}

handler.run = async (sock, m, args) => {
    if (!m.isGroup) {
        return m.reply('> ❌ Este comando solo funciona en grupos.')
    }

    const categoria = args.join(' ').trim()

    if (!categoria) {
        return m.reply('> ⚠️ Escribe una categoría. Ejemplo: .top graciosos')
    }

    try {
        const metadata = await sock.groupMetadata(m.chat)

        const participantes = metadata.participants
            .map(p => p.id || p.jid)
            .filter(Boolean)
            .filter((id, i, arr) => arr.indexOf(id) === i)

        if (participantes.length === 0) {
            return m.reply('> ❌ No encontré participantes.')
        }

        const seleccionados = [...participantes]
            .sort(() => Math.random() - 0.5)
            .slice(0, 10)

        const emojis = [
            '🥇', '🥈', '🥉', '🏅', '🎖️',
            '⭐', '💫', '🔥', '💎', '👑'
        ]

        let texto = `> 🏆 TOP ${categoria.toUpperCase()}\n\n`

        seleccionados.forEach((id, i) => {
            texto += `> ${emojis[i]} @${id.split('@')[0].split(':')[0]}\n`
        })

        texto += `\n> 🎲 Selección completamente aleatoria.`

        await sock.sendMessage(m.chat, {
            react: {
                text: '🏆',
                key: m.key
            }
        })

        await sock.sendMessage(m.chat, {
            text: texto,
            mentions: seleccionados
        }, { quoted: m })

    } catch (error) {
        console.error('[TOP]', error)
        await m.reply('> ❌ No pude generar el top.')
    }
}

handler.command = ['top']
handler.help = ['top <categoría>']
handler.tags = ['juegos']
handler.menu = true

export default handler
