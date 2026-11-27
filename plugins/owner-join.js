
const handler = {}

const solicitudesPendientes = new Map()
const salidasProgramadas = new Map()
const eventosRegistrados = new WeakSet()

const MES = 30 * 24 * 60 * 60 * 1000
const MAX_TIMEOUT = 2147483647

async function react(sock, m, emoji) {
    try {
        await sock.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        })
    } catch {}
}

function obtenerTexto(m, args = []) {
    return (
        m.text ||
        m.body ||
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        args.join(' ') ||
        ''
    ).trim()
}

function extraerCodigo(texto) {
    const match = texto.match(
        /(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/([0-9A-Za-z]{20,})/i
    )
    return match?.[1] || null
}

function parseDuration(value) {
    if (!value) return null

    const match = value.match(/^(\d+)(s|m|mes)$/i)
    if (!match) return undefined

    const amount = Number(match[1])
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        return undefined
    }

    const unit = match[2].toLowerCase()

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

function programarSalida(sock, groupId, duration, groupName, chat) {
    const anterior = salidasProgramadas.get(groupId)

    if (anterior?.timeout) clearTimeout(anterior.timeout)

    const deadline = Date.now() + duration

    const task = {
        deadline,
        timeout: null
    }

    salidasProgramadas.set(groupId, task)

    const comprobar = async () => {
        if (salidasProgramadas.get(groupId) !== task) return

        const restante = deadline - Date.now()

        if (restante > 0) {
            task.timeout = setTimeout(
                comprobar,
                Math.min(restante, MAX_TIMEOUT)
            )
            return
        }

        try {
            await sock.groupLeave(groupId)

            await aviso(
                sock,
                chat,
                '> 👋 *PEPE BOT SALIÓ DEL GRUPO*\n\n' +
                `> 👥 *Grupo:* ${groupName}\n` +
                '> ⏰ El tiempo de permanencia terminó.'
            )
        } catch (error) {
            console.error('[JOIN] Error al salir:', error)

            await aviso(
                sock,
                chat,
                '> ❌ No pude salir automáticamente de:\n' +
                `> *${groupName}*`
            )
        } finally {
            if (salidasProgramadas.get(groupId) === task) {
                salidasProgramadas.delete(groupId)
            }
        }
    }

    task.timeout = setTimeout(
        comprobar,
        Math.min(duration, MAX_TIMEOUT)
    )
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
        '> 🐸 Un administrador aprobó la solicitud y ya estoy dentro.\n' +
        (
            pending.duration
                ? `> ⏰ Permanencia: ${formatDuration(pending.duration)}`
                : '> ♾️ Permanencia: Permanente'
        )
    )

    await bienvenida(sock, groupId)

    if (pending.duration) {
        programarSalida(
            sock,
            groupId,
            pending.duration,
            pending.groupName,
            pending.chat
        )
    }
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

    const input = obtenerTexto(m, args)
    const inviteCode = extraerCodigo(input)

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
            '> ♾️ Si no indicas tiempo, la entrada será permanente.'
        )
    }

    // Extraer únicamente el texto que aparece después del enlace.
    const textoTiempo = input
        .replace(
            /(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/[0-9A-Za-z]{20,}/i,
            ''
        )
        .trim()

    // Sin tiempo = permanente.
    const duration = textoTiempo
        ? parseDuration(textoTiempo)
        : null

    if (duration === undefined) {
        await react(sock, m, '⚠️')

        return m.reply(
            '> ⚠️ *TIEMPO NO VÁLIDO*\n\n' +
            '> Utiliza `2s`, `5m` o `3mes`.\n' +
            '> Si no colocas tiempo, PEPE BOT ingresará permanentemente.'
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

        // Guardar antes de solicitar la entrada.
        solicitudesPendientes.set(groupId, {
            chat,
            groupName,
            duration,
            procesado: false
        })

        try {
            const result = await sock.groupAcceptInvite(inviteCode)

            if (!result) {
                throw new Error('WhatsApp no confirmó la entrada.')
            }

            await procesarEntrada(sock, result)

            await react(sock, m, '✅')

            await aviso(
                sock,
                chat,
                '> ✅ *PEPE BOT SE UNIÓ CORRECTAMENTE*\n\n' +
                `> 👥 *Grupo:* ${groupName}\n` +
                `> 🆔 *ID:* ${result}\n` +
                (
                    duration
                        ? `> ⏰ *Permanencia:* ${formatDuration(duration)}`
                        : '> ♾️ *Permanencia:* Permanente'
                )
            )

        } catch (error) {
            const status =
                error?.output?.statusCode ||
                error?.data

            if ([401, 403, 404].includes(status)) {
                solicitudesPendientes.delete(groupId)
                throw error
            }

            // Se conserva la solicitud para detectar la aprobación.
            await react(sock, m, '⏳')

            await aviso(
                sock,
                chat,
                '> ⏳ *SOLICITUD DE ENTRADA PENDIENTE*\n\n' +
                `> 👥 *Grupo:* ${groupName}\n\n` +
                '> Este grupo requiere que un administrador apruebe la solicitud.\n' +
                '> 🐸 PEPE BOT está esperando la aprobación.\n\n' +
                '> Cuando un administrador me acepte, detectaré mi entrada y enviaré el aviso automáticamente.\n\n' +
                (
                    duration
                        ? `> ⏰ *Permanencia:* ${formatDuration(duration)} desde que entre.`
                        : '> ♾️ *Permanencia:* Permanente.'
                )
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
