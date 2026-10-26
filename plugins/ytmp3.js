
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

    // Aceptar ID o URL de YouTube.
    const match = input.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/
    )

    const videoId = match?.[1] ||
      (/^[a-zA-Z0-9_-]{11}$/.test(input) ? input : null)

    if (!videoId) {
      return m.reply('❌ El ID o enlace de YouTube no es válido.')
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    await m.reply('⏳ Descargando y preparando el audio...')

    // Obtener el enlace de descarga.
    const { data } = await axios.get(API, {
      params: { url: videoUrl },
      timeout: 60000
    })

    const result = data?.data
    const downloadUrl = result?.download

    if (!data?.status || !downloadUrl) {
      throw new Error('La API no devolvió un enlace de audio.')
    }

    // Descargar el archivo.
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'audio/mpeg, audio/*, application/octet-stream, */*'
      }
    })

    const audio = Buffer.from(response.data)
    const contentType = String(
      response.headers['content-type'] || ''
    ).toLowerCase()

    if (!audio.length) {
      throw new Error('El archivo descargado está vacío.')
    }

    if (
      contentType.includes('text/html') ||
      contentType.includes('application/json')
    ) {
      throw new Error(
        `La descarga no devolvió audio. Tipo: ${contentType}`
      )
    }

    // Comprobar firmas habituales de archivos de audio.
    const isMp3 =
      audio.length >= 3 &&
      (
        audio.toString('ascii', 0, 3) === 'ID3' ||
        (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0)
      )

    const isMp4Audio =
      audio.length >= 8 &&
      audio.toString('ascii', 4, 8) === 'ftyp'

    const isOgg =
      audio.length >= 4 &&
      audio.toString('ascii', 0, 4) === 'OggS'

    const isWav =
      audio.length >= 12 &&
      audio.toString('ascii', 0, 4) === 'RIFF' &&
      audio.toString('ascii', 8, 12) === 'WAVE'

    if (!isMp3 && !isMp4Audio && !isOgg && !isWav) {
      console.error(
        '[PLAYAUDIO] Tipo recibido:',
        contentType,
        'Tamaño:',
        audio.length,
        'Bytes iniciales:',
        audio.subarray(0, 16).toString('hex')
      )

      throw new Error(
        'El archivo no parece ser un formato de audio válido.'
      )
    }

    // Enviar como audio reproducible en WhatsApp.
    // Solo declaramos MP3 si el archivo realmente es MP3.
    if (!isMp3) {
      throw new Error(
        `El archivo no es MP3. Tipo recibido: ${contentType || 'desconocido'}`
      )
    }

    const safeTitle = String(result.title || 'Pepe-Bot-Audio')
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 100)

    await sock.sendMessage(chat, {
      audio,
      mimetype: 'audio/mpeg',
      fileName: `${safeTitle}.mp3`,
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
      '❌ No se pudo enviar un audio reproducible. Intenta de nuevo más tarde.'
    ).catch(() => {})
  }
}

handler.command = ['playaudio']
handler.help = ['playaudio <ID o URL>']
handler.tags = ['descargas']
handler.menu = false

export default handler
