
const handler = {}

handler.command = ['admins', 'admin', 'listadmins']
handler.help = ['admins']
handler.tags = ['grupo']
handler.menu = true

handler.run = async (sock, m, args = []) => {
    try {
        const chat = m.chat || m.key?.remoteJid

        if (!chat || !chat.endsWith('@g.us')) {
            return sock.sendMessage(chat, {
                text: '❌ Este comando solo funciona en grupos.'
            }, { quoted: m })
        }

        const metadata = await sock.groupMetadata(chat)

        const participantes = metadata.participants || []

        const creador = metadata.owner || null

        const admins = participantes.filter(p =>
            p.admin === 'admin' ||
            p.admin === 'superadmin'
        )

        const menciones = []
        let texto = '╭━━━〔 👑 ADMINISTRADORES 〕━━━⬣\n\n'

        // Creador del grupo
        if (creador) {
            const numero = creador.split('@')[0]

            texto += `👑 Creador del grupo: @${numero}\n\n`
            menciones.push(creador)
        }

        // Administradores
        texto += '🛡️ Administradores:\n\n'

        if (admins.length > 0) {
            admins.forEach((admin, i) => {
                const jid = admin.id || admin.jid

                if (!jid) return

                const numero = jid.split('@')[0]

                texto += `${i + 1}. @${numero}\n`
                menciones.push(jid)
            })
        } else {
            texto += 'No hay administradores registrados.\n'
        }

        texto += '\n╰━━━━━━━━━━━━━━━━━━⬣'

        await sock.sendMessage(chat, {
            text: texto,
            mentions: [...new Set(menciones)]
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[ADMINS]', error)

        await sock.sendMessage(
            m.chat || m.key?.remoteJid,
            {
                text: '❌ No pude obtener la lista de administradores.'
            },
            { quoted: m }
        )
    }
}

export default handler
