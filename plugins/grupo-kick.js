import config from '../config.js'

const handler = {}

function limpiarNumero(jid = '') {
    return String(jid).replace(/\D/g, '')
}

function normalizarJid(jid = '') {
    return String(jid).split(':')[0]
}

function esAdmin(participante) {
    return (
        participante?.admin === 'admin' ||
        participante?.admin === 'superadmin'
    )
}

handler.run = async (sock, m, args = []) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    const reaccion = async emoji => {
        try {
            await sock.sendMessage(from, {
                react: { text: emoji, key: m.key }
            })
        } catch {}
    }

    const aviso = (text, mentions = []) =>
        sock.sendMessage(
            from,
            { text, mentions },
            { quoted: m }
        )

    const editar = async (mensaje, text) => {
        try {
            await sock.sendMessage(from, {
                text,
                edit: mensaje.key
            })
        } catch (error) {
            console.log('No se pudo editar el aviso:', error.message)
        }
    }

    if (!from.endsWith('@g.us')) {
        await reaccion('❌')
        return aviso('> 🐸 Este comando solo funciona en grupos.')
    }

    let metadata

    try {
        metadata = await sock.groupMetadata(from)
    } catch (error) {
        console.log('Error obteniendo metadata:', error)
        await reaccion('❌')
        return aviso('> ❌ No pude leer los datos del grupo.')
    }

    const participantes = metadata.participants || []

    // Buscar por ID, JID o LID.
    const buscarParticipante = jid => {
        if (!jid) return undefined

        return participantes.find(p =>
            p.id === jid ||
            p.jid === jid ||
            p.lid === jid ||
            normalizarJid(p.id) === normalizarJid(jid) ||
            (p.jid && normalizarJid(p.jid) === normalizarJid(jid)) ||
            (p.lid && normalizarJid(p.lid) === normalizarJid(jid))
        )
    }

    // Comprobación del administrador que ejecuta el comando.
    // Se conserva el método del código que dijiste que sí funcionaba.
    const userInfo = participantes.find(
        p => p.id === sender || p.jid === sender
    )

    if (!esAdmin(userInfo)) {
        await reaccion('🚫')
        return aviso('> 🚫 Solo los administradores pueden usar .kick.')
    }

    // Reconocer al bot con su ID habitual de WhatsApp.
    const rawBotId = sock.user?.id || ''
    const botNumero = rawBotId.split(':')[0].split('@')[0]
    const botJid = `${botNumero}@s.whatsapp.net`

    let botInfo = participantes.find(
        p => p.id === botJid || p.jid === botJid
    )

    // Alternativa por LID o por la identidad devuelta por el socket.
    if (!botInfo) {
        botInfo = buscarParticipante(rawBotId)
    }

    if (!esAdmin(botInfo)) {
        console.log('DEBUG KICK botId:', botJid)
        console.log('DEBUG KICK botInfo:', JSON.stringify(botInfo || null))

        await reaccion('⚠️')
        return aviso(
            '> ⚠️ No pude verificar los permisos de administrador de PEPE BOT. Revisa la consola para ver el identificador detectado.'
        )
    }

    // Leer menciones y el participante citado.
    const contextInfo =
        m.message?.extendedTextMessage?.contextInfo ||
        m.message?.imageMessage?.contextInfo ||
        m.message?.videoMessage?.contextInfo ||
        m.message?.documentMessage?.contextInfo ||
        {}

    const objetivos = [
        ...(contextInfo.mentionedJid || [])
    ]

    if (contextInfo.participant) {
        objetivos.push(contextInfo.participant)
    }

    // Aceptar números escritos si no hay menciones ni respuesta.
    if (!objetivos.length) {
        for (const arg of args) {
            const numero = arg.replace(/\D/g, '')

            if (numero.length >= 7) {
                objetivos.push(`${numero}@s.whatsapp.net`)
            }
        }
    }

    const unicos = [...new Set(objetivos)]

    if (!unicos.length) {
        const mensaje = await aviso(
            '> 🐸 *PEPE BOT — KICK*\n\n' +
            '> ⚠️ Menciona a uno o varios usuarios, o responde al mensaje de alguien.\n\n' +
            '> 📝 *Ejemplos:*\n' +
            '> .kick @usuario\n' +
            '> .kick @usuario1 @usuario2\n' +
            '> También puedes responder a un mensaje escribiendo .kick\n\n' +
            '> ⏳ Este aviso se actualizará en 15 segundos.'
        )

        await new Promise(resolve => setTimeout(resolve, 15000))

        await editar(
            mensaje,
            '> 🐸 *PEPE BOT — AYUDA KICK*\n\n' +
            '> 📝 Usa .kick mencionando a los usuarios que quieres expulsar.\n' +
            '> También puedes responder al mensaje de una persona con .kick\n\n' +
            '> 🛡️ Solo administradores pueden usar este comando.'
        )

        return
    }

    // Protección del dueño del grupo.
    const ownerGrupo =
        metadata.owner ||
        participantes.find(p => p.admin === 'superadmin')?.id

    // Protección del propietario de PEPE BOT.
    const owners = (config.owner || [])
        .filter(Boolean)
        .map(limpiarNumero)

    const ownerLids = (config.ownerLid || [])
        .filter(Boolean)
        .map(String)

    const esPropietarioBot = participante => {
        const ids = [
            participante?.id,
            participante?.jid,
            participante?.lid
        ].filter(Boolean)

        return ids.some(id =>
            owners.includes(limpiarNumero(id)) ||
            ownerLids.includes(String(id))
        )
    }

    const expulsados = []
    const protegidos = []
    const fallidos = []

    await reaccion('🛡️')

    for (const jid of unicos) {
        const participante = buscarParticipante(jid)

        if (!participante) {
            fallidos.push(jid)
            continue
        }

        const ids = [
            participante.id,
            participante.jid,
            participante.lid
        ].filter(Boolean)

        const esDuenoGrupo = Boolean(ownerGrupo) && ids.some(
            id => normalizarJid(id) === normalizarJid(ownerGrupo)
        )

        if (esPropietarioBot(participante) || esDuenoGrupo) {
            protegidos.push(participante.id)
            continue
        }

        // Se permite expulsar administradores normales.
        try {
            await sock.groupParticipantsUpdate(
                from,
                [participante.id],
                'remove'
            )

            expulsados.push(participante.id)
        } catch (error) {
            console.log('ERROR KICK:', participante.id, error)
            fallidos.push(participante.id)
        }
    }

    const lista = (titulo, usuarios) => {
        if (!usuarios.length) return ''

        return `${titulo}\n` +
            usuarios.map(jid => `> • @${limpiarNumero(jid)}`).join('\n') +
            '\n\n'
    }

    let texto = '> 🐸 *PEPE BOT — EXPULSIONES*\n\n'

    texto += lista('> ✅ *Expulsados:*', expulsados)
    texto += lista('> 👑 *Protegidos:*', protegidos)
    texto += lista('> ❌ *No se pudieron expulsar:*', fallidos)
    texto += `> 👮 *Acción realizada por:* @${limpiarNumero(sender)}\n`
    texto += `> 🐸 ${config.BOT_NAME || 'PEPE BOT'}`

    await reaccion(expulsados.length ? '✅' : '⚠️')

    await aviso(
        texto,
        [...new Set([
            ...expulsados,
            ...protegidos,
            ...fallidos,
            sender
        ])]
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