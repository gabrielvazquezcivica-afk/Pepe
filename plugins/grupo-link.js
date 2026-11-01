
import { sendButtons } from 'baileys-buttons'

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

        let imagen = null

        try {
            const fotoUrl = await sock.profilePictureUrl(chat, 'image')
            const respuesta = await fetch(fotoUrl)

            if (respuesta.ok) {
                imagen = Buffer.from(await respuesta.arrayBuffer())
            }
        } catch {}

        const botones = [
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: 'Ver grupo',
                    url: enlace,
                    merchant_url: enlace
                })
            }
        ]

        await sendButtons(sock, chat, {
            title: metadata.subject || 'Grupo',
            text: `🔗 Enlace de invitación\n\n${enlace}`,
            footer: '🐸 PEPE BOT',
            image: imagen,
            buttons: botones,
            quoted: m
        })

    } catch {
        await m.reply('> ❌ No pude generar la tarjeta de invitación.')
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
