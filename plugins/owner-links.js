
const handler = {}

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

handler.run = async (sock, m) => {
    if (!m.isOwner) {
        await react(sock, m, '❌')
        return m.reply('Solo los owners pueden utilizar este comando.')
    }

    await react(sock, m, '⏳')

    try {
        const grupos = await sock.groupFetchAllParticipating()

        const lista = Object.entries(grupos || {})
            .map(([jid, metadata]) => ({
                jid,
                nombre: metadata.subject || 'Grupo sin nombre',
                miembros: metadata.participants?.length || 0
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))

        if (!lista.length) {
            await react(sock, m, '⚠️')
            return m.reply('No se encontraron grupos.')
        }

        const resultados = []

        for (const grupo of lista) {
            let enlace = 'No disponible'

            try {
                const codigo = await sock.groupInviteCode(grupo.jid)

                if (codigo) {
                    enlace = `https://chat.whatsapp.com/${codigo}`
                }
            } catch (error) {
                console.error(`[GPLINKS] ${grupo.nombre}:`, error.message)
            }

            resultados.push({
                ...grupo,
                enlace
            })
        }

        const POR_MENSAJE = 5

        for (let i = 0; i < resultados.length; i += POR_MENSAJE) {
            const parte = resultados.slice(i, i + POR_MENSAJE)

            let texto = 'PEPE BOT - LINKS 🐸\n\n'

            for (const grupo of parte) {
                texto +=
                    `🚀Grupo: ${grupo.nombre}\n` +
                    `> 🧸 Miembros: ${grupo.miembros}\n` +
                    `> 🪐 Link: ${grupo.enlace}\n\n`
            }

            await sock.sendMessage(
                m.chat,
                { text: texto.trim() },
                { quoted: m }
            )
        }

        await react(sock, m, '✅')

    } catch (error) {
        console.error('[GPLINKS]', error)

        await react(sock, m, '❌')
        return m.reply(
            `No se pudieron obtener los grupos.\nError: ${error.message}`
        )
    }
}

handler.command = ['gplinks']
handler.help = ['gplinks']
handler.tags = ['owner']
handler.menu = true

export default handler
