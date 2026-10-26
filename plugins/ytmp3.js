
import axios from 'axios'

const API = 'https://api.delirius.online/download/ytmp3'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const input = args.join(' ').trim()

  if (!input) {
    return m.reply('❌ Falta el ID o enlace del video.')
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🎧', key: m.key }
    }).catch(() => {})

    // Acepta un ID de YouTube o una URL de YouTube.
    const videoId = input.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/
    )?.[1]

    const videoUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : `https://www.youtube.com/watch?v=${input}`

    await m.reply('⏳ Preparando el audio MP3...')

    const { data } = await axios.get(API, {
      params: { url: videoUrl },
      timeout: 60000
    })

    const result = data?.data
    const downloadUrl = result?.download

    if (!data?.status || !downloadUrl) {
      throw new Error('La API no devolvió un enlace de audio.')
    }

    // Descargar el MP3 y enviarlo como archivo de audio.
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    const audio = Buffer.from(response.data)

    if (!audio.length) {
      throw new Error('El archivo de audio está vacío.')
    }

    await sock.sendMessage(chat, {
      audio,
      mimetype: 'audio/mpeg',
      fileName: `${(result.title || 'Pepe-Bot-Audio')
        .replace(/[\\/:*?"<>|]/g, '')
        .slice(0, 100)}.mp3`,
      ptt: false
    }, { quoted: m })

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PLAYAUDIO]',
      error.response?.status || '',
      error.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
      '❌ No se pudo enviar el audio. La API o el enlace de descarga pudo fallar.'
    )
  }
}

handler.command = ['playaudio']
handler.help = ['playaudio <ID o URL>']
handler.tags = ['descargas']
handler.menu = false

export default handler
