
import axios from 'axios'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const from = m.key.remoteJid
  const url = args[0]

  if (!url || !/^https?:\/\//i.test(url)) {
    return m.reply('❌ No se recibió un enlace de YouTube válido.')
  }

  try {
    await sock.sendMessage(from, {
      react: { text: '🎬', key: m.key }
    }).catch(() => {})

    const response = await axios.get(
      'https://api-faa.my.id/faa/ytplayvid',
      {
        params: { q: url },
        timeout: 60000
      }
    )

    const data = response.data
    const video = data?.result?.download_url

    if (!data?.status || !video) {
      throw new Error('La API no devolvió un enlace de video')
    }

    await sock.sendMessage(from, {
      video: { url: video },
      mimetype: 'video/mp4',
      fileName: 'PEPE-BOT.mp4',
      caption: '🎬 *Video descargado por PEPE BOT* 🐸'
    }, { quoted: m })

    await sock.sendMessage(from, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PLAY MP4]',
      error.response?.status || error.code || error.message
    )

    await m.reply(
      '❌ No se pudo descargar el video. Intenta nuevamente.'
    ).catch(() => {})
  }
}

handler.command = ['playmp4']

export default handler
