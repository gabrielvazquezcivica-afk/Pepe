const handler = {}

handler.run = async (sock, m, args) => {
    const chat = m.chat

    if (!m.isGroup) {
        return m.reply('> Este comando solo funciona en grupos.')
    }

    const metadata = await sock.groupMetadata(chat)
    const participantes = metadata.participants || []

    const normalizar = jid =>
        String(jid || '').replace(/:\d+@/, '@').trim()

    const buscar = (ids) => {
        const identificadores = ids.filter(Boolean).map(normalizar)

        return participantes.find(p => {
            const idsParticipante = [p.id, p.jid, p.lid]
                .filter(Boolean)
                .map(normalizar)

            return idsParticipante.some(id => identificadores.includes(id))
        })
    }

    const idsUsuario = [
        m.key?.participant,
        m.key?.participantAlt,
        m.sender,
        m.senderLid
    ]

    const usuario = buscar(idsUsuario)

    if (!['admin', 'superadmin'].includes(usuario?.admin)) {
        return m.reply('> Solo los administradores pueden usar este comando.')
    }

    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const bot = buscar([
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ])

    if (!['admin', 'superadmin'].includes(bot?.admin)) {
        return m.reply('> Necesito ser administrador para realizar esta acción.')
    }

    const comando = m.command

    try {
        if (['cerrar', 'close'].includes(comando)) {
            await sock.groupSettingUpdate(chat, 'announcement')
            return m.reply('> 🔒 Grupo cerrado. Solo los administradores pueden enviar mensajes.')
        }

        if (['abrir', 'open'].includes(comando)) {
            await sock.groupSettingUpdate(chat, 'not_announcement')
            return m.reply('> 🔓 Grupo abierto. Todos pueden enviar mensajes.')
        }
    } catch {
        return m.reply('> No pude cambiar la configuración del grupo.')
    }
}

handler.command = ['cerrar', 'abrir', 'close', 'open']
handler.help = ['cerrar', 'abrir']
handler.tags = ['grupo']
handler.menu = true

export default handler