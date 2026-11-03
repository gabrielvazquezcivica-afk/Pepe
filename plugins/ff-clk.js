
const handler = {}

async function esAdmin(sock, m) {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) return false
    if (m.isAdmin === true) return true

    try {
        const metadata = await sock.groupMetadata(chat)
        const id = m.sender || m.key.participant

        const normalizar = jid =>
            String(jid || '').replace(/:\d+@/, '@')

        const participante = metadata.participants.find(p =>
            [p.id, p.jid, p.lid]
                .filter(Boolean)
                .some(jid => normalizar(jid) === normalizar(id))
        )

        return Boolean(
            participante?.admin === 'admin' ||
            participante?.admin === 'superadmin'
        )
    } catch {
        return false
    }
}

async function reaccionar(sock, m, emoji) {
    return sock.sendMessage(m.key.remoteJid, {
        react: {
            text: emoji,
            key: m.key
        }
    })
}

handler.run = async (sock, m) => {
    if (!(await esAdmin(sock, m))) {
        await reaccionar(sock, m, '❌')
        return
    }

    await reaccionar(sock, m, '✅')

    const texto = `╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🔥 *SALA CLK*
┃ 🐸 *PEPE BOT*
╰━━━━━━━━━━━━━━━━━━━━╯

🎮 *CREACIÓN DE SALA*

⚙️ *CONFIGURACIÓN*
• Rondas: 13
• Vida: 200
• Tienda: Avanzada
• Moneda: 9999
• Municiones limitadas: Sí
• Airdrop: No
• Pro. arma: No
• Aditamentos: No
• Atributos: No

━━━━━━━━━━━━━━━━━━

🔫 *ARMAS PERMITIDAS*

• Desert Eagle
• UMP
• M1014

🛡️ *EQUIPAMIENTO*
• Casco nivel 2
• Chaleco nivel 2

━━━━━━━━━━━━━━━━━━

⚡ *HABILIDADES PERMITIDAS*

• Moco
• Alok
• Maxim
• Kelly

━━━━━━━━━━━━━━━━━━
🐸 *PEPE BOT • FREE FIRE*`

    return m.reply(texto)
}

handler.command = ['clk', 'salaclk']
handler.help = ['clk']
handler.tags = ['free fire']
handler.menu = true

export default handler
