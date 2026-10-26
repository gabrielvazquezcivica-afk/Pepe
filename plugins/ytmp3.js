import axios from 'axios'

const API = 'https://api.delirius.online/download/ytmp3'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const input = args.join(' ').trim()

  if (!input) {
    return m.reply('❌ Falta el enlace o ID del video.')
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🎧', key: m.key }
    }).catch(() => {})

    // Aceptar enlaces completos, Shorts, youtu.be o ID.
    const match = input.match(
      /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([a-zA-Z0-9_-]{11})/
    )

    const videoId = match?.[1] ||
      (/^[a-zA-Z0-9_-]{11}$/.test(input) ? input : null)

    if (!videoId) {
      return m.reply(
        '❌ Enlace o ID no válido.\n\n' +
        'Ejemplo:\n.playaudio https://www.youtube.com/watch?v=ID'
      )
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    await m.reply('⏳ Preparando el audio para WhatsApp...')

    // Solicitar el enlace de descarga a Delirius.
    const { data } = await axios.get(API, {
      params: { url: videoUrl },
      timeout: 60000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    })

    const result = data?.data
    const downloadUrl = result?.download

    if (!data?.status || !downloadUrl) {
      throw new Error(
        'Delirius no devolvió un enlace de descarga válido.'
      )
    }

    // Descargar los bytes reales del archivo.
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'audio/mpeg, audio/*, application/octet-stream, */*'
      },
      validateStatus: status => status >= 200 && status < 300
    })

    const audio = Buffer.from(response.data)
    const contentType = String(
      response.headers['content-type'] || ''
    ).toLowerCase()

    if (!audio.length) {
      throw new Error('La descarga llegó vacía.')
    }

    // No enviar páginas web o respuestas JSON como si fueran audio.
    if (
      contentType.includes('text/html') ||
      contentType.includes('application/json') ||
      contentType.includes('text/plain')
    ) {
      throw new Error(
        `El enlace devolvió ${contentType}, no un archivo de audio.`
      )
    }

    // Detectar firmas de MP3.
    const isMp3 =
      audio.length >= 3 &&
      (
        audio.toString('ascii', 0, 3) === 'ID3' ||
        (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0)
      )

    if (!isMp3) {
      console.error('[PLAYAUDIO] Respuesta inválida:', {
        status: response.status,
        contentType,
        bytes: audio.length,
        signature: audio.subarray(0, 16).toString('hex')
      })

      throw new Error('La respuesta descargada no es un MP3 válido.')
    }

    const title = String(result.title || 'Pepe-Bot-Audio')
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 100)

    // Enviar el MP3 como archivo reproducible en WhatsApp.
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
      '[PLAYAUDIO]',
      error.response?.status || '',
      error.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
      '❌ No se pudo enviar el audio.\n' +
      'La API puede estar fallando o el enlace no contiene un MP3 válido.'
    ).catch(() => {})
  }
}

handler.command = ['playaudio']
handler.help = ['playaudio <ID o enlace>']
handler.tags = ['descargas']
handler.menu = false

export default handler