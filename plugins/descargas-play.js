import axios from 'axios'

const API_URL = 'https://api-faa.my.id/faa/ytplay?query='

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid
  const texto = args.join(' ').trim()

  if (!texto) {
    return sock.sendMessage(chat, {
      text: '> 🐸 *PEPE BOT — PLAY*\n\n' +
        '> 🎵 Escribe el nombre de una canción.\n\n' +
        '> 📌 Ejemplo: .play IMU Jorge Cuellar'
    }, { quoted: m })
  }

  await sock.sendMessage(chat, {
    react: { text: '🔎', key: m.key }
  }).catch(() => {})

  try {
    const response = await axios.get(
      API_URL + encodeURIComponent(texto),
      {
        timeout: 60000,
        headers: { Accept: 'application/json' }
      }
    )

    const data = response.data
    const song = data?.result

    if (!data?.status || !song) {
      throw new Error('La API no encontró la canción.')
    }

    if (!song.mp3) {
      throw new Error('La API no devolvió el audio.')
    }

    const titulo = String(song.title || 'Canción')
      .replace(/[\r\n]/g, ' ')
      .slice(0, 100)

    const caption =
      '> 🐸 *PEPE BOT — PLAY*\n\n' +
      `> 🎵 *Título:* ${song.title || 'Desconocido'}\n` +
      `> 👤 *Autor:* ${song.author || 'Desconocido'}\n` +
      `> ⏱️ *Duración:* ${song.duration_timestamp || song.duration || 'Desconocida'}\n` +
      `> 👁️ *Vistas:* ${Number(song.views || 0).toLocaleString('es-MX')}\n` +
      `> 🔗 *YouTube:* ${song.url || 'No disponible'}\n\n` +
      '> 📥 Enviando audio...'

    if (song.thumbnail) {
      await sock.sendMessage(chat, {
        image: { url: song.thumbnail },
        caption
      }, { quoted: m })
    } else {
      await sock.sendMessage(chat, {
        text: caption
      }, { quoted: m })
    }

    await sock.sendMessage(chat, {
      audio: { url: song.mp3 },
      mimetype: 'audio/mpeg',
      fileName: `${titulo}.mp3`,
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

    await sock.sendMessage(chat, {
      text:
        '> ❌ *No se pudo obtener la canción.*\n\n' +
        '> La API puede estar caída o no devolver un audio válido.\n' +
        '> Inténtalo de nuevo más tarde.'
    }, { quoted: m }).catch(() => {})
  }
}

handler.command = ['play']
handler.help = ['play <nombre de canción>']
handler.tags = ['descargas']
handler.menu = true

export default handler