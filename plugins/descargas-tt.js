
import axios from 'axios'

const handler = async (m, { conn, text }) => {
  try {
    let url = text?.trim()

    if (!url && m.quoted) {
      url = m.quoted.text || ''
    }

    if (!url) {
      return m.reply('> ⚠️ Envía un enlace de TikTok.\n\n> Ejemplo: .tt https://www.tiktok.com/@usuario/video/123')
    }

    if (!/tiktok\.com/i.test(url)) {
      return m.reply('> ❌ El enlace debe ser de TikTok.')
    }

    await m.reply('> ⏳ Procesando TikTok...')

    const api = `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`
    const { data } = await axios.get(api, { timeout: 60000 })

    if (!data.status || !data.result) {
      return m.reply('> ❌ No se pudo obtener el contenido.')
    }

    const r = data.result
    const caption = `> 🎵 *TIKTOK DESCARGADO*\n\n> 👤 ${r.author?.nickname || 'Desconocido'} (@${r.author?.username || 'usuario'})\n> 📝 ${r.title || 'Sin descripción'}\n> 👁️ ${r.stats?.views || '0'} vistas\n> ❤️ ${r.stats?.likes || '0'} me gusta\n> ⏱️ ${r.duration || 'Sin duración'}`

    // Publicación de fotos
    if (r.type === 'image' && Array.isArray(r.data)) {
      if (!r.data.length) {
        return m.reply('> ❌ No se encontraron imágenes.')
      }

      await conn.sendMessage(m.chat, {
        text: `${caption}\n\n> 🖼️ Fotos: ${r.data.length}`
      }, { quoted: m })

      for (const image of r.data) {
        await conn.sendMessage(m.chat, {
          image: { url: image }
        }, { quoted: m })
      }

      return
    }

    // Video
    const video = r.play || r.video || r.nowm || r.hdplay || r.download_url

    if (!video) {
      return m.reply('> ❌ No se encontró el video para descargar.')
    }

    await conn.sendMessage(m.chat, {
      video: { url: video },
      mimetype: 'video/mp4',
      caption
    }, { quoted: m })

  } catch (error) {
    console.error('[TIKTOK]', error)
    m.reply('> ❌ Ocurrió un error al descargar el TikTok.')
  }
}

handler.command = ['tt', 'tiktok']
handler.help = ['tt <enlace>']
handler.tags = ['descargas']

export default handler
