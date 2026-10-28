import config from '../config.js'

const handler = {}

const limpiarNumero = jid =>
    String(jid || '').replace(/\D/g, '')

const normalizar = jid =>
    String(jid || '').split(':')[0]

const esAdmin = participante =>
    participante?.admin === 'admin' ||
    participante?.admin === 'superadmin'

handler.run = async (sock, m, args = []) => {
    const chat = m.key.remoteJid
    const sender = m.key.participant || m.participant || m.sender

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

    if (!chat?.endsWith('@g.us')) {
        await reaccion('❌')
        return aviso('> 🐸 Este comando solo funciona en grupos.')
    }

    let metadata

    try {
        metadata = await sock.groupMetadata(chat)
    } catch {
        await reaccion('❌')
        return aviso('> ❌ No pude obtener los datos del grupo.')
    }

    const participantes = metadata.participants || []

    const buscar = jid => {
        if (!jid) return undefined

        return participantes.find(p =>
            [p.id, p.jid, p.lid]
                .filter(Boolean)
                .some(id => id === jid)
        )
    }

    // Identificar al administrador que ejecuta el comando.
    const adminEjecutor = buscar(sender)

    if (!esAdmin(adminEjecutor)) {
        await reaccion('🚫')
        return aviso('> 🚫 Solo los administradores pueden usar .kick.')
    }

    // Identificar al bot.
    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]
    const botJid = `${botNumero}@s.whatsapp.net`

    let botInfo =
        buscar(botId) ||
        buscar(botJid) ||
        buscar(sock.user?.lid)

    if (!botInfo) {
        botInfo = participantes.find(p =>
            [p.id, p.jid, p.lid]
                .filter(Boolean)
                .some(id =>
                    limpiarNumero(id) === limpiarNumero(botNumero)
                )
        )
    }

    if (!esAdmin(botInfo)) {
        await reaccion('⚠️')
        return aviso('> ⚠️ No pude confirmar que PEPE BOT sea administrador.')
    }

    // Menciones y usuario citado.
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

    const unicos = [...new Set(objetivos)]

    if (!unicos.length) {
        await reaccion('❌')

        const mensaje = await aviso(
            '> 🐸 *PEPE BOT — KICK*\n\n' +
            '> ⚠️ Menciona a uno o varios usuarios, o responde a su mensaje.\n\n' +
            '> 📝 *Ejemplos:*\n' +
            '> .kick @usuario\n' +
            '> .kick @usuario1 @usuario2\n' +
            '> Responde a un mensaje escribiendo .kick\n\n' +
            '> ⏳ Este aviso se actualizará en 15 segundos.'
        )

        await new Promise(resolve => setTimeout(resolve, 15000))

        try {
            await sock.sendMessage(chat, {
                text:
                    '> 🐸 *PEPE BOT — AYUDA KICK*\n\n' +
                    '> Usa .kick mencionando a los usuarios que quieres expulsar.\n' +
                    '> También puedes responder a un mensaje con .kick',
                edit: mensaje.key
            })
        } catch {}

        return
    }

    // Protección del dueño del grupo y del propietario del bot.
    const ownerGrupo =
        metadata.owner ||
        participantes.find(p => p.admin === 'superadmin')?.id

    const owners = (config.owner || [])
        .filter(Boolean)
        .map(limpiarNumero)

    const ownerLids = (config.ownerLid || [])
        .filter(Boolean)
        .map(String)

    const esOwnerBot = p =>
        [p?.id, p?.jid, p?.lid]
            .filter(Boolean)
            .some(id =>
                owners.includes(limpiarNumero(id)) ||
                ownerLids.includes(String(id))
            )

    const expulsados = []
    const protegidos = []
    const fallidos = []

    await reaccion('🛡️')

    for (const jid of unicos) {
        const p = buscar(jid)

        if (!p) {
            fallidos.push(jid)
            continue
        }

        const ids = [p.id, p.jid, p.lid].filter(Boolean)

        const esDuenoGrupo = Boolean(ownerGrupo) &&
            ids.some(id => normalizar(id) === normalizar(ownerGrupo))

        if (esOwnerBot(p) || esDuenoGrupo) {
            protegidos.push(p.id)
            continue
        }

        // Se permite expulsar administradores normales.
        try {
            await sock.groupParticipantsUpdate(chat, [p.id], 'remove')
            expulsados.push(p.id)
        } catch (error) {
            console.error('Error expulsando usuario:', error)
            fallidos.push(p.id)
        }
    }

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