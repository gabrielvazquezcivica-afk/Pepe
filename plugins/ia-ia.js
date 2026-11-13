
const handler = {}

const API = 'https://api-faa.my.id/faa/bard-google?query='

function extraerTexto(m) {
    let contenido = m.message

    while (contenido) {
        if (contenido.ephemeralMessage?.message) {
            contenido = contenido.ephemeralMessage.message
            continue
        }

        if (contenido.viewOnceMessage?.message) {
            contenido = contenido.viewOnceMessage.message
            continue
        }

        if (contenido.viewOnceMessageV2?.message) {
            contenido = contenido.viewOnceMessageV2.message
            continue
        }

        break
    }

    return (
        contenido?.extendedTextMessage?.text ||
        contenido?.conversation ||
        contenido?.imageMessage?.caption ||
        contenido?.videoMessage?.caption ||
        m.text ||
        ''
    )
}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid

    const texto = extraerTexto(m)

    const consulta = String(texto)
        .replace(/^[.!/#]ia(?:[ \t]+|$)/i, '')
        .trim() || args.join(' ').trim()

    if (!consulta) {
        return m.reply(
            '> 🤖 *PEPE BOT AI*\n' +
            '>\n' +
            '> Escribe tu pregunta.\n' +
            '>\n' +
            '> *Ejemplo:*\n' +
            '> .ia ¿Qué es JavaScript?'
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

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            signal: AbortSignal.timeout(60000)
        })

        const contenido = await response.text()

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${contenido.slice(0, 500)}`
            )
        }

        let data

        try {
            data = JSON.parse(contenido)
        } catch {
            throw new Error(
                `La API no devolvió JSON válido: ${contenido.slice(0, 500)}`
            )
        }

        console.log('[PEPE IA] Respuesta API:', data)

        const resultado = data?.resultado
        const estado = data?.estado

        const estadoValido = [
            true,
            'true',
            'verdadero',
            '1',
            1
        ].includes(
            typeof estado === 'string'
                ? estado.toLowerCase().trim()
                : estado
        )

        if (!resultado || (estado !== undefined && !estadoValido)) {
            throw new Error(
                `La API respondió sin resultado válido: ${JSON.stringify(data).slice(0, 500)}`
            )
        }

        await sock.sendMessage(chat, {
            text:
                '> 🤖 *PEPE BOT AI*\n' +
                '> ━━━━━━━━━━━━━━━━━━\n' +
                '>\n' +
                String(resultado).trim() +
                '\n>\n' +
                '> ━━━━━━━━━━━━━━━━━━\n' +
                '> 🐸 *Powered by PEPE BOT*'
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[PEPE IA] Error:', error)

        await m.reply(
            '> ❌ *No se pudo obtener una respuesta de la IA.*\n' +
            '>\n' +
            '> Puede que el servidor esté ocupado o no responda.\n' +
            '>\n' +
            '> Intenta nuevamente más tarde.'
        )
    }
}

handler.command = ['ia', 'bard', 'gemini']
handler.help = ['ia <pregunta>']
handler.tags = ['ia']
handler.menu = true

export default handler
