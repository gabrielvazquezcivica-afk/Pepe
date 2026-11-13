
const handler = {}

const API_URL = 'https://api.stellarwa.xyz/sfw/interaction'
const API_KEY = 'api-hbWMB'

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
        texto: (a, b) => `> @${a} acarició a @${b}`
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
        api: 'celebrate',
        texto: (a, b) => `> 🎉 @${a} animó a @${b}`
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
    },
    aplaudir: {
        api: 'clap',
        texto: (a, b) => `> 👏 @${a} está aplaudiendo a @${b}`
    },
    saltar: {
        api: 'jump',
        texto: (a, b) => `> @${a} está saltando`
    },
    caminar: {
        api: 'walk',
        texto: (a, b) => `> @${a} está caminando`
    },
    bostezar: {
        api: 'yawn',
        texto: (a, b) => `> @${a} está bostezando`
    },
    estudiar: {
        api: 'study',
        texto: (a, b) => `> 📚 @${a} está estudiando`
    },
    cocinar: {
        api: 'cook',
        texto: (a, b) => `> 🍳 @${a} está cocinando`
    },
    saludar2: {
        api: 'salute',
        texto: (a, b) => `> @${a} saludó`
    },
    celebrar: {
        api: 'celebrate',
        texto: (a, b) => `> 🎊 @${a} está celebrando`
    },
    proteger: {
        api: 'protect',
        texto: (a, b) => `> 🛡️ @${a} está protegiendo a @${b}`
    },
    disculparse: {
        api: 'apologize',
        texto: (a, b) => `> @${a} se disculpó con @${b}`
    },
    chocarpuños: {
        api: 'fistbump',
        texto: (a, b) => `> @${a} chocó puños con @${b}`
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

        const individuales = [
            'llorar', 'pensar', 'dormir', 'saltar',
            'caminar', 'bostezar', 'estudiar',
            'cocinar', 'saludar2', 'celebrar'
        ]

        let persona1 =
            menciones[0] ||
            citado?.sender ||
            citado?.key?.participant ||
            citado?.key?.participantAlt ||
            null

        if (!persona1 && !individuales.includes(comando)) {
            return m.reply(
                `> ❌ Menciona a alguien o responde a su mensaje.\n\n` +
                `> Ejemplo: .${comando} @usuario`
            )
        }

        const usuario = m.sender.split('@')[0].split(':')[0]
        const objetivo = persona1
            ? persona1.split('@')[0].split(':')[0]
            : usuario

        const url = `${API_URL}?inter=${encodeURIComponent(accion.api)}&key=${encodeURIComponent(API_KEY)}`

        const respuesta = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`)
        }

        const data = await respuesta.json()

        if (data.status === false) {
            return m.reply(`> ❌ ${data.message || 'La API rechazó la interacción.'}`)
        }

        const mediaUrl =
            data.result ||
            data.url ||
            data.video ||
            data.gif ||
            data.data?.url

        if (!mediaUrl) {
            console.error('[INTERACCIONES] Respuesta API:', data)
            return m.reply('> ❌ La API no devolvió un enlace multimedia válido.')
        }

        const media = await fetch(mediaUrl)

        if (!media.ok) {
            throw new Error('No se pudo descargar el contenido multimedia.')
        }

        const buffer = Buffer.from(await media.arrayBuffer())

        if (!buffer.length) {
            throw new Error('El contenido multimedia está vacío.')
        }

        const caption = individuales.includes(comando)
            ? accion.texto(usuario, usuario)
            : accion.texto(usuario, objetivo)

        await sock.sendMessage(m.chat, {
            video: buffer,
            gifPlayback: true,
            caption,
            mentions: persona1 ? [m.sender, persona1] : [m.sender]
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
    'dormir',
    'aplaudir',
    'saltar',
    'caminar',
    'bostezar',
    'estudiar',
    'cocinar',
    'saludar2',
    'celebrar',
    'proteger',
    'disculparse',
    'chocarpuños'
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
    'dormir',
    'aplaudir',
    'saltar',
    'caminar',
    'bostezar',
    'estudiar',
    'cocinar',
    'saludar2',
    'celebrar',
    'proteger',
    'disculparse',
    'chocarpuños'
]

handler.tags = ['juegos']
handler.menu = true

export default handler
