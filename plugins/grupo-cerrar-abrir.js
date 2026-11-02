
const handler = {}

const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@').trim()

const esAdmin = participante =>
    ['admin', 'superadmin'].includes(participante?.admin)

const buscar = (participantes, identificadores = []) => {
    const ids = identificadores.filter(Boolean).map(normalizar)

    return participantes.find(p => {
        const idsParticipante = [
            p.id,
            p.jid,
            p.lid
        ].filter(Boolean).map(normalizar)

        return idsParticipante.some(id => ids.includes(id))
    })
}

async function reaccionar(sock, m, emoji) {
    try {
        await sock.sendMessage(m.chat, {
            react: {
                text: emoji,
                key: m.key
            }
        })
    } catch {}
}

handler.run = async (sock, m) => {
    const chat = m.key.remoteJid
    const accion = String(m.command || '').toLowerCase()

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
        return m.reply('> 🚫 Solamente los administradores pueden usar este comando.')
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

    const cerrar = ['close'].includes(accion)
    const abrir = ['open'].includes(accion)

    if (!cerrar && !abrir) return

    await reaccionar(sock, m, '⏳')

    try {
        await sock.groupSettingUpdate(
            chat,
            cerrar ? 'announcement' : 'not_announcement'
        )

        await reaccionar(sock, m, '✅')

        const numeroAdmin = String(
            adminEjecutor.id || m.sender
        ).split('@')[0].split(':')[0]

        const texto = cerrar
            ? `> 🔒 Grupo cerrado correctamente.\n> 👑 Solo los administradores pueden enviar mensajes.\n> 🛡️ Acción realizada por @${numeroAdmin}.`
            : `> 🔓 Grupo abierto correctamente.\n> 💬 Todos pueden enviar mensajes.\n> 🛡️ Acción realizada por @${numeroAdmin}.`

        await sock.sendMessage(chat, {
            text: texto,
            mentions: [adminEjecutor.id || m.sender]
        }, { quoted: m })

    } catch {
        await reaccionar(sock, m, '❌')
        await m.reply('> ❌ No pude cambiar la configuración del grupo.')
    }
}

handler.command = ['close', 'open']
handler.help = ['close, 'open']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
