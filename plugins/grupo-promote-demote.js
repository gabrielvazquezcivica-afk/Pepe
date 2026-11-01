
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

function obtenerObjetivo(m) {
    const msg = m.message || {}

    const contexto =
        msg.extendedTextMessage?.contextInfo ||
        msg.imageMessage?.contextInfo ||
        msg.videoMessage?.contextInfo ||
        msg.documentMessage?.contextInfo ||
        {}

    return (
        contexto.mentionedJid?.[0] ||
        contexto.participant ||
        m.mentionedJid?.[0] ||
        m.quoted?.sender ||
        null
    )
}

async function reaccionar(sock, m, emoji) {
    try {
        await sock.sendMessage(m.key.remoteJid, {
            react: {
                text: emoji,
                key: m.key
            }
        })
    } catch {}
}

handler.run = async (sock, m, args, context) => {
    const chat = m.key.remoteJid
    const accion = String(m.command || args?.[0] || '').toLowerCase()

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
    }

    const objetivo = obtenerObjetivo(m)

    if (!objetivo) {
        return m.reply('> ⚠️ Menciona a un usuario o responde a su mensaje.')
    }

    let metadata

    try {
        metadata = await sock.groupMetadata(chat)
    } catch {
        return m.reply('> ❌ No pude obtener la información del grupo.')
    }

    const participantes = metadata.participants || []

    const idsEjecutor = [
        m.key?.participant,
        m.key?.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ]

    const adminEjecutor = buscar(participantes, idsEjecutor)

    if (!esAdmin(adminEjecutor)) {
        return m.reply('> 🚫 Solamente los administradores pueden usar este comando.')
    }

    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const idsBot = [
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ]

    const botInfo = buscar(participantes, idsBot)

    if (!esAdmin(botInfo)) {
        return m.reply('> ⚠️ Pepe Bot necesita ser administrador del grupo.')
    }

    const participanteObjetivo = buscar(participantes, [objetivo])

    if (!participanteObjetivo) {
        return m.reply('> ❌ No pude encontrar al usuario en el grupo.')
    }

    const jidObjetivo = participanteObjetivo.id || objetivo

    if (accion === 'promote') {
        if (esAdmin(participanteObjetivo)) {
            return m.reply('> ⚠️ Ese usuario ya es administrador.')
        }
    } else if (accion === 'demote') {
        if (!esAdmin(participanteObjetivo)) {
            return m.reply('> ⚠️ Ese usuario no es administrador.')
        }
    } else {
        return
    }

    const jidAdmin =
        adminEjecutor.id ||
        m.key?.participant ||
        m.sender

    const numeroObjetivo = String(jidObjetivo).split('@')[0].split(':')[0]
    const numeroAdmin = String(jidAdmin).split('@')[0].split(':')[0]

    await reaccionar(sock, m, '⏳')

    try {
        await sock.groupParticipantsUpdate(
            chat,
            [jidObjetivo],
            accion
        )

        await reaccionar(sock, m, '✅')

        const promovido = accion === 'promote'

        const texto = promovido
            ? `> 👑 @${numeroObjetivo} ahora es administrador.\n> 🛡️ Acción realizada por @${numeroAdmin}.`
            : `> 🔻 @${numeroObjetivo} ya no es administrador.\n> 🛡️ Acción realizada por @${numeroAdmin}.`

        await sock.sendMessage(chat, {
            text: texto,
            mentions: [jidObjetivo, jidAdmin]
        }, { quoted: m })

    } catch {
        await reaccionar(sock, m, '❌')
        await m.reply('> ❌ No pude realizar el cambio de administrador.')
    }
}

handler.command = ['promote', 'demote']
handler.help = ['promote @usuario', 'demote @usuario']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
