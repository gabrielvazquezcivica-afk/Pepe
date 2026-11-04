
import config from '../config.js'

const handler = {}

const limpiarNumero = jid =>
    String(jid || '').replace(/\D/g, '')

const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@').trim()

const esAdmin = participante =>
    ['admin', 'superadmin'].includes(participante?.admin)

const buscar = (participantes, identificadores = []) => {
    const ids = identificadores
        .filter(Boolean)
        .map(normalizar)

    return participantes.find(p => {
        const idsParticipante = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizar)

        return idsParticipante.some(id => ids.includes(id))
    })
}

handler.run = async (sock, m) => {
    const chat = m.key.remoteJid

    const aviso = text =>
        sock.sendMessage(chat, {
            text
        }, { quoted: m })

    const reaccion = async emoji => {
        try {
            await sock.sendMessage(chat, {
                react: { text: emoji, key: m.key }
            })
        } catch {}
    }

    // Validar owner.
    const owners = (config.owner || [])
        .filter(Boolean)
        .map(limpiarNumero)

    const ownerLids = (config.ownerLid || [])
        .filter(Boolean)
        .map(normalizar)

    const idsEjecutor = [
        m.key?.participant,
        m.key?.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ]

    const numeroEjecutor = limpiarNumero(
        m.senderNumber || m.sender
    )

    const esOwner =
        m.isOwner ||
        owners.includes(numeroEjecutor) ||
        idsEjecutor.some(id => ownerLids.includes(normalizar(id)))

    if (!esOwner) {
        await reaccion('🚫')
        return aviso('> 🚫 Este comando solo puede usarlo el owner.')
    }

    // Validar grupo.
    if (!chat?.endsWith('@g.us')) {
        await reaccion('❌')
        return aviso('> 🐸 Este comando solo funciona en grupos.')
    }

    // Obtener participantes.
    let metadata

    try {
        metadata = await sock.groupMetadata(chat)
    } catch (error) {
        console.error('[AUTOADMIN] Error obteniendo metadata:', error)
        await reaccion('❌')
        return aviso('> ❌ No pude obtener los datos del grupo.')
    }

    const participantes = metadata.participants || []

    // Identificar al bot con el mismo método de KICK.
    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const idsBot = [
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ]

    const botInfo = buscar(participantes, idsBot)

    console.log('[AUTOADMIN] IDs del bot:', idsBot)
    console.log('[AUTOADMIN] Bot encontrado:', botInfo)

    if (!esAdmin(botInfo)) {
        await reaccion('⚠️')
        return aviso('> ⚠️ Pepe Bot no aparece como administrador en los participantes del grupo.')
    }

    // Identificar al owner que ejecutó el comando.
    const ownerInfo = buscar(participantes, idsEjecutor)

    if (!ownerInfo) {
        await reaccion('❌')
        return aviso('> ❌ No pude identificarte entre los participantes del grupo.')
    }

    if (esAdmin(ownerInfo)) {
        await reaccion('ℹ️')
        return aviso('> ⚠️ Ya tienes administrador en este grupo.')
    }

    // Dar administrador.
    try {
        await sock.groupParticipantsUpdate(
            chat,
            [ownerInfo.id],
            'promote'
        )

        await reaccion('✅')

        return sock.sendMessage(chat, {
            text:
                `> 🐸 *PEPE BOT — AUTOADMIN*\n\n` +
                `> 👑 @${limpiarNumero(ownerInfo.id)} ahora es administrador del grupo.\n\n` +
                `> ✅ Permisos otorgados correctamente.`,
            mentions: [ownerInfo.id]
        }, { quoted: m })

    } catch (error) {
        console.error('[AUTOADMIN] Error promocionando owner:', error)

        await reaccion('❌')

        return aviso(
            '> ❌ No se pudo otorgar administrador. Comprueba los permisos del bot.'
        )
    }
}

handler.command = ['autoadmin']
handler.help = ['autoadmin']
handler.tags = ['owner']
handler.menu = true

export default handler
