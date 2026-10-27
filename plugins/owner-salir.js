import config from '../config.js'

const handler = {}

handler.run = async (sock, m) => {
const chat = m.chat || m.key?.remoteJid

if (!chat?.endsWith('@g.us')) {
return m.reply('> ⚠️ Este comando solo se puede usar en grupos.')
}

const sender = String(m.senderNumber || '').replace(/\D/g, '')

const owners = (config.owner || [])
.filter(Boolean)
.map(numero => String(numero).replace(/\D/g, ''))

const isOwner = m.isOwner || owners.includes(sender)

if (!isOwner) {
await sock.sendMessage(chat, {
react: { text: '⛔', key: m.key }
}).catch(() => {})

return m.reply('> 🚫 Solo los owners pueden usar este comando.')

}

try {
await sock.sendMessage(chat, {
react: { text: '👋', key: m.key }
}).catch(() => {})

await sock.sendMessage(chat, {
  text:
    `> 🐸 *${config.BOT_NAME || 'PEPE BOT'}*\n\n` +
    '> ╭━━━━━━━━━━━━━━━━━━━━╮\n' +
    '> │ 👋 ¡Hasta pronto!\n' +
    '> ╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +
    '> Gracias por permitirme formar parte de este grupo. 💚\n' +
    '> ¡Nos vemos en otra ocasión! 🌟'
})

await new Promise(resolve => setTimeout(resolve, 1500))

await sock.groupLeave(chat)

} catch (error) {
console.error('[SALIR ERROR]', error)

await sock.sendMessage(chat, {
  text: '> ❌ No pude salir del grupo. Revisa la conexión y los permisos del bot.'
}).catch(() => {})

}
}

handler.command = ['salir', 'leave']
handler.help = ['salir']
handler.tags = ['owner']
handler.owner = true
handler.menu = true

export default handler