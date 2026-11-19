import config from '../config.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

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

    if (contenido.viewOnceMessageV2Extension?.message) {
      contenido = contenido.viewOnceMessageV2Extension.message
      continue
    }

    break
  }

  return (
    contenido?.extendedTextMessage?.text ??
    contenido?.conversation ??
    contenido?.imageMessage?.caption ??
    contenido?.videoMessage?.caption ??
    contenido?.documentMessage?.caption ??
    contenido?.audioMessage?.caption ??
    ''
  )
}

function obtenerTexto(m) {
  return String(extraerTexto(m))
    .replace(/\r\n/g, '\n')
    .replace(/^[.!/#]bc(?:[ \t]+|\n)?/i, '')
    .trim()
}

function obtenerMensajeCitado(m) {
  // Estructura normalizada del bot
  if (m.quoted?.message) {
    return {
      key: m.quoted.key || {
        remoteJid: m.key.remoteJid,
        participant: m.quoted.sender,
        fromMe: false
      },
      message: m.quoted.message
    }
  }

  // Estructura original de Baileys
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

  const contexto =
    contenido?.extendedTextMessage?.contextInfo ||
    contenido?.imageMessage?.contextInfo ||
    contenido?.videoMessage?.contextInfo ||
    contenido?.documentMessage?.contextInfo ||
    contenido?.audioMessage?.contextInfo

  if (!contexto?.quotedMessage) return null

  return {
    key: {
      remoteJid: m.key.remoteJid,
      participant: contexto.participant,
      fromMe: false,
      id: contexto.stanzaId
    },
    message: contexto.quotedMessage
  }
}

function detectarMedia(mensaje) {
  if (!mensaje?.message) return null

  let contenido = mensaje.message

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

  const tipos = [
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'documentMessage',
    'stickerMessage'
  ]

  for (const tipo of tipos) {
    if (contenido?.[tipo]) {
      return {
        tipo,
        contenido: contenido[tipo],
        mensaje: mensaje.message
      }
    }
  }

  return null
}

function obtenerTextoMedia(media) {
  return (
    media?.contenido?.caption ||
    media?.contenido?.text ||
    ''
  )
}

async function descargarMedia(sock, mensaje) {
  try {
    return await downloadMediaMessage(
      mensaje,
      'buffer',
      {},
      {
        logger: sock.logger,
        reuploadRequest: sock.updateMediaMessage
      }
    )
  } catch (error) {
    console.error('[BC] Error descargando multimedia:', error)
    throw error
  }
}

function obtenerNumero(m) {
  return String(
    m.senderNumber ||
    m.sender ||
    m.key?.participant ||
    ''
  ).replace(/\D/g, '')
}

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid

  const owners = (config.owner || [])
    .map(numero => String(numero).replace(/\D/g, ''))
    .filter(Boolean)

  const numero = obtenerNumero(m)

  const esOwner =
    m.isOwner === true ||
    owners.includes(numero)

  if (!esOwner) {
    return sock.sendMessage(chat, {
      text: '> 🚫 Este comando solo puede usarlo el owner.'
    }, { quoted: m })
  }

  const texto = obtenerTexto(m)
  const citado = obtenerMensajeCitado(m)

  // Multimedia adjunta al propio comando
  const mediaDirecta = detectarMedia(m)

  // Multimedia enviada anteriormente y respondida
  const mediaCitada = detectarMedia(citado)

  const media = mediaDirecta || mediaCitada

  if (!texto && !media) {
    return sock.sendMessage(chat, {
      text:
        '> 📢 *DIFUSIÓN PEPE BOT*\n\n' +
        '> Escribe un mensaje o responde a una imagen, video, audio o documento.\n\n' +
        '> Ejemplos:\n' +
        '> .bc Hola a todos 🐸\n' +
        '> Responde a una imagen con .bc\n' +
        '> Responde a un video con .bc Nuevo video'
    }, { quoted: m })
  }

  await sock.sendMessage(chat, {
    react: {
      text: '📢',
      key: m.key
    }
  }).catch(() => {})

  let buffer = null

  if (media) {
    try {
      const mensajeDescarga = mediaDirecta
        ? m
        : citado

      buffer = await descargarMedia(sock, mensajeDescarga)
    } catch {
      return sock.sendMessage(chat, {
        text: '> ❌ No pude descargar el contenido multimedia.\n\n> Intenta enviar el archivo nuevamente y vuelve a ejecutar el comando.'
      }, { quoted: m })
    }
  }

  let enviados = 0
  let fallidos = 0

  const grupos = await sock.groupFetchAllParticipating()
  const ids = Object.keys(grupos)

  const encabezado =
    '> 📢 *ʙʀᴏᴀᴅᴄᴀsᴛ — ᴘᴇᴘᴇ ʙᴏᴛ* 🐸\n\n'

  const mensaje = encabezado + texto

  for (const id of ids) {
    try {
      if (!media) {
        await sock.sendMessage(id, {
          text: mensaje
        })

      } else if (media.tipo === 'imageMessage') {
        await sock.sendMessage(id, {
          image: buffer,
          caption: mensaje
        })

      } else if (media.tipo === 'videoMessage') {
        await sock.sendMessage(id, {
          video: buffer,
          caption: mensaje,
          mimetype: media.contenido.mimetype || 'video/mp4'
        })

      } else if (media.tipo === 'audioMessage') {
        if (texto) {
          await sock.sendMessage(id, {
            text: mensaje
          })
        }

        await sock.sendMessage(id, {
          audio: buffer,
          mimetype: media.contenido.mimetype || 'audio/mpeg',
          ptt: media.contenido.ptt || false
        })

      } else if (media.tipo === 'documentMessage') {
        await sock.sendMessage(id, {
          document: buffer,
          mimetype: media.contenido.mimetype || 'application/octet-stream',
          fileName: media.contenido.fileName || 'documento',
          caption: mensaje
        })

      } else if (media.tipo === 'stickerMessage') {
        if (texto) {
          await sock.sendMessage(id, {
            text: mensaje
          })
        }

        await sock.sendMessage(id, {
          sticker: buffer
        })
      }

      enviados++

      await new Promise(resolve => setTimeout(resolve, 1200))

    } catch (error) {
      fallidos++

      console.error(
        `[BC] Error enviando a ${id}:`,
        error?.message || error
      )
    }
  }

  await sock.sendMessage(chat, {
    text:
      `> ✅ *DIFUSIÓN FINALIZADA*\n\n` +
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