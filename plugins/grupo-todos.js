const handler = {}

function limpiarJid(jid = '') {
  return String(jid).replace(/:\d+@/, '@').trim()
}

const emojis = [
  '🐸', '🌸', '🦋', '🐢', '⭐', '🍀',
  '🐬', '🌙', '🐻', '🍄', '🦊', '🌺',
  '🐼', '💫', '🌻', '🐣', '🪷', '🍓',
  '🐨', '🧸', '🪻', '🐙', '🌈', '💎'
]

handler.run = async (sock, m) => {
  const from = m.key.remoteJid

  try {
    const metadata = await sock.groupMetadata(from)
    const participantes = metadata.participants || []

    // Identificar al usuario que ejecutó el comando
    const normalizar = jid => limpiarJid(jid || '')

    const identificadores = [
      m.key.participant,
      m.key.participantAlt,
      m.participant,
      m.sender,
      m.senderLid
    ].filter(Boolean).map(normalizar)

    const participante = participantes.find(p => {
      const ids = [p.id, p.jid, p.lid]
        .filter(Boolean)
        .map(normalizar)

      return ids.some(id => identificadores.includes(id))
    })

    // Comprobar que sea administrador
    if (!participante?.admin) {
      return sock.sendMessage(from, {
        text: '⚠️ Este comando solo puede ser usado por administradores.'
      }, { quoted: m })
    }

    const mentions = []
    let lista = ''

    for (const p of participantes) {
      const jid = limpiarJid(p.jid || p.id)
      if (!jid) continue

      const numero = jid.split('@')[0]
      const emoji = emojis[Math.floor(Math.random() * emojis.length)]

      mentions.push(jid)
      lista += `│→ ${emoji} @${numero}\n`
    }

    const mensaje =
`> 🐸 *${metadata.subject || 'Grupo'}*
> 👥 *Miembros: ${participantes.length}*

${lista}└──⋆⋅☆⋅⋆ ──┘`

    await sock.sendMessage(from, {
      text: mensaje,
      mentions
    }, { quoted: m })

  } catch (error) {
    console.error('[TODOS]', error)

    await sock.sendMessage(from, {
      text: '❌ No pude obtener la lista de participantes.'
    }, { quoted: m })
  }
}

handler.command = ['todos', 'tagall']
handler.help = ['todos']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true

export default handler