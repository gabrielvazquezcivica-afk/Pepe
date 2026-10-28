import config from '../config.js'

const handler = {}

function limpiarNumero(jid = '') {
    return String(jid).replace(/[^0-9]/g, '')
}

function normalizar(jid = '') {
    return String(jid).split(':')[0]
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
        } catch (e) {
            console.log('No se pudo editar el aviso:', e.message)
        }
    }

    if (!from.endsWith('@g.us')) {
        await reaccion('❌')
        return aviso('> 🐸 Este comando solo funciona en grupos.')
    }

    let metadata

    try {
        metadata = await sock.groupMetadata(from)
    } catch {
        await reaccion('❌')
        return aviso('> ❌ No pude obtener la información del grupo.')
    }

    const participantes = metadata.participants || []

    const buscar = jid => participantes.find(p =>
        p.id === jid ||
        p.jid === jid ||
        p.lid === jid ||
        normalizar(p.id) === normalizar(jid) ||
        (p.jid && normalizar(p.jid) === normalizar(jid)) ||
        (p.lid && normalizar(p.lid) === normalizar(jid))
    )

    const esAdmin = p =>
        p?.admin === 'admin' || p?.admin === 'superadmin'

    // Verificar al administrador que ejecuta el comando.
    const userInfo = buscar(sender)

    if (!esAdmin(userInfo)) {
        await reaccion('🚫')
        return aviso('> 🚫 Solo los administradores pueden usar .kick.')
    }

    // Reconocer al bot con el formato que ya funciona en tu código.
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    const botInfo = buscar(botId)

    if (!esAdmin(botInfo)) {
        await reaccion('⚠️')
        return aviso('> ⚠️ No pude verificar que PEPE BOT sea administrador.')
    }

    // Obtener menciones y respuesta citada.
    const contextInfo =
        m.message?.extendedTextMessage?.contextInfo ||
        m.message?.imageMessage?.contextInfo ||
        m.message?.videoMessage?.contextInfo ||
        {}

    const objetivos = [
        ...(contextInfo.mentionedJid || [])
    ]

    if (contextInfo.participant) {
        objetivos.push(contextInfo.participant)
    }

    // Aceptar números escritos como argumentos.
    if (!objetivos.length) {
        for (const arg of args) {
            const numero = arg.replace(/\D/g, '')
            if (numero.length >= 7) {
                objetivos.push(`${numero}@s.whatsapp.net`)
            }
        }
    }

    const unicos = [...new Set(objetivos)]
    const validos = unicos
        .map(jid => buscar(jid))
        .filter(Boolean)

    if (!validos.length) {
        const mensaje = await aviso(
            '> 🐸 *PEPE BOT — KICK*\n\n' +
            '> ⚠️ Menciona a una o varias personas, o responde a su mensaje.\n\n' +
            '> 📝 *Ejemplos:*\n' +
            '> .kick @usuario\n' +
            '> .kick @usuario1 @usuario2\n' +
            '> Responde a un mensaje escribiendo .kick\n\n'
        )

        await new Promise(resolve => setTimeout(resolve, 15000))

        await editar(
            mensaje,
            '> 🐸 *PEPE BOT — AYUDA KICK*\n\n' +
            '> 📝 Usa .kick mencionando a los usuarios que deseas expulsar.\n' +
            '> También puedes responder al mensaje de un usuario con .kick\n\n' +
            '> 🛡️ Solo administradores pueden usar este comando.'
        )
        return
    }

    // Protección del dueño del grupo.
    const ownerGrupo = metadata.owner ||
        participantes.find(p => p.admin === 'superadmin')?.id

    // Protección del propietario configurado del bot.
    const owners = (config.owner || [])
        .filter(Boolean)
        .map(limpiarNumero)

    const ownerLids = (config.ownerLid || [])
        .filter(Boolean)
        .map(String)

    const protegidos = []
    const candidatos = []

    for (const p of validos) {
        const ids = [p.id, p.jid, p.lid].filter(Boolean)

        const esOwnerBot = ids.some(id =>
            owners.includes(limpiarNumero(id)) ||
            ownerLids.includes(String(id))
        )

        const esDuenoGrupo = ids.some(id =>
            ownerGrupo &&
            normalizar(id) === normalizar(ownerGrupo)
        )

        if (esOwnerBot || esDuenoGrupo) {
            protegidos.push(p.id)
        } else {
            // Se permite expulsar administradores normales.
            candidatos.push(p.id)
        }
    }

    const expulsados = []
    const fallidos = []

    await reaccion('🛡️')

    for (const jid of candidatos) {
        try {
            await sock.groupParticipantsUpdate(from, [jid], 'remove')
            expulsados.push(jid)
        } catch (e) {
            console.log('ERROR KICK:', jid, e)
            fallidos.push(jid)
        }
    }

    const lineas = []

    if (expulsados.length) {
        lineas.push(
            '> ✅ *Expulsados:*\n' +
            expulsados.map(jid => `> • @${limpiarNumero(jid)}`).join('\n')
        )
    }

    if (protegidos.length) {
        lineas.push(
            '> 👑 *Usuarios protegidos:*\n' +
            protegidos.map(jid => `> • @${limpiarNumero(jid)}`).join('\n')
        )
    }

    if (fallidos.length) {
        lineas.push(
            '> ❌ *No se pudieron expulsar:*\n' +
            fallidos.map(jid => `> • @${limpiarNumero(jid)}`).join('\n')
        )
    }

    lineas.push(`> 🛡️ *Acción realizada por:* @${limpiarNumero(sender)}`)
    lineas.push(`> 🐸 ${config.BOT_NAME || 'PEPE BOT'}`)

    await reaccion(expulsados.length ? '✅' : '⚠️')

    await aviso(
        lineas.join('\n\n'),
        [...new Set([...expulsados, ...protegidos, ...fallidos, sender])]
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