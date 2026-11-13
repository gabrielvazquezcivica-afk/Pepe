
const handler = {}

const API = 'https://api-faa.my.id/faa/bard-google?query='

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid

    // Obtener la consulta original
    const textoOriginal =
        m.message?.extendedTextMessage?.text ||
        m.message?.conversation ||
        m.text ||
        args.join(' ')

    const consulta = String(textoOriginal)
        .replace(/^[.!/#]ia(?:\s+|$)/i, '')
        .trim()

    if (!consulta) {
        return m.reply(
            '🐸 *PEPE BOT — INTELIGENCIA ARTIFICIAL*\n\n' +
            'Escribe qué quieres preguntarle a la IA.\n\n' +
            '*Ejemplo:*\n' +
            '.ia ¿Quién fue Albert Einstein?'
        )
    }

    await sock.sendMessage(chat, {
        react: {
            text: '🤖',
            key: m.key
        }
    }).catch(() => {})

    try {
        const url = API + encodeURIComponent(consulta)

        const respuesta = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            signal: AbortSignal.timeout(60000)
        })

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`)
        }

        const data = await respuesta.json()

        if (data.estado !== true || !data.resultado) {
            return m.reply(
                '❌ La IA no pudo generar una respuesta. Intenta nuevamente.'
            )
        }

        const resultado = String(data.resultado).trim()

        await sock.sendMessage(chat, {
            text:
                `🤖 *PEPE BOT AI*\n` +
                `━━━━━━━━━━━━━━━━━━\n\n` +
                resultado +
                `\n\n━━━━━━━━━━━━━━━━━━\n` +
                `🐸 *Powered by PEPE BOT*`,
            contextInfo: {
                mentionedJid: []
            }
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[PEPE IA]', error)

        await m.reply(
            '❌ Ocurrió un error al conectar con la IA.\n\n' +
            'Puede que el servidor esté ocupado o no responda. Intenta más tarde.'
        )
    }
}

handler.command = ['ia', 'bard', 'gemini']
handler.help = ['ia <pregunta>']
handler.tags = ['ia']
handler.menu = true

export default handler
