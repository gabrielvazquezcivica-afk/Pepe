
import axios from 'axios'

const handler = async (m, { conn, text }) => {
  try {
    let url = text?.trim()

    if (!url && m.quoted) {
      url = m.quoted.text || ''
    }

    if (!url) {
      return m.reply('> ⚠️ Escribe un enlace de YouTube.\n\n> Ejemplo: .mp4 https://youtube.com/watch?v=...')
    }

    if (!/youtube\.com|youtu\.be/i.test(url)) {
      return m.reply('> ❌ El enlace debe ser de YouTube.')
    }

    await m.reply('> ⏳ Descargando video...')

    const api = `https://api-faa.my.id/faa/ytmp4?url=${encodeURIComponent(url)}`
    const { data } = await axios.get(api, { timeout: 60000 })

    if (!data.status || !data.result?.download_url) {
      return m.reply('> ❌ No se pudo obtener el video.')
    }

    const videoUrl = data.result.download_url

    await conn.sendMessage(m.chat, {
      video: { url: videoUrl },
      mimetype: 'video/mp4',
      fileName: 'video.mp4',
      caption: '> ✅ Video descargado correctamente.'
    }, { quoted: m })

  } catch (error) {
    console.error('[MP4]', error)
    m.reply('> ❌ Ocurrió un error al descargar el video.')
  }
}

handler.command = ['mp4']
handler.help = ['mp4 <enlace>']
handler.tags = ['descargas']

export default handler
