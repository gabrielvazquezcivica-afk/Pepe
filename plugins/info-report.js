const handler = {}

const GRUPO_REPORTES_LINK = 'https://chat.whatsapp.com/HWtg3ErQbe404jcsTwQ4gM'

handler.run = async (sock, m, args = []) => {
    const reporte = args.join(' ').trim()

    if (!reporte) {
        return m.reply(
            '> ❌ Escribe el reporte que deseas enviar.\n\n' +
            '> 📝 Ejemplo:\n' +
            '> .report El comando play no funciona https://ejemplo.com'
        )
    }

    try {
        const codigo = GRUPO_REPORTES_LINK
            .split('/')
            .pop()
            .split('?')[0]

        const grupo = await sock.groupGetInviteInfo(codigo)

        const numero = String(m.sender || '')
            .split('@')[0]
            .split(':')[0]

        const mensaje =
            `╭━━〔 🚨 NUEVO REPORTE 〕━━⬣\n` +
            `> 👤 Usuario: ${m.pushName || 'Usuario'}\n` +
            `> 📱 Número: ${numero}\n` +
            `> 📝 Reporte:\n` +
            `> ${reporte.replace(/\n/g, '\n> ')}\n` +
            `╰━━━━━━━━━━━━━━━━━━⬣`

        await sock.sendMessage(grupo.id, {
            text: mensaje
        })

        return m.reply('> ✅ Tu reporte fue enviado correctamente.')

    } catch (error) {
        console.error('[REPORT]', error)
        return m.reply('> ❌ No se pudo enviar el reporte. Revisa el enlace del grupo.')
    }
}

handler.command = ['report', 'reporte']
handler.help = ['report <mensaje>']
handler.tags = ['informacion']
handler.menu = true

export default handler