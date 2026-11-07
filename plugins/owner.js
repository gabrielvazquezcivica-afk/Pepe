
import config from '../config.js'

const handler = {}

handler.run = async (sock, m) => {
    const from = m.chat || m.key.remoteJid

    const numero = String(config.owner[0] || '')
        .replace(/[^0-9]/g, '')

    if (!numero) {
        return m.reply('❌ No hay un número de owner configurado.')
    }

    const vcard =
`BEGIN:VCARD
VERSION:3.0
FN:👑 Owner ${config.BOT_NAME}
TEL;type=CELL;type=VOICE;waid=${numero}:${numero}
END:VCARD`

    await sock.sendMessage(from, {
        contacts: {
            displayName: '👑 Owner',
            contacts: [{ vcard }]
        }
    }, { quoted: m })

    await sock.sendMessage(from, {
        text:
`╭━━━〔 👑 OWNER 👑 〕━━━⬣
┃
┃ 📞 Contacto del creador
┃ 👑 ${config.OWNER_NAME}
┃
┃ 🐸 ${config.BOT_NAME}
╰━━━━━━━━━━━━━━━━━━⬣`
    }, { quoted: m })
}

handler.command = ['owner', 'creador']
handler.help = ['owner']
handler.tags = ['informacion']
handler.menu = true

export default handler
