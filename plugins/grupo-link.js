
const handler = {}

const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@').trim()

const esAdmin = participante =>
    ['admin', 'superadmin'].includes(participante?.admin)

const buscar = (participantes, identificadores = []) => {
    const ids = identificadores.filter(Boolean).map(normalizar)

    return participantes.find(p => {
        const idsParticipante = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizar)

        return idsParticipante.some(id => ids.includes(id))
    })
}

handler.run = async (sock, m) => {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
    }

    let metadata

    try {
        metadata = await sock.groupMetadata(chat)
    } catch {
        return m.reply('> ❌ No pude obtener la información del grupo.')
    }

    const participantes = metadata.participants || []

    const adminEjecutor = buscar(participantes, [
        m.key?.participant,
        m.key?.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ])

    if (!esAdmin(adminEjecutor)) {
        return m.reply('> 🚫 Solamente los administradores pueden obtener el enlace.')
    }

    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const botInfo = buscar(participantes, [
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ])

    if (!esAdmin(botInfo)) {
        return m.reply('> ⚠️ Pepe Bot necesita ser administrador del grupo.')
    }

    try {
        const codigo = await sock.groupInviteCode(chat)

        if (!codigo) {
            return m.reply('> ❌ No pude obtener el enlace del grupo.')
        }

        const enlace = `https://chat.whatsapp.com/${codigo}`

        await m.reply(
            `╭─「 🔗 ENLACE DEL GRUPO 」\n│\n` +
            `│ 📌 ${metadata.subject || 'Grupo'}\n` +
            `│\n│ ${enlace}\n│\n` +
            `╰────────────`
        )
    } catch {
        return m.reply('> ❌ No pude generar el enlace de invitación.')
    }
}

handler.command = ['link', 'invite']
handler.help = ['link']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
