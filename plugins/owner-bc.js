
import config from '../config.js'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid
  const texto = args.join(' ').trim()

  const owners = (config.owner || []).map(n =>
    String(n).replace(/\D/g, '')
  ).filter(Boolean)

  const numero = String(m.senderNumber || '').replace(/\D/g, '')
  const esOwner = m.isOwner || owners.includes(numero)

  if (!esOwner) {
    return sock.sendMessage(chat, {
      text: '> 🚫 Este comando solo puede usarlo el owner.'
    }, { quoted: m })
  }

  if (!texto) {
    return sock.sendMessage(chat, {
      text: '> 📢 Escribe el mensaje que quieres enviar.\n\n> Ejemplo: .bc Hola a todos 🐸'
    }, { quoted: m })
  }

  await sock.sendMessage(chat, {
    react: { text: '📢', key: m.key }
  }).catch(() => {})

  let enviados = 0
  let fallidos = 0

  const grupos = await sock.groupFetchAllParticipating()
  const ids = Object.keys(grupos)

  for (const id of ids) {
    try {
      await sock.sendMessage(id, {
        text: `> 📢 *ʙʀᴏᴀᴅᴄᴀsᴛ — ᴘᴇᴘᴇ ʙᴏᴛ* 🐸\n\n> ${texto.replace(/\n/g, '\n> ')}`
      })

      enviados++
      await new Promise(resolve => setTimeout(resolve, 1200))
    } catch (error) {
      fallidos++
      console.error(`Error enviando BC a ${id}:`, error?.message || error)
    }
  }

  await sock.sendMessage(chat, {
    text:
      `> ✅ *Difusión finalizada*\n\n` +
      `> 📬 Grupos enviados: ${enviados}\n` +
      `> ⚠️ Fallidos: ${fallidos}\n` +
      `> 📊 Total de grupos: ${ids.length}`
  }, { quoted: m })
}

handler.command = ['bc']
handler.help = ['bc <mensaje>']
handler.tags = ['owner']
handler.menu = true

export default handler
