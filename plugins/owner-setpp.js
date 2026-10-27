import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid

  // Solo el owner puede usar este comando.
  if (!m.isOwner) {
    return m.reply(
      '> 🐸 *PEPE BOT — OWNER*\n\n' +
      '> 🚫 Este comando es exclusivo del propietario.'
    )
  }

  try {
    const message =
      m.message?.ephemeralMessage?.message ||
      m.message

    const context =
      message?.extendedTextMessage?.contextInfo

    const quoted =
      context?.quotedMessage?.ephemeralMessage?.message ||
      context?.quotedMessage

    const imageMessage =
      message?.imageMessage ||
      quoted?.imageMessage

    if (!imageMessage) {
      return m.reply(
        '> 📸 *CAMBIAR FOTO DE PERFIL*\n\n' +
        '> Usa el comando de estas formas:\n\n' +
        '> ` .setpp ` junto con una imagen\n' +
        '> Responde a una imagen con ` .setpp `'
      )
    }

    const stream = await downloadContentFromMessage(
      imageMessage,
      'image'
    )

    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    const imageBuffer = Buffer.concat(chunks)

    if (!imageBuffer.length) {
      throw new Error('La imagen está vacía.')
    }

    await sock.updateProfilePicture(
      sock.user.id,
      imageBuffer
    )

    await m.reply(
      '> ✅ *FOTO ACTUALIZADA*\n\n' +
      '> 🐸 La foto de perfil de `PEPE BOT` se cambió correctamente.'
    )

  } catch (error) {
    console.error('[SETPP]', error)

    await m.reply(
      '> ❌ *ERROR AL CAMBIAR LA FOTO*\n\n' +
      '> No se pudo actualizar la foto de perfil.\n' +
      '> Verifica la imagen e inténtalo de nuevo.'
    )
  }
}

handler.command = ['setpp', 'setbotpic']
handler.help = ['setpp']
handler.tags = ['owner']
handler.menu = true

export default handler