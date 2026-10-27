import axios from 'axios'
import yts from 'yt-search'

const LIMIT_MB = 200

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const input = args.join(' ').trim()
  const command = String(m.command || '').toLowerCase()

  if (!input) {
    return m.reply(
      '🐸 *PEPE BOT — YOUTUBE*\n\n' +
      '🎵 .play nombre de la canción\n' +
      '🎬 .play2 nombre del video\n\n' +
      'También puedes enviar un enlace de YouTube.'
    )
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🔎', key: m.key }
    }).catch(() => {})

    // Buscar por nombre o aceptar un enlace.
    let video

    if (/youtu\.be\/|youtube\.com\//i.test(input)) {
      const result = await yts({ videoId: getVideoId(input) })
      video = result
    } else {
      const result = await yts(input)
      video = result?.videos?.[0]
    }

    if (!video?.url) {
      throw new Error('No se encontraron resultados de YouTube.')
    }

    const title = String(video.title || 'Video')
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 150)

    const caption =
      `╭─「 🐸 *PEPE BOT* 」\n` +
      `│ 🎵 *Título:* ${video.title}\n` +
      `│ 👤 *Autor:* ${video.author?.name || 'Desconocido'}\n` +
      `│ ⏱️ *Duración:* ${video.timestamp || 'Desconocida'}\n` +
      `│ 👁️ *Vistas:* ${(video.views || 0).toLocaleString()}\n` +
      `│ 🔗 *Enlace:* ${video.url}\n` +
      `╰──────────────\n\n` +
      `⏳ Preparando tu ${command === 'play' ? 'audio' : 'video'}...`

    // Enviar ficha con miniatura.
    if (video.thumbnail) {
      await sock.sendMessage(chat, {
        image: { url: video.thumbnail },
        caption
      }, { quoted: m })
    } else {
      await m.reply(caption)
    }

    // Elegir endpoint según el comando.
    const isAudio = command === 'play'
    const endpoint = isAudio
      ? 'https://api.sylphy.xyz/download/ytmp3'
      : 'https://api.sylphy.xyz/download/ytmp4'

    const apiResponse = await axios.get(endpoint, {
      params: {
        url: video.url,
        apikey: 'sylphy-e321'
      },
      timeout: 120000,
      headers: { Accept: 'application/json' }
    })

    const api = apiResponse.data
    const downloadUrl = api?.dl_url || api?.res?.url

    if (!downloadUrl) {
      throw new Error(
        `La API no devolvió el enlace de ${isAudio ? 'audio' : 'video'}.`
      )
    }

    // Consultar tamaño para videos.
    let sendAsDocument = false

    if (!isAudio) {
      try {
        const head = await axios.head(downloadUrl, {
          timeout: 30000,
          maxRedirects: 5
        })

        const bytes = Number(head.headers['content-length'] || 0)
        sendAsDocument = bytes > LIMIT_MB * 1024 * 1024
      } catch {
        // Si no se puede determinar el tamaño, se envía normalmente.
      }
    }

    // Enviar directamente a WhatsApp desde la URL.
    if (isAudio) {
      await sock.sendMessage(chat, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: m })
    } else {
      await sock.sendMessage(chat, {
        video: { url: downloadUrl },
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`,
        caption: sendAsDocument
          ? '🎬 Video de PEPE BOT'
          : ''
      }, { quoted: m })
    }

    await sock.sendMessage(chat, {
      react: {
        text: isAudio ? '✅' : '📽️',
        key: m.key
      }
    }).catch(() => {})

  } catch (error) {
    console.error('[PEPE PLAY]', error.response?.status || '', error.message)

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
      '❌ No se pudo completar la descarga.\n' +
      'La búsqueda o la API de descarga puede estar fallando.'
    ).catch(() => {})
  }
}

function getVideoId(url) {
  const match = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([a-zA-Z0-9_-]{11})/
  )
  return match?.[1] || null
}

handler.command = ['play', 'play2', 'playvid']
handler.help = [
  'play <canción>',
  'play2 <video>',
  'playvid <video>'
]
handler.tags = ['descargas', 'youtube']
handler.menu = true

export default handler