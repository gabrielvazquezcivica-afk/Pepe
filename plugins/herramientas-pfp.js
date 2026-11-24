
const handler = {}

function obtenerSender(m) {
  return m.sender ||
    m.key?.participant ||
    m.participant ||
    m.key?.remoteJid
}

function extraerMensaje(m) {
  let msg = m?.message || m?.msg || m?.key?.message || {}

  while (msg) {
    if (msg.ephemeralMessage?.message) {
      msg = msg.ephemeralMessage.message
      continue
    }
    if (msg.viewOnceMessage?.message) {
      msg = msg.viewOnceMessage.message
      continue
    }
    if (msg.viewOnceMessageV2?.message) {
      msg = msg.viewOnceMessageV2.message
      continue
    }
    break
  }

  return msg || {}
}

function obtenerContextInfo(m) {
  const mensaje = extraerMensaje(m)

  const tipos = [
    'extendedTextMessage',
    'imageMessage',
    'videoMessage',
    'documentMessage',
    'audioMessage',
    'stickerMessage'
  ]

  for (const tipo of tipos) {
    if (mensaje[tipo]?.contextInfo) {
      return mensaje[tipo].contextInfo
    }
  }

  return null
}

function obtenerObjetivo(m) {
  const sender = obtenerSender(m)
  const contextInfo = obtenerContextInfo(m)

  const menciones = [
    ...(Array.isArray(m.mentionedJid) ? m.mentionedJid : []),
    ...(Array.isArray(contextInfo?.mentionedJid)
      ? contextInfo.mentionedJid
      : [])
  ]

  const mencionado = menciones.find(jid => jid && jid !== sender)

  if (mencionado) return mencionado

  const respondido =
    m.quoted?.sender ||
    m.quoted?.participant ||
    m.quoted?.key?.participant ||
    contextInfo?.participant

  if (respondido && respondido !== sender) {
    return respondido
  }

  return sender
}

handler.run = async (sock, m) => {
  const chat = m.chat || m.key?.remoteJid
  const objetivo = obtenerObjetivo(m)

  if (!chat || !objetivo) return

  try {
    let foto

    try {
      foto = await sock.profilePictureUrl(objetivo, 'image')
    } catch {
      return sock.sendMessage(chat, {
        text: '❌ No pude obtener la foto de perfil. Puede que el usuario no tenga una foto visible.'
      }, { quoted: m })
    }

    const nombre = `@${objetivo.split('@')[0]}`

    await sock.sendMessage(chat, {
      image: { url: foto },
      caption: `🖼️ *FOTO DE PERFIL*\n\n👤 Usuario: ${nombre}`,
      mentions: [objetivo]
    }, { quoted: m })

  } catch (error) {
    console.error('Error en pfp:', error)

    await sock.sendMessage(chat, {
      text: '❌ Ocurrió un error al obtener la foto de perfil.'
    }, { quoted: m })
  }
}

handler.command = ['pfp']
handler.help = ['pfp']
handler.tags = ['herramientas']
handler.menu = true

export default handler
