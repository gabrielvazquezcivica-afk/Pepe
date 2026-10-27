
import axios from 'axios'

const API_URL = 'https://api-faa.my.id/faa/ytplay?query='

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid
  const query = args.join(' ').trim()

  if (!chat) return

  if (!query) {
    return sock.sendMessage(chat, {
      text:
        '> 🐸 *PEPE BOT — PLAY*\n\n' +
        '> 🎵 Escribe el nombre de una canción.\n\n' +
        '> 📌 *Ejemplo:* .play IMU Jorge Cuellar'
    }, { quoted: m })
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🔎', key: m.key }
    }).catch(() => {})

    console.log(`[PEPE PLAY] Buscando: ${query}`)

    const response = await axios.get(
      API_URL + encodeURIComponent(query),
      {
        timeout: 45000,
        headers: { Accept: 'application/json' }
      }
    )

    const data = response.data
    const song = data?.result

    if (!song) {
      throw new Error('La API no devolvió resultados.')
    }

    if (!song.mp3) {
      throw new Error('La API no devolvió el enlace MP3.')
    }

    const limpiar = (valor, fallback = 'No disponible') =>
      String(valor || fallback).replace(/[\r\n]/g, ' ').slice(0, 250)

    const titulo = limpiar(song.title, 'Canción')
    const artista = limpiar(song.author)
    const duracion = limpiar(song.duration_timestamp || song.duration)
    const vistas = Number(song.views || 0).toLocaleString('es-MX')
    const publicado = limpiar(song.published)
    const enlace = limpiar(song.url)

    const caption =
      `╭━━〔 🐸 *PEPE BOT* 〕━━⬣\n` +
      `┃ 🎵 *Título:* ${titulo}\n` +
      `┃ 👤 *Artista:* ${artista}\n` +
      `┃ ⏱️ *Duración:* ${duracion}\n` +
      `┃ 👁️ *Vistas:* ${vistas}\n` +
      `┃ 📅 *Publicado:* ${publicado}\n` +
      `┃ 🔗 *YouTube:* ${enlace}\n` +
      `╰━━━━━━━━━━━━⬣\n\n` +
      `> 🎧 Preparando tu audio...`

    // Enviar la ficha de la canción.
    if (song.thumbnail) {
      try {
        await sock.sendMessage(chat, {
          image: { url: song.thumbnail },
          caption
        }, { quoted: m })
      } catch (error) {
        console.error('[PEPE PLAY] Error enviando miniatura:', error.message)

        await sock.sendMessage(chat, {
          text: caption
        }, { quoted: m })
      }
    } else {
      await sock.sendMessage(chat, {
        text: caption
      }, { quoted: m })
    }

    // Enviar el audio.
    console.log(`[PEPE PLAY] Enviando audio: ${titulo}`)

    await sock.sendMessage(chat, {
      audio: { url: song.mp3 },
      mimetype: 'audio/mpeg',
      fileName: `${titulo.replace(/[\\/:*?"<>|]/g, '').slice(0, 100)}.mp3`,
      ptt: false
    }, { quoted: m })

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PEPE PLAY ERROR]',
      error.response?.status || '',
      error.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await sock.sendMessage(chat, {
      text:
        '> ❌ *No se pudo completar la descarga.*\n\n' +
        '> Puede que la API esté caída o que el enlace de audio haya fallado.\n' +
        '> Inténtalo de nuevo más tarde.'
    }, { quoted: m }).catch(() => {})
  }
}

handler.command = ['play']
handler.help = ['play <nombre de canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler
