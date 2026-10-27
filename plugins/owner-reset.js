import config from '../config.js'

const handler = {}

handler.run = async (sock, m) => {
const chat = m.chat || m.key?.remoteJid

const sender = String(m.senderNumber || '').replace(/\D/g, '')
const owners = (config.owner || [])
.filter(Boolean)
.map(numero => String(numero).replace(/\D/g, ''))

if (!(m.isOwner || owners.includes(sender))) {
await sock.sendMessage(chat, {
react: { text: '⛔', key: m.key }
}).catch(() => {})

return m.reply('> 🚫 Este comando solo puede usarlo un owner.')

}

try {
await sock.sendMessage(chat, {
react: { text: '🔄', key: m.key }
}).catch(() => {})

await sock.sendMessage(chat, {
  text:
    `> 🐸 *${config.BOT_NAME || 'PEPE BOT'}*\n\n` +
    '> 🔄 Reiniciando el bot...\n' +
    '> Volveré a estar disponible cuando el servidor lo inicie de nuevo. 💚'
})

await new Promise(resolve => setTimeout(resolve, 1500))

// Solicita al proceso que termine.
// El panel debe estar configurado para reiniciarlo automáticamente.
process.exit(0)

} catch (error) {
console.error('[RESTART ERROR]', error)

await sock.sendMessage(chat, {
  text: '> ❌ No se pudo solicitar el reinicio.'
}).catch(() => {})

}
}

handler.command = ['reiniciar', 'restart']
handler.help = ['reiniciar']
handler.tags = ['owner']
handler.owner = true
handler.menu = true

export default handler