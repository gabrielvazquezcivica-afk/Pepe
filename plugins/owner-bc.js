
import config from '../config.js'

const handler = {}

function extraerTexto(m) {
  let contenido = m.message

  while (contenido) {
    if (contenido.ephemeralMessage?.message) {
      contenido = contenido.ephemeralMessage.message
      continue
    }

    if (contenido.viewOnceMessage?.message) {
      contenido = contenido.viewOnceMessage.message
      continue
    }

    if (contenido.viewOnceMessageV2?.message) {
      contenido = contenido.viewOnceMessageV2.message
      continue
    }

    break
  }

  return (
    contenido?.extendedTextMessage?.text ??
    contenido?.conversation ??
    contenido?.imageMessage?.caption ??
    contenido?.videoMessage?.caption ??
    ''
  )
}

function obtenerMensajeOriginal(m) {
  const texto = String(extraerTexto(m))
    .replace(/\r\n/g, '\n')

  // Quitar únicamente el comando y el primer espacio que lo separa.
  return texto.replace(/^[.!/#]bc(?:[ \t]+|\n)?/i, '')
}

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid
  const texto = obtenerMensajeOriginal(m)

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

  if (!texto.trim()) {
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
        text:
          `> 📢 *ʙʀᴏᴀᴅᴄᴀsᴛ — ᴘᴇᴘᴇ ʙᴏᴛ* 🐸\n\n` +
          texto
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
