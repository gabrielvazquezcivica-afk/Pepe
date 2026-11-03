
const handler = {}

handler.run = async (sock, m) => {
    const texto = `╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🔥 *SALA VV2*
┃ 🐸 *PEPE BOT*
╰━━━━━━━━━━━━━━━━━━━━╯

🎮 *CREACIÓN DE SALA*

⚙️ *CONFIGURACIÓN*
• Rondas: 15
• Vida: 200
• Tienda: Avanzada
• Moneda: 9999
• Municiones limitadas: Sí
• Airdrop: No
• Pro. arma: No
• Aditamentos: Sí
• Atributos: No

━━━━━━━━━━━━━━━━━━

🔫 *ARMAS PERMITIDAS*

• Mini Uzi
• MP40
• M1887
• Woodpecker
• Trogon
• M590 (2 por equipo)
• XM8
• AWM (1 soporte puede llevarla)

━━━━━━━━━━━━━━━━━━

⚡ *HABILIDADES*

• Activa: Tatsuya
• Alok: Prohibido
• Otho: Prohibido
• Sonia: Prohibido
• Lila: Prohibido
• Wolfrahh: Prohibido
• Rafael: Solamente soporte

━━━━━━━━━━━━━━━━━━
🐸 *PEPE BOT • FREE FIRE*`

    return m.reply(texto)
}

handler.command = ['vv2', 'salavv2']
handler.help = ['vv2']
handler.tags = ['free fire']
handler.menu = true

export default handler
