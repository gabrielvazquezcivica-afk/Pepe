
const handler = async (m, { conn }) => {
  try {
    const id = m.chat

    if (!id.endsWith('@g.us')) {
      return m.reply('> ⚠️ Este comando solamente funciona en grupos.')
    }

    const metadata = await conn.groupMetadata(id)
    const participantes = metadata.participants || []

    const usuario = participantes.find(p => p.id === m.sender)

    const esAdmin = usuario?.admin === 'admin' ||
      usuario?.admin === 'superadmin'

    if (!esAdmin) {
      return m.reply('> ❌ Solo los administradores pueden usar este comando.')
    }

    const candidatos = participantes.filter(p =>
      p.admin !== 'admin' &&
      p.admin !== 'superadmin' &&
      p.id !== conn.user.id
    )

    if (!candidatos.length) {
      return m.reply('> ⚠️ No hay participantes disponibles.')
    }

    const elegido = candidatos[
      Math.floor(Math.random() * candidatos.length)
    ]

    await conn.sendMessage(id, {
      text: `> 🎰 La ruleta ha seleccionado a @${elegido.id.split('@')[0]}`,
      mentions: [elegido.id]
    }, { quoted: m })

    await conn.groupParticipantsUpdate(
      id,
      [elegido.id],
      'remove'
    )

  } catch (error) {
    console.error('[RULETA BAN]', error)
    m.reply('> ❌ No se pudo completar la ruleta. Verifica los permisos del bot.')
  }
}

handler.command = ['ruletaban']
handler.help = ['ruletaban']
handler.tags = ['grupo']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
