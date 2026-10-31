
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

handler.run = async (sock, m, args = []) => {
    const chat = m.key.remoteJid

    const reaccion = async emoji => {
        try {
            await sock.sendMessage(chat, {
                react: { text: emoji, key: m.key }
            })
        } catch {}
    }

    const aviso = (text, mentions = []) =>
        sock.sendMessage(
            chat,
            { text, mentions },
            { quoted: m }
        )

    // Comprobar que sea un grupo.
    if (!chat?.endsWith('@g.us')) {
        await reaccion('❌')
        return aviso('> 🐸 Este comando solo funciona en grupos.')
    }

    // Obtener participantes.
    let metadata

    try {
        metadata = await sock.groupMetadata(chat)
    } catch (error) {
        console.error('[KICK] Error obteniendo metadata:', error)
        await reaccion('❌')
        return aviso('> ❌ No pude obtener los datos del grupo.')
    }

    const participantes = metadata.participants || []

    // Identificar al administrador que ejecuta el comando.
    const idsEjecutor = [
        m.key?.participant,
        m.key?.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ]

    const adminEjecutor = buscar(participantes, idsEjecutor)

    console.log('[KICK] IDs del ejecutor:', idsEjecutor)
    console.log('[KICK] Administrador encontrado:', adminEjecutor)

    if (!esAdmin(adminEjecutor)) {
        await reaccion('🚫')
        return aviso('> 🚫 Solo los administradores pueden usar .kick.')
    }

    // Identificar al bot.
    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const idsBot = [
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ]

    const botInfo = buscar(participantes, idsBot)

    console.log('[KICK] IDs del bot:', idsBot)
    console.log('[KICK] Bot encontrado:', botInfo)

    if (!esAdmin(botInfo)) {
        await reaccion('⚠️')
        return aviso('> ⚠️ No pude confirmar que PEPE BOT sea administrador.')
    }

    // Obtener menciones y usuario citado.
    const contexto =
        m.message?.extendedTextMessage?.contextInfo ||
        m.message?.imageMessage?.contextInfo ||
        m.message?.videoMessage?.contextInfo ||
        m.message?.documentMessage?.contextInfo ||
        {}

    const objetivos = [
        ...(contexto.mentionedJid || [])
    ]

    if (contexto.participant) {
        objetivos.push(contexto.participant)
    }

    // Admitir números escritos como argumentos.
    if (!objetivos.length) {
        for (const arg of args) {
            const numero = limpiarNumero(arg)

            if (numero.length >= 7) {
                objetivos.push(`${numero}@s.whatsapp.net`)
            }
        }
    }

    const unicos = [
        ...new Set(objetivos.filter(Boolean))
    ]

    // Aviso inicial y edición después de 5 segundos.
    if (!unicos.length) {
        await reaccion('❌')

        const mensaje = await aviso(
            '> 🐸 *PEPE BOT — KICK*\n\n' +
            '> ⚠️ Menciona a uno o varios usuarios, o responde a su mensaje.'
        )

        await new Promise(resolve => setTimeout(resolve, 5000))

        try {
            await sock.sendMessage(chat, {
                text:
                    '> 🐸 *PEPE BOT — AYUDA KICK*\n\n' +
                    '> Usa .kick mencionando a los usuarios que quieres expulsar.\n' +
                    '> También puedes responder a un mensaje escribiendo .kick.',
                edit: mensaje.key
            })
        } catch (error) {
            console.error('[KICK] No se pudo editar el aviso:', error)
        }

        return
    }

    // Proteger al dueño del grupo y al propietario del bot.
    const ownerGrupo =
        metadata.owner ||
        participantes.find(p => p.admin === 'superadmin')?.id

    const owners = (config.owner || [])
        .filter(Boolean)
        .map(limpiarNumero)

    const ownerLids = (config.ownerLid || [])
        .filter(Boolean)
        .map(normalizar)

    const esOwnerBot = participante =>
        [participante?.id, participante?.jid, participante?.lid]
            .filter(Boolean)
            .some(id =>
                owners.includes(limpiarNumero(id)) ||
                ownerLids.includes(normalizar(id))
            )

    const esDuenoGrupo = participante => {
        if (!ownerGrupo) return false

        const ids = [
            participante?.id,
            participante?.jid,
            participante?.lid
        ].filter(Boolean).map(normalizar)

        return ids.includes(normalizar(ownerGrupo))
    }

    const expulsados = []
    const protegidos = []
    const fallidos = []

    await reaccion('🛡️')

    // Procesar objetivos.
    for (const jid of unicos) {
        const participante = buscar(participantes, [jid])

        if (!participante) {
            fallidos.push(jid)
            continue
        }

        if (esOwnerBot(participante) || esDuenoGrupo(participante)) {
            protegidos.push(participante.id)
            continue
        }

        // Se permiten expulsar administradores normales.
        try {
            await sock.groupParticipantsUpdate(
                chat,
                [participante.id],
                'remove'
            )

            expulsados.push(participante.id)
        } catch (error) {
            console.error('[KICK] Error expulsando:', error)
            fallidos.push(participante.id)
        }
    }

    // Preparar el reporte.
    const lista = (titulo, usuarios) =>
        usuarios.length
            ? `${titulo}\n${usuarios.map(jid =>
                `> • @${limpiarNumero(jid)}`
            ).join('\n')}\n\n`
            : ''

    let texto = '> 🐸 *PEPE BOT — EXPULSIONES*\n\n'

    texto += lista('> ✅ *Expulsados:*', expulsados)
    texto += lista('> 👑 *Protegidos:*', protegidos)
    texto += lista('> ❌ *No se pudieron expulsar:*', fallidos)

    const ejecutorId =
        adminEjecutor.id ||
        m.sender ||
        m.key.participant

    texto += `> 👮 *Acción realizada por:* @${limpiarNumero(ejecutorId)}\n`
    texto += `> 🐸 ${config.BOT_NAME || 'PEPE BOT'}`

    await reaccion(expulsados.length ? '✅' : '⚠️')

    await aviso(
        texto,
        [...new Set([
            ...expulsados,
            ...protegidos,
            ...fallidos,
            ejecutorId
        ].filter(Boolean))]
    )
}

handler.command = ['kick', 'echar', 'expulsar']
handler.help = ['kick @usuario']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
