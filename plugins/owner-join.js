const handler = {}

async function react(sock, m, emoji) {
    try {
        await sock.sendMessage(m.chat, {
            react: {
                text: emoji,
                key: m.key
            }
        })
    } catch {}
}

function extractInviteCode(text) {
    const match = text.match(
        /(?:https?:\/\/)?(?:www\.)?(?:chat\.whatsapp\.com)\/([0-9A-Za-z]{20,})/i
    )

    return match?.[1] || null
}

handler.run = async (sock, m, args = []) => {
    if (!m.isOwner) {
        await react(sock, m, '❌')
        return m.reply(
            '> 🚫 *Acceso denegado*\n\n' +
            '> Solo los owners pueden utilizar este comando.'
        )
    }

    const input = args.join(' ').trim()
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

    await react(sock, m, '⏳')

    try {
        // Comprobar el enlace antes de intentar entrar.
        const invite = await sock.groupGetInviteInfo(inviteCode)
        const groupName = invite.subject || 'Grupo sin nombre'

        // Entrar al grupo usando el código de invitación.
        const result = await sock.groupAcceptInvite(inviteCode)

        if (!result) {
            await react(sock, m, '❌')
            return m.reply(
                '> ❌ No se pudo confirmar la entrada al grupo.'
            )
        }

        await react(sock, m, '✅')

        // Avisar en el chat donde se ejecutó el comando.
        await sock.sendMessage(m.chat, {
            text:
                '> ✅ *PEPE BOT SE UNIÓ CORRECTAMENTE*\n\n' +
                `> 👥 *Grupo:* ${groupName}\n` +
                `> 🆔 *ID:* ${result}\n\n` +
                '> 🐸 El bot entró correctamente al grupo.'
        }, { quoted: m })

        // Esperar brevemente para permitir que WhatsApp actualice
        // el estado de la participación del bot.
        await new Promise(resolve => setTimeout(resolve, 1500))

        try {
            const metadata = await sock.groupMetadata(result)
            const participants = metadata.participants || []
            const mentions = participants.map(p => p.id).filter(Boolean)

            const greeting =
                '> 🐸 *¡HOLA A TODOS!*\n\n' +
                '> Soy *PEPE BOT* y me acabo de unir a este grupo.\n' +
                '> 🎉 ¡Gracias por recibirme!\n' +
                '> ⚡ Estoy listo para acompañarlos con mis comandos.\n\n' +
                '> 💚 ¡Espero que nos llevemos bien!'

            await sock.sendMessage(result, {
                text: greeting,
                mentions
            })
        } catch (greetingError) {
            console.error(
                '[JOIN] No se pudo enviar el saludo:',
                greetingError
            )
        }
    } catch (error) {
        console.error('[JOIN]', error)

        await react(sock, m, '❌')

        let reason = 'No se pudo entrar al grupo.'

        if (
            error?.data === 401 ||
            error?.output?.statusCode === 401
        ) {
            reason = 'El enlace puede ser inválido, haber caducado o haber sido revocado.'
        } else if (
            error?.output?.statusCode === 403 ||
            error?.data === 403
        ) {
            reason = 'WhatsApp rechazó la solicitud de entrada al grupo.'
        }

        return m.reply(
            '> ❌ *Error al unirme al grupo*\n\n' +
            `> ${reason}\n` +
            '> Verifica el enlace e inténtalo de nuevo.'
        )
    }
}

handler.command = ['join']
handler.help = ['join']
handler.tags = ['owner']
handler.menu = true

export default handler