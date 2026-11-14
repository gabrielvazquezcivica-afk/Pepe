
const handler = {}

const API = 'https://api-faa.my.id/faa/fbdownload?url='

async function detectarTipo(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Range: 'bytes=0-0' },
    signal: AbortSignal.timeout(30000)
  })

  if (!response.ok && response.status !== 206) {
    throw new Error('No se pudo comprobar el archivo multimedia.')
  }

  const tipo = response.headers.get('content-type') || ''

  return tipo.toLowerCase()
}

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid
  const url = args.join(' ').trim()

  if (!url) {
    return m.reply(
      '`📥 PEPE BOT FACEBOOK`\n\n' +
      '> Envía el enlace de una foto o video de Facebook.\n\n' +
      '`EJEMPLO:`\n' +
      '> .fb https://www.facebook.com/...'
    )
  }

  if (!/^https?:\/\/(www\.|m\.|web\.)?facebook\.com\//i.test(url) &&
      !/^https?:\/\/fb\.watch\//i.test(url)) {
    return m.reply(
      '`📥 PEPE BOT FACEBOOK`\n\n' +
      '> ❌ El enlace no parece ser de Facebook.'
    )
  }

  await sock.sendMessage(chat, {
    react: { text: '📥', key: m.key }
  }).catch(() => {})

  try {
    const response = await fetch(API + encodeURIComponent(url), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(60000)
    })

    const data = await response.json()

    console.log('[PEPE FACEBOOK] Respuesta API:', data)

    if (!response.ok || data.status !== true || !data.result?.media) {
      throw new Error(data.error || 'La API no devolvió contenido multimedia.')
    }

    const { media, thumbnail } = data.result
    const tipo = await detectarTipo(media)

    const caption =
      '`📥 PEPE BOT FACEBOOK`\n\n' +
      '✅ Descarga completada.\n\n' +
      '> Powered By 𝒫ℯ𝓅ℯ ℬℴ𝓉 🐸'

    if (tipo.startsWith('image/')) {
      await sock.sendMessage(chat, {
        image: { url: media },
        caption
      }, { quoted: m })

    } else if (tipo.startsWith('video/')) {
      await sock.sendMessage(chat, {
        video: { url: media },
        mimetype: tipo.split(';')[0] || 'video/mp4',
        caption
      }, { quoted: m })

    } else {
      throw new Error(`Tipo de archivo no compatible: ${tipo || 'desconocido'}`)
    }

  } catch (error) {
    console.error('[PEPE FACEBOOK] Error:', error)

    await m.reply(
      '`📥 PEPE BOT FACEBOOK`\n\n' +
      '> ❌ No se pudo descargar la foto o el video.\n\n' +
      '> Comprueba el enlace e intenta nuevamente.'
    )
  }
}

handler.command = ['fb', 'facebook']
handler.help = ['fb <enlace>']
handler.tags = ['descargas']
handler.menu = true

export default handler
