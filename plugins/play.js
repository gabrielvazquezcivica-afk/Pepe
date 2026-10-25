
import axios from 'axios'
import { generateWAMessageContent } from '@whiskeysockets/baileys'

const API_URL = 'https://api-faa.my.id/faa/ytplay'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const from = m.key.remoteJid
  const query = args.join(' ').trim()

  if (!query) {
    return sock.sendMessage(from, {
      text: '🎵 *ESCRIBE EL NOMBRE DE LA CANCIÓN*\n\n> Ejemplo: .play IMU'
    }, { quoted: m })
  }

  try {
    await sock.sendMessage(from, {
      react: { text: '🔎', key: m.key }
    }).catch(() => {})

    // Buscar usando la API original que ya funciona
    const response = await axios.get(API_URL, {
      params: { query },
      timeout: 60000
    })

    const data = response.data
    const song = data?.result

    if (!data?.status || !song?.mp3) {
      throw new Error('No se encontró la canción o el MP3')
    }

    const title = song.title || query
    const author = song.author || 'Desconocido'

    const duration = song.duration_timestamp ||
      (typeof song.duration === 'number'
        ? `${Math.floor(song.duration / 60)}:${String(
            song.duration % 60
          ).padStart(2, '0')}`
        : 'Desconocida')

    const views = Number(song.views || 0).toLocaleString('es-MX')
    const videoUrl = song.url || ''

    const caption =
      '╭━━━〔 🐸 PEPE BOT 〕━━━╮\n' +
      `│ 🎵 Título: ${title}\n` +
      `│ 👤 Artista: ${author}\n` +
      `│ ⏱️ Duración: ${duration}\n` +
      `│ 👁️ Vistas: ${views}\n` +
      '╰━━━━━━━━━━━━━━━━━━╯\n\n' +
      '👇 *SELECCIONA EL FORMATO QUE DESEAS*'

    const rows = [
      {
        header: '🎵 AUDIO',
        title: 'Descargar MP3',
        description: 'Obtener la canción en audio',
        id: `.playaudio ${song.mp3}`
      }
    ]

    if (videoUrl) {
      rows.push({
        header: '🎬 VIDEO',
        title: 'Descargar MP4',
        description: 'Obtener el video de YouTube',
        id: `.playmp4 ${videoUrl}`
      })
    }

    const interactiveMessage = {
      body: { text: caption },
      footer: { text: '🐸 PEPE BOT • Descargas' },
      header: {
        title: '🎧 Resultado encontrado',
        hasMediaAttachment: false
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: '📥 Elegir formato',
              sections: [
                {
                  title: 'Opciones de descarga',
                  rows
                }
              ]
            })
          }
        ]
      }
    }

    // Intentar añadir la miniatura sin bloquear el menú
    if (song.thumbnail) {
      try {
        const imageContent = await Promise.race([
          generateWAMessageContent(
            { image: { url: song.thumbnail } },
            { upload: sock.waUploadToServer }
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Tiempo de espera de miniatura agotado')),
              15000
            )
          )
        ])

        interactiveMessage.header = {
          title: '🎧 Resultado encontrado',
          hasMediaAttachment: true,
          imageMessage: imageContent.imageMessage
        }
      } catch (imageError) {
        console.error('[PLAY THUMBNAIL]', imageError.message)
      }
    }

    await sock.relayMessage(
      from,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage
          }
        }
      },
      {}
    )

    await sock.sendMessage(from, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PLAY]',
      error.response?.status || error.code || error.message
    )

    await sock.sendMessage(from, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    let message = '❌ *NO SE PUDO BUSCAR LA CANCIÓN. INTENTA MÁS TARDE.*'

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      message = '⏳ *LA API TARDÓ DEMASIADO. INTENTA DE NUEVO.*'
    }

    await sock.sendMessage(from, {
      text: message
    }, { quoted: m }).catch(() => {})
  }
}

handler.command = ['play', 'mp3', 'musica']
handler.help = ['play <canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler
