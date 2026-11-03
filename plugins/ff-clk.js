
const handler = {}

handler.run = async (sock, m) => {
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
