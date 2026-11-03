
import config from '../config.js'

const handler = {}

function normalizar(id) {
    return String(id || '').replace(/:\d+@/, '@')
}

function obtenerOwners() {
    return [
        ...(Array.isArray(config.owner) ? config.owner : [config.owner]),
        ...(Array.isArray(config.ownerLid) ? config.ownerLid : [config.ownerLid])
    ].filter(Boolean)
}

handler.run = async (sock, m) => {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
    }

    const owners = obtenerOwners()

    try {
        const metadata = await sock.groupMetadata(chat)

        const normalizarNumero = id =>
            String(id || '').replace(/:\d+@/, '@').replace(/\D/g, '')

        const owner = metadata.participants.find(p =>
            [p.id, p.jid, p.lid].filter(Boolean).some(id =>
                owners.some(o =>
                    normalizar(id) === normalizar(o)
                )
            )
        )

        if (!owner) {
            return m.reply('> ❌ Solamente el owner puede usar el comando.')
        }

        if (
            owner.admin === 'admin' ||
            owner.admin === 'superadmin'
        ) {
            return m.reply('> ⚠️ El Owner ya es administrador.')
        }

        await sock.groupParticipantsUpdate(
            chat,
            [owner.id],
            'promote'
        )

        return m.reply('> ✅ El Owner ahora es administrador del grupo.')

    } catch (error) {
        console.error('[AUTOADMIN]', error)
        return m.reply('> ❌ PEPE BOT no es administrador.')
    }
}

handler.command = ['autoadmin']
handler.help = ['autoadmin']
handler.tags = ['owner']
handler.owner = true
handler.menu = true

export default handler
