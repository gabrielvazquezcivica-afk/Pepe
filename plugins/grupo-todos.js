function limpiarJid(jid = '') {
  return String(jid).replace(/:\d+@/, '@').trim()
}

function obtenerBandera(numero = '') {
  const prefijos = {
    '52': '🇲🇽',
    '1': '🇺🇸',
    '57': '🇨🇴',
    '54': '🇦🇷',
    '55': '🇧🇷',
    '56': '🇨🇱',
    '51': '🇵🇪',
    '58': '🇻🇪',
    '593': '🇪🇨',
    '502': '🇬🇹',
    '503': '🇸🇻',
    '504': '🇭🇳',
    '505': '🇳🇮',
    '506': '🇨🇷',
    '507': '🇵🇦',
    '591': '🇧🇴',
    '595': '🇵🇾',
    '598': '🇺🇾',
    '509': '🇭🇹',
    '53': '🇨🇺',
    '501': '🇧🇿',
    '592': '🇬🇾',
    '597': '🇸🇷',
    '599': '🇨🇼',

    '34': '🇪🇸',
    '33': '🇫🇷',
    '39': '🇮🇹',
    '44': '🇬🇧',
    '49': '🇩🇪',
    '351': '🇵🇹',
    '352': '🇱🇺',
    '353': '🇮🇪',
    '354': '🇮🇸',
    '30': '🇬🇷',
    '31': '🇳🇱',
    '32': '🇧🇪',
    '36': '🇭🇺',
    '40': '🇷🇴',
    '41': '🇨🇭',
    '43': '🇦🇹',
    '45': '🇩🇰',
    '46': '🇸🇪',
    '47': '🇳🇴',
    '48': '🇵🇱',
    '358': '🇫🇮',
    '370': '🇱🇹',
    '371': '🇱🇻',
    '372': '🇪🇪',
    '380': '🇺🇦',
    '381': '🇷🇸',
    '385': '🇭🇷',
    '386': '🇸🇮',
    '420': '🇨🇿',
    '421': '🇸🇰',
    '7': '🇷🇺',
    '90': '🇹🇷',

    '91': '🇮🇳',
    '81': '🇯🇵',
    '82': '🇰🇷',
    '86': '🇨🇳',
    '62': '🇮🇩',
    '63': '🇵🇭',
    '60': '🇲🇾',
    '65': '🇸🇬',
    '66': '🇹🇭',
    '84': '🇻🇳',
    '92': '🇵🇰',
    '93': '🇦🇫',
    '94': '🇱🇰',
    '95': '🇲🇲',
    '880': '🇧🇩',
    '855': '🇰🇭',
    '856': '🇱🇦',
    '852': '🇭🇰',
    '853': '🇲🇴',

    '971': '🇦🇪',
    '972': '🇮🇱',
    '966': '🇸🇦',
    '974': '🇶🇦',
    '98': '🇮🇷',
    '964': '🇮🇶',
    '962': '🇯🇴',
    '961': '🇱🇧',
    '963': '🇸🇾',
    '965': '🇰🇼',
    '968': '🇴🇲',
    '967': '🇾🇪',

    '20': '🇪🇬',
    '27': '🇿🇦',
    '212': '🇲🇦',
    '213': '🇩🇿',
    '216': '🇹🇳',
    '218': '🇱🇾',
    '234': '🇳🇬',
    '233': '🇬🇭',
    '225': '🇨🇮',
    '221': '🇸🇳',
    '237': '🇨🇲',
    '254': '🇰🇪',
    '255': '🇹🇿',
    '256': '🇺🇬',
    '251': '🇪🇹',
    '258': '🇲🇿',
    '260': '🇿🇲',
    '263': '🇿🇼',

    '61': '🇦🇺',
    '64': '🇳🇿',
    '679': '🇫🇯',
    '675': '🇵🇬',
    '685': '🇼🇸'
  }

  const numeroLimpio = String(numero).replace(/\D/g, '')
  const ordenados = Object.keys(prefijos).sort(
    (a, b) => b.length - a.length
  )

  for (const prefijo of ordenados) {
    if (numeroLimpio.startsWith(prefijo)) {
      return prefijos[prefijo]
    }
  }

  return '🌎'
}

const handler = {}

handler.run = async (sock, m) => {
  const from = m.key.remoteJid

  try {
    const metadata = await sock.groupMetadata(from)
    const participantes = metadata.participants || []

    // Verificar administrador
    const normalizar = jid => limpiarJid(jid || '')

    const identificadores = [
      m.key.participant,
      m.key.participantAlt,
      m.participant,
      m.sender,
      m.senderLid
    ].filter(Boolean).map(normalizar)

    const participante = participantes.find(p => {
      const ids = [
        p.id,
        p.jid,
        p.lid
      ].filter(Boolean).map(normalizar)

      return ids.some(id => identificadores.includes(id))
    })

    if (!participante?.admin) {
      return sock.sendMessage(from, {
        text: '→ ⚠️ *Este comando solo puede ser usado por administradores.*'
      }, { quoted: m })
    }

    const mentions = []
    let lista = ''
    let contador = 0

    for (const p of participantes) {
      const jid = limpiarJid(p.jid || p.id)

      if (!jid) continue

      const numero = jid.split('@')[0]
      const bandera = obtenerBandera(numero)

      contador++
      mentions.push(jid)

      lista += `┆ ${contador}. ${bandera} @${numero}\n`
    }

    const mensaje =
`─── ⋆⋅☆⋅⋆ ──
       ✦ 𝐓𝐎𝐃𝐎𝐒 ✦
─── ⋆⋅☆⋅⋆ ──

→ *Grupo:* ${metadata.subject || 'Grupo'}
→ *Miembros:* ${participantes.length}

${lista}
─── ⋆⋅☆⋅⋆ ──
→ 𝐏𝐄𝐏𝐄 𝐁𝐎𝐓 🐸`

    await sock.sendMessage(from, {
      text: mensaje,
      mentions
    }, { quoted: m })

  } catch (error) {
    console.error('[TODOS]', error)

    await sock.sendMessage(from, {
      text: '→ ❌ No pude obtener la lista de participantes.'
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