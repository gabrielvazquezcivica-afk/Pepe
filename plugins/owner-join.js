
const handler = {}

const solicitudesPendientes = new Map()
const eventosRegistrados = new WeakSet()

async function react(sock, m, emoji) {
    try {
        await sock.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        })
    } catch {}
}

function extractInviteCode(text) {
    const match = text.match(
        /(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/([0-9A-Za-z]{20,})/i
    )

    return match?.[1] || null
}

function normalizeJid(jid = '') {
    return jid.split(':')[0].replace(/@s\.whatsapp\.net|@lid/g, '')
}

async function aviso(sock, chat, text) {
    try {
        await sock.sendMessage(chat, { text })
    } catch (error) {
        console.error('[JOIN] Error enviando aviso:', error)
    }
}

async function bienvenida(sock, groupId) {
    try {
        const metadata = await sock.groupMetadata(groupId)

        const mentions = (metadata.participants || [])
            .map(p => p.id)
            .filter(Boolean)

        await sock.sendMessage(groupId, {
            text:
                '> 🐸 *¡HOLA A TODOS!*\n\n' +
                '> Soy *PEPE BOT* y me acabo de unir a este grupo.\n' +
                '> 🎉 ¡Gracias por recibirme!\n' +
                '> ⚡ Estoy listo para acompañarlos con mis comandos.\n\n' +
                '> 💚 ¡Espero que nos llevemos bien!',
            mentions
        })
    } catch (error) {
        console.error('[JOIN] Error enviando bienvenida:', error)
    }
}

async function procesarEntrada(sock, groupId) {
    const pending = solicitudesPendientes.get(groupId)

    if (!pending || pending.procesado) return

    pending.procesado = true
    solicitudesPendientes.delete(groupId)

    await aviso(
        sock,
        pending.chat,
        '> ✅ *¡PEPE BOT FUE ACEPTADO!*\n\n' +
        `> 👥 *Grupo:* ${pending.groupName}\n` +
        '> 🐸 Un administrador aprobó la solicitud.\n' +
        '> 💚 PEPE BOT ya se encuentra dentro del grupo.'
    )

    await bienvenida(sock, groupId)
}

function registrarEventos(sock) {
    if (eventosRegistrados.has(sock)) return

    eventosRegistrados.add(sock)

    sock.ev.on('group-participants.update', async update => {
        try {
            if (update.action !== 'add') return

            const botId = normalizeJid(sock.user?.id)

            const agregado = (update.participants || []).some(
                participant => normalizeJid(participant) === botId
            )

            if (!agregado) return

            await procesarEntrada(sock, update.id)
        } catch (error) {
            console.error('[JOIN] Error detectando entrada:', error)
        }
    })
}

handler.run = async (sock, m, args = []) => {
    if (!m.isOwner) {
        await react(sock, m, '❌')

        return m.reply(
            '> 🚫 *ACCESO DENEGADO*\n\n' +
            '> Solo los owners pueden utilizar este comando.'
        )
    }

    const input = (
        m.text ||
        m.body ||
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        args.join(' ') ||
        ''
    ).trim()

    const inviteCode = extractInviteCode(input)

    if (!inviteCode) {
        await react(sock, m, '⚠️')

        return m.reply(
            '> 🐸 *PEPE BOT — JOIN*\n\n' +
            '> Proporciona un enlace válido de invitación de WhatsApp.\n\n' +
            '> *Ejemplo:*\n' +
            '> `.join https://chat.whatsapp.com/CODIGO_DEL_GRUPO`'
        )
    }

    const chat = m.chat || m.key?.remoteJid

    await react(sock, m, '⏳')

    try {
        registrarEventos(sock)

        const invite = await sock.groupGetInviteInfo(inviteCode)

        const groupId = invite.id
        const groupName = invite.subject || 'Grupo sin nombre'

        if (!groupId) {
            throw new Error('No se pudo obtener el ID del grupo.')
        }

        solicitudesPendientes.set(groupId, {
            chat,
            groupName,
            procesado: false
        })

        try {
            const result = await sock.groupAcceptInvite(inviteCode)

            if (!result) {
                throw new Error('No se pudo confirmar la entrada.')
            }

            await procesarEntrada(sock, result)

            await react(sock, m, '✅')

            await aviso(
                sock,
                chat,
                '> ✅ *PEPE BOT SE UNIÓ CORRECTAMENTE*\n\n' +
                `> 👥 *Grupo:* ${groupName}\n` +
                `> 🆔 *ID:* ${result}\n\n` +
                '> ♾️ *Permanencia:* Permanente\n' +
                '> 🐸 ¡Gracias por invitarme!'
            )

        } catch (error) {
            const status =
                error?.output?.statusCode ||
                error?.data

            if ([401, 403, 404].includes(status)) {
                solicitudesPendientes.delete(groupId)
                throw error
            }

            await react(sock, m, '⏳')

            await aviso(
                sock,
                chat,
                '> ⏳ *SOLICITUD DE ENTRADA PENDIENTE*\n\n' +
                `> 👥 *Grupo:* ${groupName}\n\n` +
                '> Este grupo requiere que un administrador apruebe la solicitud.\n' +
                '> 🐸 PEPE BOT está esperando la aprobación.\n\n' +
                '> Cuando un administrador me acepte, detectaré mi entrada y enviaré el aviso automáticamente.\n\n' +
                '> ♾️ *Permanencia:* Permanente.'
            )

            return
        }

    } catch (error) {
        console.error('[JOIN]', error)

        await react(sock, m, '❌')

        let reason = 'No se pudo entrar al grupo.'

        const status =
            error?.output?.statusCode ||
            error?.data

        if (status === 401 || status === 404) {
            reason = 'El enlace puede ser inválido, haber caducado o haber sido revocado.'
        } else if (status === 403) {
            reason = 'WhatsApp rechazó la solicitud de entrada.'
        }

        return m.reply(
            '> ❌ *ERROR AL UNIRME AL GRUPO*\n\n' +
            `> ${reason}\n\n` +
            '> Verifica el enlace e inténtalo de nuevo.'
        )
    }
}

handler.command = ['join']
handler.help = ['join']
handler.tags = ['owner']
handler.menu = true

export default handler
