
const handler = {}

const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@').trim()

const esAdmin = participante =>
    ['admin', 'superadmin'].includes(participante?.admin)

// Banderas por prefijo telefónico.
const banderas = {
    '1': '🇺🇸',
    '7': '🇷🇺',
    '20': '🇪🇬',
    '27': '🇿🇦',
    '30': '🇬🇷',
    '31': '🇳🇱',
    '32': '🇧🇪',
    '33': '🇫🇷',
    '34': '🇪🇸',
    '36': '🇭🇺',
    '39': '🇮🇹',
    '40': '🇷🇴',
    '41': '🇨🇭',
    '43': '🇦🇹',
    '44': '🇬🇧',
    '45': '🇩🇰',
    '46': '🇸🇪',
    '47': '🇳🇴',
    '48': '🇵🇱',
    '49': '🇩🇪',
    '51': '🇵🇪',
    '52': '🇲🇽',
    '53': '🇨🇺',
    '54': '🇦🇷',
    '55': '🇧🇷',
    '56': '🇨🇱',
    '57': '🇨🇴',
    '58': '🇻🇪',
    '60': '🇲🇾',
    '61': '🇦🇺',
    '62': '🇮🇩',
    '63': '🇵🇭',
    '64': '🇳🇿',
    '65': '🇸🇬',
    '66': '🇹🇭',
    '81': '🇯🇵',
    '82': '🇰🇷',
    '84': '🇻🇳',
    '86': '🇨🇳',
    '90': '🇹🇷',
    '91': '🇮🇳',
    '92': '🇵🇰',
    '93': '🇦🇫',
    '94': '🇱🇰',
    '95': '🇲🇲',
    '98': '🇮🇷',
    '212': '🇲🇦',
    '213': '🇩🇿',
    '216': '🇹🇳',
    '218': '🇱🇾',
    '234': '🇳🇬',
    '254': '🇰🇪',
    '255': '🇹🇿',
    '256': '🇺🇬',
    '351': '🇵🇹',
    '352': '🇱🇺',
    '353': '🇮🇪',
    '354': '🇮🇸',
    '358': '🇫🇮',
    '370': '🇱🇹',
    '371': '🇱🇻',
    '372': '🇪🇪',
    '380': '🇺🇦',
    '420': '🇨🇿',
    '421': '🇸🇰',
    '502': '🇬🇹',
    '503': '🇸🇻',
    '504': '🇭🇳',
    '505': '🇳🇮',
    '506': '🇨🇷',
    '507': '🇵🇦',
    '591': '🇧🇴',
    '593': '🇪🇨',
    '595': '🇵🇾',
    '598': '🇺🇾',
    '852': '🇭🇰',
    '853': '🇲🇴',
    '855': '🇰🇭',
    '856': '🇱🇦',
    '880': '🇧🇩',
    '966': '🇸🇦',
    '971': '🇦🇪',
    '972': '🇮🇱',
    '974': '🇶🇦',
    '992': '🇹🇯',
    '993': '🇹🇲',
    '994': '🇦🇿',
    '995': '🇬🇪',
    '996': '🇰🇬',
    '998': '🇺🇿'
}

const obtenerNumero = participante => {
    const ids = [
        participante?.id,
        participante?.jid,
        participante?.lid
    ]

    return ids.find(id =>
        String(id || '').endsWith('@s.whatsapp.net')
    ) || ids.find(Boolean) || ''
}

const obtenerBandera = jid => {
    const numero = String(jid || '').replace(/\D/g, '')

    const prefijos = Object.keys(banderas)
        .sort((a, b) => b.length - a.length)

    const prefijo = prefijos.find(p => numero.startsWith(p))

    return prefijo ? banderas[prefijo] : '🌐'
}

handler.run = async (sock, m) => {
    const chat = m.key.remoteJid

    const reaccion = async emoji => {
        try {
            await sock.sendMessage(chat, {
                react: { text: emoji, key: m.key }
            })
        } catch {}
    }

    const aviso = texto =>
        sock.sendMessage(chat, { text: texto }, { quoted: m })

    // Solo grupos.
    if (!chat?.endsWith('@g.us')) {
        await reaccion('❌')
        return aviso('> 🐸 Este comando solo funciona en grupos.')
    }

    // Obtener participantes.
    let metadata

    try {
        metadata = await sock.groupMetadata(chat)
    } catch {
        await reaccion('❌')
        return aviso('> ❌ No pude obtener los participantes del grupo.')
    }

    const participantes = metadata.participants || []

    // Validar administrador.
    const idsEjecutor = [
        m.key?.participant,
        m.key?.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ].filter(Boolean).map(normalizar)

    const adminEjecutor = participantes.find(p => {
        const ids = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizar)

        return ids.some(id => idsEjecutor.includes(id))
    })

    if (!esAdmin(adminEjecutor)) {
        await reaccion('🚫')
        return aviso('> 🚫 Solo los administradores pueden usar .todos.')
    }

    if (!participantes.length) {
        await reaccion('⚠️')
        return aviso('> ⚠️ No encontré miembros en este grupo.')
    }

    await reaccion('📢')

    const nombreGrupo = metadata.subject || 'Grupo'
    const total = participantes.length

    // Crear lista completa.
    const lista = participantes.map((p, index) => {
        const jid = obtenerNumero(p)
        const numero = String(jid).split('@')[0]
        const bandera = obtenerBandera(jid)

        return {
            jid: p.id,
            texto: `> ${String(index + 1).padStart(2, '0')}. ${bandera} @${numero}`
        }
    }).filter(p => p.jid)

    // Un solo mensaje con todos los participantes.
    let texto =
        `╭━━〔 🐸 *PEPE BOT* 〕━━╮\n` +
        `┃ 🏷️ *${nombreGrupo}*\n` +
        `┃ 👥 *Miembros:* ${total}\n` +
        `╰━━━━━━━━━━━━━━╯\n\n` +
        `> 📢 *LISTA DE MIEMBROS*\n\n`

    texto += lista.map(p => p.texto).join('\n')
    texto += '\n\n> 🐸 *PEPE BOT — TODOS*'

    try {
        await sock.sendMessage(chat, {
            text: texto,
            mentions: lista.map(p => p.jid)
        })
    } catch {
        await aviso('> ❌ No se pudo enviar la lista completa.')
    }
}

handler.command = ['todos', 'tagall']
handler.help = ['todos']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true

export default handler
