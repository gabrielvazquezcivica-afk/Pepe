
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
        return m.reply(
            '> 🚫 *Acceso denegado*\n\n' +
            '> Solo los owners pueden utilizar este comando.'
        )
    }

    await react(sock, m, '⏳')

    try {
        // Obtener todos los grupos donde está Pepe Bot.
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
            return m.reply(
                '> 📭 *PEPE BOT — GPLINKS*\n\n' +
                '> No encontré ningún grupo.'
            )
        }

        await m.reply(
            '> 🐸 *PEPE BOT — GPLINKS*\n\n' +
            `> 📊 Grupos encontrados: ${lista.length}\n\n` +
            '> ⏳ Obteniendo enlaces de invitación...'
        )

        const resultados = []

        // Obtener información y enlaces.
        for (const grupo of lista) {
            let enlace = 'No disponible'

            try {
                const codigo = await sock.groupInviteCode(
                    grupo.jid
                )

                if (codigo) {
                    enlace = `https://chat.whatsapp.com/${codigo}`
                }

            } catch (error) {
                console.error(
                    `[GPLINKS] ${grupo.nombre}:`,
                    error.message
                )
            }

            resultados.push({
                ...grupo,
                enlace
            })
        }

        // Enviar resultados por bloques.
        const POR_MENSAJE = 5

        for (
            let i = 0;
            i < resultados.length;
            i += POR_MENSAJE
        ) {
            const parte = resultados.slice(
                i,
                i + POR_MENSAJE
            )

            let texto =
                '> 🐸 *PEPE BOT — LISTA DE GRUPOS*\n\n'

            for (let j = 0; j < parte.length; j++) {
                const grupo = parte[j]

                texto +=
                    `> ╭━━〔 *GRUPO ${i + j + 1}* 〕\n` +
                    `> ┃ 🏷️ *Nombre:* ${grupo.nombre}\n` +
                    `> ┃ 👥 *Miembros:* ${grupo.miembros}\n` +
                    `> ┃ 🔗 *Link del grupo:*\n` +
                    `> ┃ ${grupo.enlace}\n` +
                    `> ╰━━━━━━━━━━━━━━\n\n`
            }

            await sock.sendMessage(m.chat, {
                text: texto.trim()
            }, { quoted: m })
        }

        await react(sock, m, '✅')

        await m.reply(
            '> ✅ *CONSULTA FINALIZADA*\n\n' +
            `> 📊 Grupos encontrados: ${resultados.length}\n` +
            '> 🐸 *PEPE BOT*'
        )

    } catch (error) {
        console.error('[GPLINKS]', error)

        await react(sock, m, '❌')

        return m.reply(
            '> ❌ *ERROR — GPLINKS*\n\n' +
            '> No se pudieron obtener los grupos.\n\n' +
            `> 📌 Error: ${error.message}`
        )
    }
}

handler.command = ['gplinks']
handler.help = ['gplinks']
handler.tags = ['owner']
handler.menu = true

export default handler
