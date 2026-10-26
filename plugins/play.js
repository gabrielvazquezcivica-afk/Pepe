import axios from 'axios'

const SEARCH_API = 'https://ytm.vrma.dev/search'
const AUDIO_API = 'https://api.delirius.online/download/ytmp3'

// Configura aquí una API MP4 que devuelva un enlace de descarga válido.
const VIDEO_API = ''

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const query = args.join(' ').trim()

  if (!query) {
    return m.reply(
      '🐸 *PEPE BOT | MUSIC CENTER*\n\n' +
      '🎵 Escribe el nombre de una canción.\n' +
      '📌 Ejemplo: .play IMU'
    )
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🔎', key: m.key }
    }).catch(() => {})

    console.log('[PLAY] Buscando:', query)

    // 1. Buscar canción
    const { data: searchData } = await axios.get(
      SEARCH_API,
      {
        params: { q: query, type: 'songs' },
        timeout: 25000
      }
    )

    const song = searchData?.results?.find(
      item => item.videoId
    )

    if (!searchData?.success || !song) {
      return m.reply(
        '🐸 *PEPE BOT*\n\n❌ No se encontró la canción.'
      )
    }

    const videoUrl =
      `https://www.youtube.com/watch?v=${song.videoId}`

    const thumbnail =
      song.thumbnails?.at(-1)?.url ||
      song.thumbnails?.[0]?.url

    const caption =
      '🐸 *ＰＥＰＥ ＢＯＴ*\n' +
      '🟢 *MUSIC CENTER*\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      `🎵 *${song.title || 'Sin título'}*\n\n` +
      `👤 *Artista:* ${song.artist || 'Desconocido'}\n` +
      `⏱️ *Duración:* ${song.duration || 'Desconocida'}\n` +
      `👁️ *Reproducciones:* ${song.plays || 'No disponibles'}\n` +
      '━━━━━━━━━━━━━━━━━━\n' +
      '📌 Selecciona una de las opciones\n' +
      '🌿 _Tu música, a tu manera._'

    // 2. Crear ficha con botones
    const buttons = [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎧 Audio MP3',
          id: `.playaudio ${song.videoId}`
        })
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎬 Video MP4',
          id: `.playvideo ${song.videoId}`
        })
      }
    ]

    const message = {
      ...(thumbnail
        ? { image: { url: thumbnail } }
        : {}),
      caption,
      footer: '🐸 PEPE BOT',
      buttons
    }

    await sock.sendMessage(chat, message, { quoted: m })

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

    console.log('[PLAY] Ficha enviada:', song.title)

  } catch (error) {
    console.error(
      '[PLAY ERROR]',
      error.response?.status || '',
      error.response?.data || error.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
      '🐸 *PEPE BOT*\n\n❌ No se pudo buscar la canción.'
    ).catch(() => {})
  }
}

handler.command = ['play', 'mp3', 'musica']
handler.help = ['play <canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler