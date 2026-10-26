import axios from 'axios'

const API = 'https://api.delirius.online/download/ytmp3'
const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const id = args[0]

  if (!id) return m.reply('❌ Falta el ID del video.')

  try {
    await m.reply('🎧 Obteniendo el audio...')

    const url = `https://www.youtube.com/watch?v=${id}`

    const { data } = await axios.get(API, {
      params: { url },
      timeout: 60000
    })

    if (!data?.status || !data?.data?.download) {
      throw new Error('La API no devolvió un enlace de audio.')
    }

    const result = data.data

    await sock.sendMessage(chat, {
      text: `🎵 *${result.title || 'Audio listo'}*\n📥 ${result.download}`
    }, { quoted: m })

  } catch (error) {
    console.error('[PLAYAUDIO]', error.message)
    await m.reply('❌ No se pudo obtener el audio. Intenta más tarde.')
  }
}

handler.command = ['playaudio']
handler.help = ['playaudio <id>']
handler.tags = ['descargas']
handler.menu = false

export default handler