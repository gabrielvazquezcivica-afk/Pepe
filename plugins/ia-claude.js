
const handler = {}

const API = 'https://api-faa.my.id/faa/claude-ai?text='

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const pregunta = args.join(' ').trim()

    if (!pregunta) {
        return m.reply(
            '`🤖 PEPE BOT CLAUDE`\n\n' +
            '> Escribe tu pregunta.\n\n' +
            '`EJEMPLO:`\n' +
            '> .claude ¿Quién es Cristiano Ronaldo?'
        )
    }

    await sock.sendMessage(chat, {
        react: {
            text: '🤖',
            key: m.key
        }
    }).catch(() => {})

    try {
        const response = await fetch(
            API + encodeURIComponent(pregunta),
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                signal: AbortSignal.timeout(60000)
            }
        )

        const data = await response.json()

        console.log('[PEPE CLAUDE] Respuesta API:', data)

        if (!response.ok || data.status !== true || !data.result) {
            throw new Error(data.error || 'La API no devolvió una respuesta válida.')
        }

        await sock.sendMessage(chat, {
            text:
                '`🤖 PEPE BOT CLAUDE`\n\n' +
                String(data.result).trim() +
                '\n\n> Powered By 𝒫ℯ𝓅ℯ ℬℴ𝓉 🐸'
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[PEPE CLAUDE] Error:', error)

        await m.reply(
            '`🤖 PEPE BOT CLAUDE`\n\n' +
            '> ❌ No se pudo obtener una respuesta.\n\n' +
            '> Intenta nuevamente más tarde.'
        )
    }
}

handler.command = ['claude']
handler.help = ['claude <pregunta>']
handler.tags = ['ia']
handler.menu = true

export default handler
