
import config from '../config.js'

const handler = {}

function normalizarNumero(numero) {
    return String(numero || '').replace(/\D/g, '')
}

handler.run = async (sock, m) => {
    const chat = m.chat || m.key?.remoteJid

    const owners = (config.owner || [])
        .map(normalizarNumero)
        .filter(Boolean)

    const numero = normalizarNumero(m.senderNumber || m.sender)
    const esOwner = m.isOwner || owners.includes(numero)

    if (!esOwner) {
        return sock.sendMessage(chat, {
            text: '> 🚫 Este comando solo puede usarlo el owner.'
        }, { quoted: m })
    }

    if (!chat?.endsWith('@g.us')) {
        return sock.sendMessage(chat, {
            text: '> ⚠️ Este comando solamente funciona en grupos.'
        }, { quoted: m })
    }

    try {
        const metadata = await sock.groupMetadata(chat)

        const miNumero = sock.user?.id
        const miLid = sock.user?.lid

        const normalizarJid = jid =>
            String(jid || '').replace(/:\d+@/, '@')

        const soyAdmin = metadata.participants.some(p => {
            const coincide =
                normalizarJid(p.id) === normalizarJid(miNumero) ||
                normalizarJid(p.jid) === normalizarJid(miNumero) ||
                normalizarJid(p.lid) === normalizarJid(miLid)

            return coincide &&
                (p.admin === 'admin' || p.admin === 'superadmin')
        })

        if (!soyAdmin) {
            return sock.sendMessage(chat, {
                text: '> ❌ Pepe Bot necesita ser administrador para ejecutar esta acción.'
            }, { quoted: m })
        }

        const ownerJid = m.sender || m.key?.participant

        if (!ownerJid) {
            return sock.sendMessage(chat, {
                text: '> ❌ No pude identificar tu usuario.'
            }, { quoted: m })
        }

        const participante = metadata.participants.find(p => {
            const jid = normalizarJid(ownerJid)

            return [p.id, p.jid, p.lid]
                .filter(Boolean)
                .some(id => normalizarJid(id) === jid)
        })

        if (!participante) {
            return sock.sendMessage(chat, {
                text: '> ❌ No pude encontrarte entre los participantes del grupo.'
            }, { quoted: m })
        }

        if (
            participante.admin === 'admin' ||
            participante.admin === 'superadmin'
        ) {
            return sock.sendMessage(chat, {
                text: '> ⚠️ Ya tienes administrador en este grupo.'
            }, { quoted: m })
        }

        await sock.groupParticipantsUpdate(
            chat,
            [participante.id || ownerJid],
            'promote'
        )

        await sock.sendMessage(chat, {
            text: `> ✅ @${numero || ownerJid.split('@')[0]} ahora es administrador del grupo.\n\n> 🐸 *PEPE BOT*`,
            mentions: [participante.id || ownerJid]
        }, { quoted: m })

    } catch (error) {
        console.error('[AUTOADMIN] Error:', error)

        await sock.sendMessage(chat, {
            text: '> ❌ No se pudo otorgar administrador. Verifica los permisos del bot e inténtalo nuevamente.'
        }, { quoted: m })
    }
}

handler.command = ['autoadmin']
handler.help = ['autoadmin']
handler.tags = ['owner']
handler.menu = true

export default handler
