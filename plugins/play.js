import axios from 'axios'

const API_URL = 'https://api-faa.my.id/faa/ytplay?query='

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const query = args.join(' ').trim()

  if (!query) {
    return m.reply(
      '🐸 *PEPE BOT — PLAY*\n\n' +
      '🎵 Escribe el nombre de una canción.\n\n' +
      '📌 *Ejemplo:* .play IMU Jorge Cuellar'
    )
  }

  try {
    await sock.sendMessage(chat, {
      react: { text: '🔎', key: m.key }
    }).catch(() => {})

    // Buscar canción con la API de Faa.
    const response = await axios.get(
      API_URL + encodeURIComponent(query),
      {
        timeout: 60000,
        headers: { Accept: 'application/json' }
      }
    )

    const data = response.data

    if (!data?.status || !data?.result) {
      throw new Error('La API no encontró la canción.')
    }

    const song = data.result

    if (!song.mp3) {
      throw new Error('La API no devolvió el enlace MP3.')
    }

    const title = String(song.title || 'Canción')
      .replace(/[\r\n]/g, ' ')
      .slice(0, 180)

    const caption =
      `╭━━〔 🐸 *PEPE BOT* 〕━━⬣\n` +
      `┃ 🎵 *Título:* ${song.title || 'Desconocido'}\n` +
      `┃ 👤 *Artista:* ${song.author || 'Desconocido'}\n` +
      `┃ ⏱️ *Duración:* ${song.duration_timestamp || 'Desconocida'}\n` +
      `┃ 👁️ *Vistas:* ${Number(song.views || 0).toLocaleString('es-MX')}\n` +
      `┃ 📅 *Publicado:* ${song.published || 'Desconocido'}\n` +
      `┃ 🔗 *YouTube:* ${song.url || 'No disponible'}\n` +
      `╰━━━━━━━━━━━━⬣\n\n` +
      `⏳ *Enviando audio...*`

    // Enviar ficha de la canción.
    if (song.thumbnail) {
      await sock.sendMessage(chat, {
        image: { url: song.thumbnail },
        caption
      }, { quoted: m })
    } else {
      await m.reply(caption)
    }

    // Descargar y enviar el audio MP3.
    await sock.sendMessage(chat, {
      audio: { url: song.mp3 },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      ptt: false
    }, { quoted: m })

    await sock.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PEPE PLAY]',
      error.response?.status || '',
      error.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
      '❌ *No se pudo enviar la canción.*\n\n' +
      'Puede que la API esté caída o que el enlace de audio no funcione. ' +
      'Inténtalo de nuevo más tarde.'
    ).catch(() => {})
  }
}

handler.command = ['play']
handler.help = ['play <nombre de canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler