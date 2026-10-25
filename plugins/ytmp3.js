
import axios from 'axios'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const from = m.key.remoteJid
  const url = args[0]

  if (!url || !/^https?:\/\//i.test(url)) {
    return m.reply('❌ No se recibió un enlace de audio válido.')
  }

  try {
    await sock.sendMessage(from, {
      react: { text: '🎵', key: m.key }
    }).catch(() => {})

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 120000,
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024
    })

    const audio = Buffer.from(response.data)

    if (!audio.length) {
      throw new Error('El audio está vacío')
    }

    await sock.sendMessage(from, {
      audio,
      mimetype: 'audio/mpeg',
      fileName: 'PEPE-BOT.mp3',
      ptt: false
    }, { quoted: m })

    await sock.sendMessage(from, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error('[PLAY AUDIO]', error.message)

    await m.reply(
      '❌ No se pudo descargar el audio. Intenta nuevamente.'
    ).catch(() => {})
  }
}

handler.command = ['playaudio']

export default handler
