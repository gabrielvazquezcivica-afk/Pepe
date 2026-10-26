
import axios from 'axios'
import { sendButtons } from 'baileys-buttons'

const SEARCH_API = 'https://api.delirius.online/search/ytsearch'
const DOWNLOAD_API = 'https://api.delirius.online/download/ytmp3'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const query = args.join(' ').trim()

  if (!query) {
    return m.reply(
      '🐸 *PEPE BOT — PLAY*\n\n' +
      '🎵 Escribe el nombre o enlace de YouTube.\n\n' +
      'Ejemplo: .play IMU'
    )
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🔎', key: m.key }
    }).catch(() => {})

    let videoUrl = ''
    let title = 'Desconocido'
    let author = 'Desconocido'
    let duration = 'Desconocida'
    let thumbnail = ''

    const isUrl = /youtu\.be|youtube\.com/i.test(query)

    if (isUrl) {
      videoUrl = query
    } else {
      const { data } = await axios.get(SEARCH_API, {
        params: { q: query },
        timeout: 30000
      })

      if (!data?.status || !Array.isArray(data.data) || !data.data.length) {
        throw new Error('No se encontraron resultados.')
      }

      const song = data.data[0]

      videoUrl = song.url ||
        (song.videoId ? `https://youtu.be/${song.videoId}` : '')

      title = song.title || title

      const artist = song.author || song.artist || author
      author = typeof artist === 'object'
        ? artist.name || author
        : artist

      duration = song.duration || duration
      thumbnail = song.image || song.thumbnail || ''
    }

    if (!videoUrl) {
      throw new Error('No se obtuvo el enlace del video.')
    }

    // Obtener información y enlace del audio.
    const { data: downloadData } = await axios.get(DOWNLOAD_API, {
      params: { url: videoUrl },
      timeout: 60000
    })

    const result = downloadData?.data
    const audioUrl = typeof result?.download === 'string'
      ? result.download
      : result?.download?.url

    if (!downloadData?.status || !audioUrl) {
      throw new Error('La API no devolvió un enlace de audio.')
    }

    title = result.title || title
    thumbnail = result.image || thumbnail

    const caption =
      '🐸 *ＰＥＰＥ ＢＯＴ — ＰＬＡＹ*\n' +
      '━━━━━━━━━━━━━━━━━━\n\n' +
      `🎵 *Título:* ${title}\n` +
      `👤 *Canal:* ${author}\n` +
      `⏱️ *Duración:* ${duration}\n` +
      `🔗 *Video:* ${videoUrl}\n\n` +
      '👇 Selecciona el formato que deseas.'

    // Enviar la ficha.
    if (thumbnail) {
      try {
        const image = await axios.get(thumbnail, {
          responseType: 'arraybuffer',
          timeout: 30000
        })

        await sock.sendMessage(chat, {
          image: Buffer.from(image.data),
          caption
        }, { quoted: m })
      } catch {
        await sock.sendMessage(chat, {
          text: caption
        }, { quoted: m })
      }
    } else {
      await sock.sendMessage(chat, {
        text: caption
      }, { quoted: m })
    }

    // Botones de selección.
    const buttons = [
      {
        id: `.playaudio ${videoUrl}`,
        displayText: '🎵 Descargar audio MP3'
      },
      {
        id: `.playmp4 ${videoUrl}`,
        displayText: '🎬 Descargar video MP4'
      }
    ]

    await sendButtons(sock, chat, {
      title: '🐸 PEPE BOT',
      text: '¿Qué deseas descargar?',
      footer: 'PEPE BOT • Descargas',
      buttons,
      quoted: m
    })

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error('[PEPE PLAY]', error.response?.status || '', error.message)

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
      `❌ No se pudo procesar la canción.\n${error.message || ''}`
    ).catch(() => {})
  }
}

handler.command = ['play', 'ytmp3', 'mp3', 'musica']
handler.help = ['play <canción o enlace>']
handler.tags = ['descargas']
handler.menu = true

export default handler
