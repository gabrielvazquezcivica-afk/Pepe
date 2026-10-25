
import axios from 'axios'
import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
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
      'Ejemplo: .play IMU'
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
      song.duration_timestamp ||
      (typeof song.duration === 'number'
        ? `${Math.floor(song.duration / 60)}:${String(
            song.duration % 60
          ).padStart(2, '0')}`
        : 'Desconocida')

    const views = Number(song.views || 0)
      .toLocaleString('es-MX')

    const caption =
      `🎵 Título: ${title}\n` +
      `👤 Artista: ${author}\n` +
      `⏱️ Duración: ${duration}\n` +
      `👁️ Vistas: ${views}\n\n` +
      '👇 Selecciona el formato que deseas descargar.'

    const buttons = [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎵 Descargar audio MP3',
          id: `.playaudio ${song.mp3}`
        })
      }
    ]

    if (song.url) {
      buttons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎬 Descargar video MP4',
          id: `.playmp4 ${song.url}`
        })
      })
    }

    let header = proto.Message.InteractiveMessage.Header.create({
      title: '🐸 PEPE BOT',
      hasMediaAttachment: false
    })

    if (song.thumbnail) {
      try {
        const media = await prepareWAMessageMedia(
          { image: { url: song.thumbnail } },
          {
            upload: sock.waUploadToServer,
            logger: sock.logger,
            jid: chat
          }
        )

        header = proto.Message.InteractiveMessage.Header.create({
          title: '🐸 PEPE BOT',
          hasMediaAttachment: true,
          imageMessage: media.imageMessage
        })
      } catch (error) {
        console.error(
          '[PLAY] Error preparando miniatura:',
          error.message
        )
      }
    }

    const message = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage:
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
        }
      }
    }

    const generated = generateWAMessageFromContent(
      chat,
      message,
      {
        quoted: m,
        userJid: sock.user?.id
      }
    )

    await sock.relayMessage(chat, generated.message, {
      messageId: generated.key.id
    })

    console.log('[PLAY] Ficha interactiva enviada.')

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error('[PLAY ERROR]', error?.stack || error)

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    let message = '❌ No se pudo procesar la búsqueda.'

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      message = '⏳ La API tardó demasiado. Intenta de nuevo.'
    } else if (error.response?.status === 429) {
      message = '⏳ La API está recibiendo demasiadas solicitudes.'
    } else if (error.response?.status >= 500) {
      message = '⚠️ El servicio de descargas no está disponible.'
    }

    await m.reply(message).catch(() => {})
  }
}

handler.command = ['play', 'mp3', 'musica']
handler.help = ['play <canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler
