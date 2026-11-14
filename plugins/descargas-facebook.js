
const handler = {}

const API = 'https://api-faa.my.id/faa/fbdownload?url='

function detectarTipo(buffer) {
  if (
    buffer[0] === 0xFF &&
    buffer[1] === 0xD8 &&
    buffer[2] === 0xFF
  ) return 'image/jpeg'

  if (
    buffer[0] === 0x89 &&
    buffer.toString('ascii', 1, 4) === 'PNG'
  ) return 'image/png'

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp'

  if (buffer.toString('ascii', 0, 3) === 'GIF') {
    return 'image/gif'
  }

  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    return 'video/mp4'
  }

  if (
    buffer[0] === 0x1A &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xDF &&
    buffer[3] === 0xA3
  ) return 'video/webm'

  return null
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

    const mediaResponse = await fetch(data.result.media, {
      signal: AbortSignal.timeout(120000)
    })

    if (!mediaResponse.ok) {
      throw new Error(`Error descargando archivo: HTTP ${mediaResponse.status}`)
    }

    const buffer = Buffer.from(await mediaResponse.arrayBuffer())

    if (!buffer.length) {
      throw new Error('El archivo multimedia está vacío.')
    }

    const tipo = detectarTipo(buffer)

    console.log('[PEPE FACEBOOK] Tipo detectado:', tipo)

    const caption =
      '`📥 PEPE BOT FACEBOOK`\n\n' +
      '✅ Descarga completada.\n\n' +
      '> Powered By 𝒫ℯ𝓅ℯ ℬℴ𝓉 🐸'

    if (tipo?.startsWith('image/')) {
      await sock.sendMessage(chat, {
        image: buffer,
        mimetype: tipo,
        caption
      }, { quoted: m })

    } else if (tipo?.startsWith('video/')) {
      await sock.sendMessage(chat, {
        video: buffer,
        mimetype: tipo,
        caption
      }, { quoted: m })

    } else {
      throw new Error('No se pudo reconocer el formato real del archivo.')
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
