
import axios from 'axios'
import { sendButtons } from 'baileys-buttons'

const API_URL = 'https://api-faa.my.id/faa/ytplay'

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

    const views = Number(song.views || 0)
      .toLocaleString('es-MX')

    const caption =
      '🐸 *PEPE BOT — RESULTADO*\n\n' +
      `🎵 *Título:* ${title}\n` +
      `👤 *Artista:* ${author}\n` +
      `⏱️ *Duración:* ${duration}\n` +
      `👁️ *Vistas:* ${views}\n\n` +
      '👇 Selecciona el formato que deseas descargar.'

    // Primero enviamos la ficha normal.
    if (song.thumbnail) {
      try {
        await sock.sendMessage(chat, {
          image: { url: song.thumbnail },
          caption
        }, { quoted: m })
      } catch (error) {
        console.log(
          '[PLAY] No se pudo enviar miniatura:',
          error.message
        )

        await sock.sendMessage(chat, {
          text: caption
        }, { quoted: m })
      }
    } else {
      await sock.sendMessage(chat, {
        text: caption
      }, { quoted: m })
    }

    // Construimos los botones de respuesta rápida.
    const buttons = [
      {
        id: `.playaudio ${song.mp3}`,
        displayText: '🎵 Descargar audio MP3'
      }
    ]

    if (song.url) {
      buttons.push({
        id: `.playmp4 ${song.url}`,
        displayText: '🎬 Descargar video MP4'
      })
    }

    console.log('[PLAY] Enviando menú de botones...')

    await sendButtons(sock, chat, {
      title: '🐸 PEPE BOT',
      text: '¿Qué deseas descargar?',
      footer: 'PEPE BOT • Descargas',
      buttons,
      quoted: m
    })

    console.log('[PLAY] Menú enviado; comprueba WhatsApp.')

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PLAY ERROR]',
      error?.stack || error
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    let message =
      '❌ No se pudo procesar la búsqueda.'

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      message = '⏳ La API tardó demasiado. Intenta de nuevo.'
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
