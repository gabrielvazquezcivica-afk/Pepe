
const handler = {}

const API = 'https://api-faa.my.id/faa/lyrics?q='

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const query = args.join(' ').trim()

    if (!query) {
        return m.reply(
            '`🎵 PEPE BOT LYRICS`\n\n' +
            '> Escribe el nombre de una canción.\n\n' +
            '`EJEMPLO:`\n' +
            '> .lyrics Table Dance'
        )
    }

    await sock.sendMessage(chat, {
        react: { text: '🎵', key: m.key }
    }).catch(() => {})

    try {
        const response = await fetch(
            API + encodeURIComponent(query),
            {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(60000)
            }
        )

        const data = await response.json()

        if (!response.ok || data.status !== true || !data.result) {
            throw new Error(data.error || 'No se encontró la canción.')
        }

        const song = data.result

        const mensaje =
            '`🎵 PEPE BOT LYRICS`\n\n' +
            `*Título:* ${song.title || 'Desconocido'}\n` +
            `*Artista:* ${song.artist || 'Desconocido'}\n` +
            `*Álbum:* ${song.album || 'Desconocido'}\n` +
            `*Género:* ${song.genre || 'Desconocido'}\n\n` +
            '> Powered By 𝒫ℯ𝓅ℯ ℬℴ𝓉 🐸'

        const imagen = song.cover?.medium ||
                       song.cover?.large ||
                       song.cover?.hd

        if (imagen) {
            await sock.sendMessage(chat, {
                image: { url: imagen },
                caption: mensaje
            }, { quoted: m })
        } else {
            await sock.sendMessage(chat, {
                text: mensaje
            }, { quoted: m })
        }

    } catch (error) {
        console.error('[PEPE LYRICS]', error)

        await m.reply(
            '`🎵 PEPE BOT LYRICS`\n\n' +
            '> ❌ No se pudo encontrar la canción.\n\n' +
            '> Intenta nuevamente más tarde.'
        )
    }
}

handler.command = ['lyrics', 'letra']
handler.help = ['letra <canción>']
handler.tags = ['buscador']
handler.menu = true

export default handler
