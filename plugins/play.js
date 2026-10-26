import axios from 'axios'
import { sendButtons } from 'baileys-buttons'

const SEARCH_API = 'https://ytm.vrma.dev/search'
const DOWNLOAD_API = 'https://api.delirius.online/download/ytmp3'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const query = args.join(' ').trim()

  if (!query) {
    return m.reply(
      '🐸 *PEPE BOT*\n\n' +
      '🎵 Escribe el nombre de una canción.\n\n' +
      'Ejemplo: .play IMU'
    )
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🔎', key: m.key }
    }).catch(() => {})

    console.log('[PLAY] Buscando:', query)

    // 1. Buscar canción en YouTube Music
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
      return m.reply('❌ No se encontró la canción.')
    }

    const videoUrl =
      `https://www.youtube.com/watch?v=${song.videoId}`

    console.log('[PLAY] Encontrada:', song.title)

    // 2. Obtener el enlace MP3 de la API nueva
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
      throw new Error('No se obtuvo el enlace MP3')
    }

    const result = downloadData.data
    const title = result.title || song.title || query
    const author =
      result.author || song.artist || 'Desconocido'

    const duration = song.duration || 'Desconocida'
    const views = song.plays || 'No disponibles'

    const thumbnail =
      result.image ||
      song.thumbnails?.at(-1)?.url ||
      song.thumbnails?.[0]?.url

    const caption =
      '🐸 *PEPE BOT — RESULTADO*\n\n' +
      `🎵 *Título:* ${title}\n` +
      `👤 *Artista:* ${author}\n` +
      `⏱️ *Duración:* ${duration}\n` +
      `👁️ *Reproducciones:* ${views}\n\n` +
      '👇 Selecciona el formato que deseas descargar.'

    // 3. Enviar ficha musical
    if (thumbnail) {
      try {
        await sock.sendMessage(
          chat,
          {
            image: { url: thumbnail },
            caption
          },
          { quoted: m }
        )
      } catch (error) {
        console.log('[PLAY] Error de miniatura:', error.message)

        await sock.sendMessage(
          chat,
          { text: caption },
          { quoted: m }
        )
      }
    } else {
      await sock.sendMessage(
        chat,
        { text: caption },
        { quoted: m }
      )
    }

    // 4. Botones con el mismo sistema original
    const buttons = [
      {
        id: `.playaudio ${encodeURIComponent(result.download)}`,
        displayText: '🎵 Descargar audio MP3'
      },
      {
        id: `.playmp4 ${encodeURIComponent(videoUrl)}`,
        displayText: '🎬 Descargar video MP4'
      }
    ]

    console.log('[PLAY] Enviando botones...')

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

    console.log('[PLAY] Ficha y botones enviados.')

  } catch (error) {
    console.error(
      '[PLAY ERROR]',
      error.response?.status || '',
      error.response?.data || error.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    let message = '❌ No se pudo procesar la búsqueda.'

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      message = '⏳ La API tardó demasiado. Intenta de nuevo.'
    } else if (error.response?.status === 403) {
      message = '🚫 La API rechazó la petición.'
    } else if (error.response?.status === 429) {
      message = '⏳ Demasiadas solicitudes. Intenta más tarde.'
    } else if (error.response?.status >= 500) {
      message = '⚠️ El servicio no está disponible.'
    }

    await m.reply(`🐸 *PEPE BOT*\n\n${message}`).catch(() => {})
  }
}

handler.command = ['play', 'mp3', 'musica']
handler.help = ['play <canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler