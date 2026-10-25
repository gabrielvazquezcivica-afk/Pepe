import axios from 'axios'

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
      await m.reply('❌ No se encontró la canción.')
      return
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

    const views = Number(song.views || 0).toLocaleString('es-MX')

    const caption =
      '🐸 *PEPE BOT — RESULTADO*\n\n' +
      `🎵 *Título:* ${title}\n` +
      `👤 *Artista:* ${author}\n` +
      `⏱️ *Duración:* ${duration}\n` +
      `👁️ *Vistas:* ${views}\n\n` +
      '👇 *Selecciona el formato de descarga:*'

    // Botones clásicos de WhatsApp
    const buttons = [
      {
        buttonId: `.playaudio ${song.mp3}`,
        buttonText: {
          displayText: '🎵 Descargar audio MP3'
        },
        type: 1
      }
    ]

    if (song.url) {
      buttons.push({
        buttonId: `.playmp4 ${song.url}`,
        buttonText: {
          displayText: '🎬 Descargar video MP4'
        },
        type: 1
      })
    }

    const message = {
      caption,
      footer: '🐸 PEPE BOT • Descargas',
      buttons,
      headerType: 4
    }

    if (song.thumbnail) {
      message.image = { url: song.thumbnail }
    } else {
      message.text = caption
      delete message.caption
      delete message.headerType
    }

    console.log('[PLAY] Enviando botones clásicos...')

    await sock.sendMessage(chat, message, {
      quoted: m
    })

    console.log('[PLAY] Mensaje enviado.')

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PLAY ERROR]',
      error?.response?.status || error?.code || error?.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    let message =
      '❌ No se pudo buscar la canción. Intenta de nuevo.'

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      message = '⏳ La API tardó demasiado. Intenta más tarde.'
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