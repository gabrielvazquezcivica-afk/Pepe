const handler = {}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const sender = m.sender || m.key?.participant || m.key?.remoteJid
    const config = (await import('../config.js')).default

    const normalizar = (jid = '') =>
        String(jid).split(':')[0].split('@')[0]

    const reaccion = async (emoji) => {
        try {
            await sock.sendMessage(chat, {
                react: { text: emoji, key: m.key }
            })
        } catch {}
    }

    const aviso = async (texto, mentions = []) =>
        sock.sendMessage(chat, { text: texto, mentions }, { quoted: m })

    const editar = async (mensaje, texto, mentions = []) => {
        try {
            await sock.sendMessage(chat, {
                text: texto,
                edit: mensaje.key,
                mentions
            })
        } catch {
            // Si WhatsApp no admite la edición, no se envía otro mensaje.
        }
    }

    const obtenerContexto = () => {
        const msg = m.message || {}
        const contenido =
            msg.extendedTextMessage ||
            msg.imageMessage ||
            msg.videoMessage ||
            msg.documentMessage ||
            {}

        return contenido.contextInfo || {}
    }

    try {
        if (!m.isGroup) {
            await reaccion('❌')
            return aviso('> 🐸 Este comando solo funciona en grupos.')
        }

        await reaccion('🛡️')

        const metadata = await sock.groupMetadata(chat)
        const participantes = metadata.participants || []

        const buscarParticipante = jid =>
            participantes.find(p =>
                normalizar(p.id) === normalizar(jid) ||
                (p.lid && normalizar(p.lid) === normalizar(jid))
            )

        const esAdmin = p =>
            p?.admin === 'admin' || p?.admin === 'superadmin'

        const adminEjecutor = buscarParticipante(sender)

        if (!esAdmin(adminEjecutor)) {
            await reaccion('❌')
            return aviso('> ❌ Solo los administradores pueden usar .kick.')
        }

        const bot = buscarParticipante(sock.user?.id)

        if (!esAdmin(bot)) {
            await reaccion('❌')
            return aviso('> ⚠️ Necesito ser administrador para expulsar usuarios.')
        }

        // Obtener menciones y la persona a la que se respondió.
        const contexto = obtenerContexto()
        const objetivos = [
            ...(contexto.mentionedJid || [])
        ]

        if (contexto.participant) {
            objetivos.push(contexto.participant)
        }

        // También acepta números escritos como argumentos.
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
                '> ⚠️ Debes mencionar a uno o varios usuarios, o responder al mensaje de alguien.\n\n' +
                '> 📝 *Ejemplo:*\n' +
                '> .kick @usuario\n' +
                '> .kick @usuario1 @usuario2\n\n' +
                '> ⏳ Este aviso se actualizará en 15 segundos.'
            )

            await new Promise(resolve => setTimeout(resolve, 15000))

            await editar(
                mensaje,
                '> 🐸 *PEPE BOT — KICK*\n\n' +
                '> 💡 *Cómo usar el comando:*\n' +
                '> • .kick @usuario\n' +
                '> • .kick @usuario1 @usuario2\n' +
                '> • Responde al mensaje de una persona con .kick\n\n' +
                '> 🛡️ Solo administradores pueden utilizarlo.'
            )

            return
        }

        const expulsados = []
        const protegidos = []
        const fallidos = []

        const owners = (config.owner || [])
            .filter(Boolean)
            .map(normalizar)

        const ownerLids = (config.ownerLid || [])
            .filter(Boolean)
            .map(normalizar)

        const esOwnerBot = jid =>
            owners.includes(normalizar(jid)) ||
            ownerLids.includes(normalizar(jid))

        // El creador del grupo puede aparecer como metadata.owner.
        const creadorGrupo = metadata.owner
        const creadorParticipante = creadorGrupo
            ? buscarParticipante(creadorGrupo)
            : participantes.find(p => p.admin === 'superadmin')

        for (const jid of unicos) {
            const participante = buscarParticipante(jid)

            if (!participante) {
                fallidos.push(jid)
                continue
            }

            const idReal = participante.id

            // Protección del dueño del bot.
            if (
                esOwnerBot(idReal) ||
                (participante.lid && esOwnerBot(participante.lid))
            ) {
                protegidos.push(idReal)
                continue
            }

            // Protección del creador del grupo.
            if (
                creadorGrupo &&
                (
                    normalizar(idReal) === normalizar(creadorGrupo) ||
                    normalizar(participante.lid) === normalizar(creadorGrupo)
                )
            ) {
                protegidos.push(idReal)
                continue
            }

            // Protección adicional si el creador está identificado
            // como participante superadmin.
            if (
                creadorParticipante &&
                normalizar(creadorParticipante.id) === normalizar(idReal)
            ) {
                protegidos.push(idReal)
                continue
            }

            // Se permite expulsar administradores, salvo los protegidos.
            try {
                await sock.groupParticipantsUpdate(
                    chat,
                    [idReal],
                    'remove'
                )
                expulsados.push(idReal)
            } catch (error) {
                console.error('Error expulsando:', idReal, error)
                fallidos.push(idReal)
            }
        }

        const lista = (titulo, usuarios) =>
            usuarios.length
                ? `${titulo}\n${usuarios.map(jid => `> 👤 @${normalizar(jid)}`).join('\n')}\n`
                : ''

        const texto =
            '> 🐸 *PEPE BOT — EXPULSIONES*\n\n' +
            lista('> ✅ *Expulsados:*', expulsados) +
            lista('> 🛡️ *Protegidos:*', protegidos) +
            lista('> ❌ *No se pudieron expulsar:*', fallidos) +
            `\n> 👮 *Acción realizada por:* @${normalizar(sender)}`

        await reaccion(expulsados.length ? '✅' : '⚠️')

        await aviso(
            texto,
            [...new Set([...expulsados, ...protegidos, ...fallidos, sender])]
        )
    } catch (error) {
        console.error('Error en .kick:', error)
        await reaccion('❌')
        await aviso('> ❌ Ocurrió un error al ejecutar el comando.')
    }
}

handler.command = ['kick', 'echar', 'expulsar']
handler.help = ['kick @usuario']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler