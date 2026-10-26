import axios from 'axios'

const VIDEO_API = ''

const handler = {}

handler.run = async (sock, m, args = []) => {
  const id = args[0]

  if (!id) return m.reply('❌ Falta el ID del video.')

  if (!VIDEO_API) {
    return m.reply(
      '🎬 La descarga de video todavía no está configurada: falta una API MP4 compatible.'
    )
  }

  try {
    const url = `https://www.youtube.com/watch?v=${id}`

    const { data } = await axios.get(VIDEO_API, {
      params: { url },
      timeout: 60000
    })

    const download =
      data?.data?.download ||
      data?.result?.download_url ||
      data?.download

    if (!download) {
      throw new Error('La API no devolvió un enlace de video.')
    }

    await sock.sendMessage(m.key.remoteJid, {
      text: `🎬 *Video listo*\n📥 ${download}`
    }, { quoted: m })

  } catch (error) {
    console.error('[PLAYVIDEO]', error.message)
    await m.reply('❌ No se pudo obtener el video.')
  }
}

handler.command = ['playvideo']
handler.help = ['playvideo <id>']
handler.tags = ['descargas']
handler.menu = false

export default handler