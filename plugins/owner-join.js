
const handler = {}

const solicitudesPendientes = new Map()
const salidasProgramadas = new Map()
const eventosRegistrados = new WeakSet()

const MES = 30 * 24 * 60 * 60 * 1000
const MAX_TIMEOUT = 2147483647

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
        /(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/([0-9A-Za-z]{20,})/i
    )

    return match?.[1] || null
}

function parseDuration(value) {
    if (!value) return null

    const match = value.match(/^(\d+)(s|m|mes)$/i)
    if (!match) return undefined

    const amount = Number(match[1])
    const unit = match[2].toLowerCase()

    if (!Number.isSafeInteger(amount) || amount <= 0) {
        return undefined
    }

    if (unit === 's') return amount * 1000
    if (unit === 'm') return amount * 60 * 1000
    if (unit === 'mes') return amount * MES

    return undefined
}

function formatDuration(ms) {
    if (ms % MES === 0) return `${ms / MES} mes(es)`
    if (ms % 60000 === 0) return `${ms / 60000} minuto(s)`
    if (ms % 1000 === 0) return `${ms / 1000} segundo(s)`

    return `${Math.ceil(ms / 1000)} segundos`
}

function normalizeJid(jid = '') {
    return jid.split(':')[0].replace(/@s.whatsapp.net|@lid/g, '')
}

async function enviarAviso(sock, chat, text) {
    try {
        await sock.sendMessage(chat, { text })
    } catch (error) {
        console.error('[JOIN] Error enviando aviso:', error)
    }
}

async function darBienvenida(sock, groupId, groupName) {
    try {
        const metadata = await sock.groupMetadata(groupId)
        const participants = metadata.participants || []
        const mentions = participants.map(p => p.id).filter(Boolean)

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

// Programa la salida automática, incluso para tiempos mayores
// al límite de setTimeout de Node.js.
function programarSalida(sock, groupId, duration, groupName, chat) {
    const previous = salidasProgramadas.get(groupId)

    if (previous?.timeout) clearTimeout(previous.timeout)

    const deadline = Date.now() + duration

    const task = {
        deadline,
        timeout: null
    }

    salidasProgramadas.set(groupId, task)

    const check = async () => {
        if (salidasProgramadas.get(groupId) !== task) return

        const remaining = deadline - Date.now()

        if (remaining > 0) {
            task.timeout = setTimeout(
                check,
                Math.min(remaining, MAX_TIMEOUT)
            )
            return
        }

        try {
            await sock.groupLeave(groupId)

            await enviarAviso(
                sock,
                chat,
                '> 👋 *PEPE BOT SALIÓ DEL GRUPO*\n\n' +
                `> 👥 *Grupo:* ${groupName}\n` +
                '> ⏰ El tiempo de permanencia terminó.\n' +
                '> 🐸 ¡Gracias por recibirnos!'
            )
        } catch (error) {
            console.error('[JOIN] Error al salir:', error)

            await enviarAviso(
                sock,
                chat,
                '> ❌ No pude salir automáticamente de:\n' +
                `> *${groupName}*\n\n` +
                '> Puede que haya ocurrido un error de conexión.'
            )
        } finally {
            if (salidasProgramadas.get(groupId) === task) {
                salidasProgramadas.delete(groupId)
            }
        }
    }

    task.timeout = setTimeout(
        check,
        Math.min(duration, MAX_TIMEOUT)
    )
}

// Se ejecuta cuando WhatsApp confirma que el bot ya está dentro.
async function procesarEntrada(sock, groupId) {
    const pending = solicitudesPendientes.get(groupId)
    if (!pending || pending.procesado) return

    pending.procesado = true
    solicitudesPendientes.delete(groupId)

    await enviarAviso(
        sock,
        pending.chat,
        '> ✅ *¡PEPE BOT FUE ACEPTADO!*\n\n' +
        `> 👥 *Grupo:* ${pending.groupName}\n` +
        '> 🐸 Un administrador aprobó la solicitud y ya estoy dentro.'
    )

    await darBienvenida(sock, groupId, pending.groupName)

    if (pending.duration) {
        programarSalida(
            sock,
            groupId,
            pending.duration,
            pending.groupName,
            pending.chat
        )

        await enviarAviso(
            sock,
            pending.chat,
            '> ⏰ *SALIDA PROGRAMADA*\n\n' +
            `> PEPE BOT permanecerá ${formatDuration(pending.duration)} en el grupo.`
        )
    }
}

// Registra el evento una sola vez por conexión.
function registrarEventos(sock) {
    if (eventosRegistrados.has(sock)) return

    eventosRegistrados.add(sock)

    sock.ev.on('group-participants.update', async (update) => {
        try {
            if (update.action !== 'add') return

            const botId = normalizeJid(sock.user?.id)

            const botFueAgregado = (update.participants || []).some(
                participant => normalizeJid(participant) === botId
            )

            if (!botFueAgregado) return

            await procesarEntrada(sock, update.id)
        } catch (error) {
            console.error('[JOIN] Error detectando aprobación:', error)
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

    const input = args.join(' ').trim()
    const partes = input.split(/\s+/)

    const inviteCode = extractInviteCode(input)

    if (!inviteCode) {
        await react(sock, m, '⚠️')

        return m.reply(
            '> 🐸 *PEPE BOT — JOIN*\n\n' +
            '> Proporciona un enlace válido de invitación.\n\n' +
            '> *Ejemplos:*\n' +
            '> `.join https://chat.whatsapp.com/CODIGO`\n' +
            '> `.join https://chat.whatsapp.com/CODIGO 2s`\n' +
            '> `.join https://chat.whatsapp.com/CODIGO 5m`\n' +
            '> `.join https://chat.whatsapp.com/CODIGO 3mes`\n\n' +
            '> *Unidades:*\n' +
            '> `s` = segundos\n' +
            '> `m` = minutos\n' +
            '> `mes` = meses\n\n' +
            '> Si no indicas tiempo, permaneceré indefinidamente.'
        )
    }

    // El tiempo se toma del texto posterior al enlace.
    const textoTiempo = input
        .replace(/(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/[0-9A-Za-z]{20,}/i, '')
        .trim()

    const duration = textoTiempo
        ? parseDuration(textoTiempo)
        : null

    if (duration === undefined) {
        await react(sock, m, '⚠️')

        return m.reply(
            '> ⚠️ *TIEMPO NO VÁLIDO*\n\n' +
            '> Utiliza alguno de estos formatos:\n' +
            '> `2s` — 2 segundos\n' +
            '> `5m` — 5 minutos\n' +
            '> `3mes` — 3 meses'
        )
    }

    const chat = m.chat || m.key?.remoteJid

    await react(sock, m, '⏳')

    try {
        registrarEventos(sock)

        // Obtener información del grupo antes de intentar entrar.
        const invite = await sock.groupGetInviteInfo(inviteCode)

        const groupId = invite.id
        const groupName = invite.subject || 'Grupo sin nombre'

        if (!groupId) {
            throw new Error('No se pudo obtener el ID del grupo.')
        }

        // Guardar los datos antes de solicitar la entrada.
        // Así no se pierde la aprobación si llega inmediatamente.
        const pending = {
            chat,
            groupName,
            duration,
            procesado: false
        }

        solicitudesPendientes.set(groupId, pending)

        try {
            const result = await sock.groupAcceptInvite(inviteCode)

            if (!result) {
                throw new Error('WhatsApp no confirmó la entrada.')
            }

            // Si la entrada fue inmediata, procesarla.
            await procesarEntrada(sock, result)

            await react(sock, m, '✅')

        } catch (error) {
            // Si WhatsApp requiere aprobación, conservamos la solicitud.
            // La entrada se detectará mediante group-participants.update.
            const status = error?.output?.statusCode || error?.data

            if (
                status === 401 ||
                status === 403 ||
                status === 404
            ) {
                solicitudesPendientes.delete(groupId)
                throw error
            }

            await react(sock, m, '⏳')

            await enviarAviso(
                sock,
                chat,
                '> ⏳ *SOLICITUD DE ENTRADA PENDIENTE*\n\n' +
                `> 👥 *Grupo:* ${groupName}\n\n` +
                '> Este grupo requiere que un administrador apruebe la solicitud.\n' +
                '> 🐸 PEPE BOT está esperando la aprobación.\n\n' +
                '> 💚 Cuando un administrador me acepte, detectaré mi entrada y enviaré el aviso automáticamente.' +
                (duration
                    ? `\n\n> ⏰ *Permanencia:* ${formatDuration(duration)} desde que entre al grupo.`
                    : '')
            )

            return
        }

    } catch (error) {
        console.error('[JOIN]', error)

        await react(sock, m, '❌')

        let reason = 'No se pudo entrar al grupo.'

        const status = error?.output?.statusCode || error?.data

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
