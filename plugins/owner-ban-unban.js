import { addBan, removeBan } from '../lib/banlist.js'

const handler = {}

function getTarget(m) {
    const message =
        m.message?.ephemeralMessage?.message ||
        m.message?.viewOnceMessage?.message ||
        m.message

    const context =
        message?.extendedTextMessage?.contextInfo ||
        message?.imageMessage?.contextInfo ||
        message?.videoMessage?.contextInfo

    // Usuario mencionado
    const mentioned = context?.mentionedJid?.[0]
    if (mentioned) return mentioned

    // Usuario al que se respondió
    const quoted = context?.participant
    if (quoted) return quoted

    return null
}

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

function getMention(target) {
    return `@${target.split('@')[0].split(':')[0]}`
}

async function sendNotice(sock, m, target, text) {
    const number = target.split('@')[0].split(':')[0]

    return sock.sendMessage(
        m.chat,
        {
            text: text.replace('{user}', `@${number}`),
            mentions: [target]
        },
        { quoted: m }
    )
}

// ══════════════════════════════════════
// 🔨 BAN / UNBAN
// ══════════════════════════════════════

handler.run = async (sock, m, args = []) => {
    const command = String(m.command || '').toLowerCase()

    // Solo owners autorizados
    if (!m.isOwner) {
        await react(sock, m, '❌')

        return m.reply(
            '> 🚫 *Acceso denegado*\n\n' +
            '> Solo los owners pueden utilizar este comando.'
        )
    }

    const target = getTarget(m)

    if (!target) {
        await react(sock, m, '⚠️')

        return m.reply(
            '> 🐸 *PEPE BOT — BAN / UNBAN*\n\n' +
            '> Menciona o responde al usuario que deseas administrar.\n\n' +
            '`.ban — Banear usuario`\n' +
            '`.unban — Desbanear usuario`\n'
        )
    }

    const targetNumber = target.split('@')[0].split(':')[0]
    const botNumber = sock.user?.id?.split('@')[0]?.split(':')[0]

    if (botNumber && targetNumber === botNumber) {
        await react(sock, m, '❌')

        return m.reply(
            '> ❌ No puedes banear ni desbanear al propio bot.'
        )
    }

    try {
        if (command === 'unban') {
            const removed = removeBan(target)

            if (!removed) {
                await react(sock, m, '⚠️')

                return sendNotice(
                    sock,
                    m,
                    target,
                    '> ⚠️ *Usuario no baneado*\n\n' +
                    '> 👤 Usuario: {user}\n' +
                    '> No aparece en la lista de baneados.'
                )
            }

            await react(sock, m, '✅')

            return sendNotice(
                sock,
                m,
                target,
                '> ✅ *Usuario desbaneado*\n\n' +
                '> 👤 Usuario: {user}\n' +
                '> 🟢 Ya puede volver a utilizar los comandos de PEPE BOT.'
            )
        }

        if (command === 'ban') {
            addBan(target, m.sender || 'owner')

            await react(sock, m, '🔨')

            return sendNotice(
                sock,
                m,
                target,
                '> 🔨 *Usuario baneado*\n\n' +
                '> 👤 Usuario: {user}\n' +
                '> 🚫 Ya no podrá utilizar los comandos.'
            )
        }


        await react(sock, m, '❌')

        return m.reply(
            '> ❌ Ocurrió un error al administrar el baneo.'
        )
    }
}

handler.command = ['ban', 'unban']
handler.help = ['ban', 'unban']
handler.tags = ['owner']
handler.menu = true

export default handler