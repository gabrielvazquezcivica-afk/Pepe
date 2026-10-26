import axios from 'axios'

const SEARCH_API = 'https://api.delirius.online/search/ytsearch'
const AUDIO_API = 'https://api.delirius.online/download/ytmp3'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const query = args.join(' ').trim()

  if (!query) {
    return m.reply(
      '🐸 *PEPE BOT — PLAY*\n\n' +
      'Escribe el nombre de una canción.\n' +
      'Ejemplo: .play Morad normal'
    )
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🎵', key: m.key }
    }).catch(() => {})

    // Buscar la canción.
    const searchResponse = await axios.get(SEARCH_API, {
      params: { q: query },
      timeout: 60000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const searchData = searchResponse.data
    const songs = searchData?.data

    if (
      !searchData?.status ||
      !Array.isArray(songs) ||
      !songs.length
    ) {
      throw new Error('No se encontraron canciones.')
    }

    const song = songs[0]
    const videoUrl =
      song.url ||
      song.videoUrl ||
      (song.videoId
        ? `https://www.youtube.com/watch?v=${song.videoId}`
        : null)

    if (!videoUrl) {
      throw new Error('El resultado no contiene un enlace de YouTube.')
    }

    await m.reply(
      `🐸 *PEPE BOT — PLAY*\n\n` +
      `🎵 *Título:* ${song.title || query}\n` +
      `👤 *Autor:* ${song.author?.name || song.author || 'Desconocido'}\n` +
      `⏱️ *Duración:* ${song.duration?.timestamp || song.duration || 'No disponible'}\n\n` +
      `⏳ Preparando audio...`
    )

    // Obtener el enlace MP3.
    const audioResponse = await axios.get(AUDIO_API, {
      params: { url: videoUrl },
      timeout: 60000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const result = audioResponse.data?.data
    const downloadUrl = result?.download

    if (!audioResponse.data?.status || !downloadUrl) {
      throw new Error('La API no devolvió el enlace de audio.')
    }

    // Descargar el archivo real.
    const fileResponse = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'audio/mpeg, audio/*, application/octet-stream, */*'
      }
    })

    const audio = Buffer.from(fileResponse.data)
    const contentType = String(
      fileResponse.headers['content-type'] || ''
    ).toLowerCase()

    if (
      !audio.length ||
      contentType.includes('text/html') ||
      contentType.includes('application/json')
    ) {
      throw new Error(
        `El enlace no devolvió audio. Tipo: ${contentType || 'desconocido'}`
      )
    }

    // Validar que sea MP3.
    const isMp3 =
      audio.length >= 3 &&
      (
        audio.toString('ascii', 0, 3) === 'ID3' ||
        (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0)
      )

    if (!isMp3) {
      throw new Error('El archivo recibido no es un MP3 válido.')
    }

    const title = String(result.title || song.title || query)
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 100)

    // Enviar el audio directamente, sin botones.
    await sock.sendMessage(
      chat,
      {
        audio,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      },
      { quoted: m }
    )

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PLAY]',
      error.response?.status || '',
      error.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
      '❌ No pude enviar el audio. Puede que la API esté fallando o que el enlace no entregue un MP3 válido.'
    ).catch(() => {})
  }
}

handler.command = ['play', 'musica', 'ytmp3', 'mp3']
handler.help = ['play <nombre de canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler