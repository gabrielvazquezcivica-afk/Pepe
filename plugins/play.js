import axios from 'axios'
import {
  generateWAMessageFromContent,
  generateWAMessageContent,
  proto
} from '@whiskeysockets/baileys'

const API_URL = 'https://api-faa.my.id/faa/ytplay'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const query = args.join(' ').trim()

  if (!query) {
    return m.reply(
      '🐸 *PEPE BOT*\n\n' +
      '🎵 Escribe el nombre de una canción.\n\n' +
      '📌 Ejemplo: .play IMU'
    )
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🔎', key: m.key }
    }).catch(() => {})

    console.log('[PLAY] Buscando:', query)

    const { data } = await axios.get(API_URL, {
      params: { query },
      timeout: 60000
    })

    const song = data?.result

    if (!data?.status || !song?.mp3) {
      return m.reply('❌ No se encontró la canción.')
    }

    const title = song.title || query
    const author = song.author || 'Desconocido'
    const duration =
      song.duration_timestamp || song.duration || 'Desconocida'
    const views = Number(song.views || 0).toLocaleString('es-MX')

    const caption =
      '🐸 *PEPE BOT — RESULTADO*\n\n' +
      `🎵 *Título:* ${title}\n` +
      `👤 *Artista:* ${author}\n` +
      `⏱️ *Duración:* ${duration}\n` +
      `👁️ *Vistas:* ${views}\n\n` +
      '👇 *Selecciona qué deseas descargar.*'

    const buttons = [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎵 Descargar audio',
          id: 'playaudio'
        })
      }
    ]

    if (song.url) {
      buttons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎬 Descargar video',
          id: 'playmp4'
        })
      })
    }

    let header = proto.Message.InteractiveMessage.Header.create({
      title: '🎧 Canción encontrada',
      hasMediaAttachment: false
    })

    if (song.thumbnail) {
      try {
        const image = await generateWAMessageContent(
          { image: { url: song.thumbnail } },
          { upload: sock.waUploadToServer }
        )

        header = proto.Message.InteractiveMessage.Header.create({
          title: '🎧 Canción encontrada',
          hasMediaAttachment: true,
          imageMessage: image.imageMessage
        })
      } catch (error) {
        console.log(
          '[PLAY] No se pudo cargar la miniatura:',
          error.message
        )
      }
    }

    const interactive =
      proto.Message.InteractiveMessage.create({
        header,
        body: proto.Message.InteractiveMessage.Body.create({
          text: caption
        }),
        footer: proto.Message.InteractiveMessage.Footer.create({
          text: 'PEPE BOT • Descargas'
        }),
        nativeFlowMessage:
          proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons
          })
      })

    const message = generateWAMessageFromContent(
      chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: interactive
          }
        }
      },
      {
        userJid: sock.user.id
      }
    )

    console.log('[PLAY] Enviando ficha interactiva...')

    await sock.relayMessage(chat, message.message, {
      messageId: message.key.id
    })

    console.log('[PLAY] Ficha interactiva enviada.')

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PLAY ERROR]',
      error?.stack || error
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
      '❌ No se pudo enviar la ficha. Intenta de nuevo.'
    ).catch(() => {})
  }
}

handler.command = ['play', 'mp3', 'musica']
handler.help = ['play <canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler