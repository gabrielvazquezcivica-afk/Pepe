
import axios from 'axios'

const handler = async (m, { conn, text }) => {
  try {
    let url = text?.trim()

    // También permite responder a un mensaje con un enlace
    if (!url && m.quoted) {
      url = m.quoted.text || ''
    }

    if (!url) {
      return m.reply('> ⚠️ Escribe un enlace de YouTube.\n\n> Ejemplo: .mp3 https://youtube.com/watch?v=...')
    }

    if (!/youtube\.com|youtu\.be/i.test(url)) {
      return m.reply('> ❌ El enlace debe ser de YouTube.')
    }

    await m.reply('> ⏳ Descargando audio...')

    const api = `https://api-faa.my.id/faa/ytmp3?url=${encodeURIComponent(url)}`
    const { data } = await axios.get(api, { timeout: 60000 })

    if (!data.status || !data.result?.mp3) {
      return m.reply('> ❌ No se pudo obtener el audio.')
    }

    const { title, thumbnail, duration, mp3 } = data.result

    await conn.sendMessage(m.chat, {
      audio: { url: mp3 },
      mimetype: 'audio/mpeg',
      fileName: `${title || 'audio'}.mp3`,
      ptt: false,
      contextInfo: {
        externalAdReply: {
          title: title || 'Audio de YouTube',
          body: `Duración: ${duration || 'Desconocida'}`,
          thumbnailUrl: thumbnail,
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: url
        }
      }
    }, { quoted: m })

  } catch (error) {
    console.error('[MP3]', error)
    m.reply('> ❌ Ocurrió un error al descargar el audio.')
  }
}

handler.command = ['mp3']
handler.help = ['mp3 <enlace>']
handler.tags = ['descargas']

export default handler
