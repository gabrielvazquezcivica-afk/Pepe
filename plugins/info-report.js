
const handler = {}

const GRUPO_REPORTES_LINK = 'https://chat.whatsapp.com/TU_CODIGO'

function obtenerNumero(m) {
    const posibles = [
        m.key?.participantAlt,
        m.key?.senderPn,
        m.key?.participant,
        m.sender
    ]

    const jid = posibles.find(x =>
        typeof x === 'string' && x.endsWith('@s.whatsapp.net')
    )

    return jid
        ? jid.split('@')[0].split(':')[0]
        : 'Número no disponible'
}

handler.run = async (sock, m, args = []) => {
    const reporte = args.join(' ').trim()

    if (!reporte) {
        return m.reply(
            '> ❌ Escribe lo que deseas reportar.\n\n' +
            '> 📝 Ejemplo:\n' +
            '> .report El comando play no funciona'
        )
    }

    try {
        const codigo = GRUPO_REPORTES_LINK
            .split('/')
            .pop()
            .split('?')[0]

        const grupoDestino = await sock.groupGetInviteInfo(codigo)

        const chatOrigen = m.chat || m.key?.remoteJid
        const esGrupo = chatOrigen?.endsWith('@g.us')

        let nombreGrupo = 'Chat privado'
        let rango = 'Usuario'

        if (esGrupo) {
            const metadata = await sock.groupMetadata(chatOrigen)
            nombreGrupo = metadata.subject || 'Grupo sin nombre'

            const participantes = metadata.participants || []

            const identificadores = [
                m.sender,
                m.key?.participant,
                m.key?.participantAlt
            ].filter(Boolean)

            const participante = participantes.find(p =>
                identificadores.some(id =>
                    id === p.id ||
                    id === p.lid ||
                    id === p.phoneNumber
                )
            )

            rango = participante?.admin
                ? 'Administrador'
                : 'Miembro'
        }

        const numero = obtenerNumero(m)

        const mensaje =
            `🚨 *NUEVO REPORTE*\n\n` +
            `> 👤 Usuario: ${m.pushName || 'Usuario'}\n` +
            `> 📱 Número: ${numero}\n` +
            `> 👥 Grupo: ${nombreGrupo}\n` +
            `> 🛡️ Rango: ${rango}\n\n` +
            `> 📝 *Reporte:*\n` +
            `> ${reporte.replace(/\n/g, '\n> ')}`

        await sock.sendMessage(grupoDestino.id, {
            text: mensaje
        })

        return m.reply('> ✅ Tu reporte fue enviado correctamente.')

    } catch (error) {
        console.error('[REPORT]', error)
        return m.reply('> ❌ No se pudo enviar el reporte. Revisa el enlace y los permisos del bot.')
    }
}

handler.command = ['report', 'reporte']
handler.help = ['report <mensaje>']
handler.tags = ['informacion']
handler.menu = true

export default handler
