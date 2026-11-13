
const handler = {}

const interacciones = {
    abrazar: {
        api: 'hug',
        texto: (a, b) => `> 🤗 @${a} abrazó a @${b}`
    },
    saludar: {
        api: 'wave',
        texto: (a, b) => `> 👋 @${a} saludó a @${b}`
    },
    acariciar: {
        api: 'pat',
        texto: (a, b) => `> 🫳 @${a} acarició a @${b}`
    },
    sonreir: {
        api: 'smile',
        texto: (a, b) => `> 😊 @${a} le sonrió a @${b}`
    },
    felicitar: {
        api: 'happy',
        texto: (a, b) => `> 🎉 @${a} felicitó a @${b}`
    },
    chocar5: {
        api: 'highfive',
        texto: (a, b) => `> 🙌 @${a} chocó los cinco con @${b}`
    },
    animar: {
        api: 'cheer',
        texto: (a, b) => `> 🎊 @${a} animó a @${b}`
    },
    bailar: {
        api: 'dance',
        texto: (a, b) => `> 💃 @${a} bailó con @${b}`
    },
    reir: {
        api: 'laugh',
        texto: (a, b) => `> 😂 @${a} se rio con @${b}`
    },
    llorar: {
        api: 'cry',
        texto: (a, b) => `> 😢 @${a} está llorando`
    },
    pensar: {
        api: 'think',
        texto: (a, b) => `> 🤔 @${a} se quedó pensando`
    },
    dormir: {
        api: 'sleep',
        texto: (a, b) => `> 😴 @${a} se quedó dormido`
    }
}

handler.run = async (sock, m, args = []) => {
    try {
        const comando = String(m.command || '').toLowerCase()
        const accion = interacciones[comando]

        if (!accion) return

        const contexto = m.message?.extendedTextMessage?.contextInfo
        const menciones = contexto?.mentionedJid || m.mentionedJid || []
        const citado = m.quoted || null

        const persona1 =
            menciones[0] ||
            citado?.sender ||
            citado?.key?.participant ||
            citado?.key?.participantAlt ||
            null

        const persona2 = persona1 ? m.sender : null

        const accionesIndividuales = [
            'llorar',
            'pensar',
            'dormir'
        ]

        if (!persona1 && !accionesIndividuales.includes(comando)) {
            return m.reply(
                `> ❌ Menciona a alguien o responde a su mensaje.\n\n` +
                `> Ejemplo: .${comando} @usuario`
            )
        }

        const usuario = m.sender
            .split('@')[0]
            .split(':')[0]

        const objetivo = persona1
            ? persona1.split('@')[0].split(':')[0]
            : usuario

        const api = global.api || {}

        if (!api.url || !api.key) {
            return m.reply('> ❌ La API no está configurada correctamente.')
        }

        const url =
            `${api.url}/sfw/interaction?inter=${encodeURIComponent(accion.api)}&key=${encodeURIComponent(api.key)}`

        const respuesta = await fetch(url)

        if (!respuesta.ok) {
            throw new Error(`Error de API: ${respuesta.status}`)
        }

        const buffer = Buffer.from(await respuesta.arrayBuffer())

        if (!buffer.length) {
            throw new Error('La API no devolvió contenido.')
        }

        const caption = accionesIndividuales.includes(comando)
            ? accion.texto(usuario, usuario)
            : accion.texto(usuario, objetivo)

        const mentions = persona1 ? [persona1, m.sender] : [m.sender]

        await sock.sendMessage(m.chat, {
            video: buffer,
            gifPlayback: true,
            caption,
            mentions
        }, { quoted: m })

    } catch (error) {
        console.error('[PEPE BOT - INTERACCIONES]', error)
        await m.reply('> ❌ Ocurrió un error al realizar la interacción.')
    }
}

handler.command = [
    'abrazar',
    'saludar',
    'acariciar',
    'sonreir',
    'felicitar',
    'chocar5',
    'animar',
    'bailar',
    'reir',
    'llorar',
    'pensar',
    'dormir'
]

handler.help = [
    'abrazar',
    'saludar',
    'acariciar',
    'sonreir',
    'felicitar',
    'chocar5',
    'animar',
    'bailar',
    'reir',
    'llorar',
    'pensar',
    'dormir'
]

handler.tags = ['juegos']
handler.menu = true

export default handler
