
import axios from 'axios'

const SEARCH_API = 'https://ytm.vrma.dev/search'
const DOWNLOAD_API = 'https://api.delirius.online/download/ytmp3'

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

    // 1. Buscar canción en YouTube Music.
    const { data: searchData } = await axios.get(
      SEARCH_API,
      {
        params: {
          q: query,
          type: 'songs'
        },
        timeout: 25000
      }
    )

    const song = searchData?.results?.find(
      item => item.videoId
    )

    if (!searchData?.success || !song) {
      return m.reply(
        '🐸 *PEPE BOT*\n\n' +
        '❌ No se encontró la canción.'
      )
    }

    const videoUrl =
      `https://www.youtube.com/watch?v=${song.videoId}`

    console.log('[PLAY] Encontrada:', song.title)
    console.log('[PLAY] Solicitando MP3 a Delirius...')

    // 2. Solicitar el MP3 a Delirius.
    const { data: downloadData } = await axios.get(
      DOWNLOAD_API,
      {
        params: { url: videoUrl },
        timeout: 60000
      }
    )

    if (
      !downloadData?.status ||
      !downloadData?.data?.download
    ) {
      throw new Error(
        'Delirius no devolvió un enlace de descarga válido'
      )
    }

    const result = downloadData.data
    const title = result.title || song.title
    const author = result.author || song.artist || 'Desconocido'
    const duration = song.duration || 'Desconocida'
    const views = song.plays || 'No disponibles'
    const thumbnail =
      result.image || song.thumbnails?.at(-1)?.url

    const caption =
      '🐸 *ＰＥＰＥ ＢＯＴ*\n' +
      '🟢 *MUSIC CENTER*\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      `🎵 *${title}*\n\n` +
      `👤 *Artista:* ${author}\n` +
      `⏱️ *Duración:* ${duration}\n` +
      `👁️ *Reproducciones:* ${views}\n` +
      '━━━━━━━━━━━━━━━━━━\n' +
      '🌿 _Tu música, a tu manera._'

    // 3. Mostrar la ficha musical.
    if (thumbnail) {
      try {
        await sock.sendMessage(chat, {
          image: { url: thumbnail },
          caption
        }, { quoted: m })
      } catch (error) {
        console.log('[PLAY] Miniatura:', error.message)

        await sock.sendMessage(chat, {
          text: caption
        }, { quoted: m })
      }
    } else {
      await sock.sendMessage(chat, {
        text: caption
      }, { quoted: m })
    }

    // 4. Mostrar enlace de descarga.
    await sock.sendMessage(chat, {
      text:
        '🎧 *TU AUDIO MP3 ESTÁ LISTO*\n\n' +
        `📥 ${result.download}\n\n` +
        '🔗 Video original:\n' +
        videoUrl
    }, { quoted: m })

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

    console.log('[PLAY] Búsqueda y enlace completados.')

  } catch (error) {
    console.error(
      '[PLAY ERROR]',
      error.response?.status || '',
      error.response?.data || error.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    let message =
      '❌ No se pudo procesar la canción.'

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      message = '⏳ La API tardó demasiado. Intenta de nuevo.'
    } else if (error.response?.status === 403) {
      message = '🚫 Una de las APIs rechazó la petición.'
    } else if (error.response?.status === 429) {
      message = '⏳ Demasiadas solicitudes. Intenta más tarde.'
    } else if (error.response?.status >= 500) {
      message = '⚠️ Una de las APIs no está disponible.'
    }

    await m.reply(
      `🐸 *PEPE BOT*\n\n${message}`
    ).catch(() => {})
  }
}

handler.command = ['play', 'mp3', 'musica']
handler.help = ['play <canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler
