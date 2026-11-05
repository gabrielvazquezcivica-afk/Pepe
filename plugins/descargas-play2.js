
const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text?.trim()) {
      return m.reply(`> ⚠️ Escribe el nombre del video.\n> Ejemplo: ${usedPrefix + command} IMU Jorge Cuellar`)
    }

    await conn.sendMessage(m.chat, {
      react: { text: '🔎', key: m.key }
    })

    const api = `https://api-faa.my.id/faa/ytplayvid?q=${encodeURIComponent(text.trim())}`

    const response = await fetch(api)

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const data = await response.json()

    if (!data.status || !data.result?.download_url) {
      return m.reply('> ❌ No se encontraron resultados para ese video.')
    }

    const {
      download_url,
      searched_title,
      searched_url,
      format
    } = data.result

    const titulo = searched_title || text
    const enlace = searched_url || 'No disponible'
    const formato = format?.toUpperCase() || 'MP4'

    const info = `
> 🎬 *INFORMACIÓN DEL VIDEO*

> 📌 Título: ${titulo}
> 🔗 Enlace: ${enlace}
> 📁 Formato: ${formato}

> 🐸 PEPE BOT
`.trim()

    await conn.sendMessage(m.chat, {
      video: { url: download_url },
      mimetype: 'video/mp4',
      fileName: `${titulo}.mp4`,
      caption: info
    }, { quoted: m })

  } catch (error) {
    console.error('[PLAY2]', error)
    m.reply('> ❌ Ocurrió un error al descargar el video. Inténtalo nuevamente.')
  }
}

handler.command = ['play2']
handler.help = ['play2 <búsqueda>']
handler.tags = ['descargas']

export default handler
