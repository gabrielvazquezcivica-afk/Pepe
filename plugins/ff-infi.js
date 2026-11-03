
const handler = {}

handler.run = async (sock, m) => {
    const texto = `╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🔥 *SALA INFINITAS*
┃ 🐸 *PEPE BOT*
╰━━━━━━━━━━━━━━━━━━━━╯

🎮 *CREACIÓN DE SALA*

⚙️ *CONFIGURACIÓN*
• Rondas: 13
• Vida: 500
• Tienda: Avanzada
• Moneda: 9999
• Municiones limitadas: No
• Airdrop: No
• Pro. arma: Sí
• Aditamentos: Sí
• Atributos: Sí

━━━━━━━━━━━━━━━━━━

⚡ *HABILIDADES PERMITIDAS*

• Alok
• K

━━━━━━━━━━━━━━━━━━
🐸 *PEPE BOT • FREE FIRE*`

    return m.reply(texto)
}

handler.command = ['infi', 'salainfi', 'infinitas']
handler.help = ['infi']
handler.tags = ['free fire']
handler.menu = true

export default handler
