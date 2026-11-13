
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

    // Aviso de uso
    if (!consulta) {
        return m.reply(
            '`🤖 PEPE BOT IA`\n\n' +
            '> Escribe tu pregunta.\n\n' +
            '`EJEMPLO:`\n' +
            '> ¿Quién es Cristiano Ronaldo?'
        )
    }

    // Reacción
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

        let data

        try {
            data = JSON.parse(contenido)
        } catch {
            throw new Error(
                `Respuesta inválida de la API: ${contenido.slice(0, 300)}`
            )
        }

        console.log('[PEPE IA] Respuesta API:', data)

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${data?.error || contenido.slice(0, 300)}`
            )
        }

        // Compatibilidad con ambos formatos
        const estado = data?.status ?? data?.estado
        const resultado = data?.result ?? data?.resultado

        if (
            estado === false ||
            estado === 'false' ||
            estado === 0 ||
            estado === '0'
        ) {
            throw new Error(
                data?.error || 'La API indicó que la solicitud falló.'
            )
        }

        if (!resultado || typeof resultado !== 'string') {
            throw new Error('La API no devolvió una respuesta válida.')
        }

        // Respuesta de la IA
        await sock.sendMessage(chat, {
            text:
                '`🤖 PEPE BOT IA`\n\n' +
                resultado.trim() +
                '\n\n> Powered By 𝒫ℯ𝓅ℯ ℬℴ𝓉 🐸'
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[PEPE IA] Error:', error)

        // Aviso de error
        await m.reply(
            '`🤖 PEPE BOT IA`\n\n' +
            '> ❌ No se pudo obtener una respuesta.\n\n' +
            '> Intenta nuevamente más tarde.'
        )
    }
}

handler.command = ['ia', 'bard', 'gemini']
handler.help = ['ia <pregunta>']
handler.tags = ['ia']
handler.menu = true

export default handler
