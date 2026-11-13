
const handler = {}

const API_URL = 'https://api.stellarwa.xyz/sfw/interaction'
const API_KEY = 'api-hbWMB'

const interacciones = {
    abrazar: {
        api: 'hug',
        texto: (a, b) => `> 🤗 @${a} abrazó a @${b}`
    },
    consolar: {
        api: 'comfort',
        texto: (a, b) => `> 💗 @${a} consoló a @${b}`
    },
    saludar: {
        api: 'wave',
        texto: (a, b) => `> 👋 @${a} saludó a @${b}`
    },
    acariciar: {
        api: 'pat',
        texto: (a, b) => `> 🥰 @${a} acarició a @${b}`
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
    pensarprofundo: {
        api: 'thinkhard',
        texto: (a, b) => `> 🧠 @${a} está pensando profundamente`
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
        texto: (a, b) => `> 🐸 @${a} está saltando`
    },
    caminar: {
        api: 'walk',
        texto: (a, b) => `> 🚶 @${a} está caminando`
    },
    bostezar: {
        api: 'yawn',
        texto: (a, b) => `> 🥱 @${a} está bostezando`
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
        texto: (a, b) => `> 🫡 @${a} hizo un saludo`
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
        texto: (a, b) => `> 🙏 @${a} se disculpó con @${b}`
    },
    chocarpuños: {
        api: 'fistbump',
        texto: (a, b) => `> 👊 @${a} chocó puños con @${b}`
    },

    // Nuevas interacciones
    curioso: {
        api: 'curious',
        texto: (a, b) => `> 🤨 @${a} tiene curiosidad`
    },
    olfatear: {
        api: 'sniff',
        texto: (a, b) => `> 🐽 @${a} está olfateando`
    },
    mirar: {
        api: 'stare',
        texto: (a, b) => `> 👀 @${a} se quedó mirando a @${b}`
    },
    beso: {
        api: 'blowkiss',
        texto: (a, b) => `> 💋 @${a} le lanzó un beso a @${b}`
    },
    saludarbeso: {
        api: 'kiss',
        texto: (a, b) => `> 💋 @${a} le dio un beso a @${b}`
    },
    cosquillas: {
        api: 'tickle',
        texto: (a, b) => `> 😂 @${a} le hizo cosquillas a @${b}`
    },
    gritar: {
        api: 'scream',
        texto: (a, b) => `> 😱 @${a} está gritando`
    },
    frio: {
        api: 'cold',
        texto: (a, b) => `> 🥶 @${a} tiene frío`
    },
    jugar: {
        api: 'gaming',
        texto: (a, b) => `> 🎮 @${a} está jugando`
    },
    dibujar: {
        api: 'draw',
        texto: (a, b) => `> 🎨 @${a} está dibujando`
    },
    llamar: {
        api: 'call',
        texto: (a, b) => `> 📞 @${a} está llamando`
    },
    aburrido: {
        api: 'bored',
        texto: (a, b) => `> 😐 @${a} está aburrido`
    },
    dramatico: {
        api: 'dramatic',
        texto: (a, b) => `> 🎭 @${a} está siendo dramático`
    },
    cafe: {
        api: 'coffee',
        texto: (a, b) => `> ☕ @${a} está tomando café`
    },
    enojado: {
        api: 'angry',
        texto: (a, b) => `> 😠 @${a} está enojado`
    },
    bleh: {
        api: 'bleh',
        texto: (a, b) => `> 😛 @${a} sacó la lengua`
    },
    nope: {
        api: 'nope',
        texto: (a, b) => `> 🙅 @${a} dijo que no`
    },
    puchero: {
        api: 'pout',
        texto: (a, b) => `> 🥺 @${a} está haciendo pucheros`
    },
    correr: {
        api: 'run',
        texto: (a, b) => `> 🏃 @${a} está corriendo`
    },
    triste: {
        api: 'sad',
        texto: (a, b) => `> 😔 @${a} está triste`
    },
    asustado: {
        api: 'scared',
        texto: (a, b) => `> 😨 @${a} está asustado`
    },
    timido: {
        api: 'shy',
        texto: (a, b) => `> 😊 @${a} está tímido`
    },
    guiñar: {
        api: 'wink',
        texto: (a, b) => `> 😉 @${a} guiñó un ojo`
    },
    comer: {
        api: 'eat',
        texto: (a, b) => `> 🍽️ @${a} está comiendo`
    },
    sonrojar: {
        api: 'blush',
        texto: (a, b) => `> 😊 @${a} se sonrojó`
    },
    presumir: {
        api: 'smug',
        texto: (a, b) => `> 😏 @${a} está presumiendo`
    },
    hablar: {
        api: 'talk',
        texto: (a, b) => `> 💬 @${a} está hablando`
    },
    estornudar: {
        api: 'sneeze',
        texto: (a, b) => `> 🤧 @${a} está estornudando`
    },
    enfermo: {
        api: 'sick',
        texto: (a, b) => `> 🤒 @${a} no se siente bien`
    },
    limpiar: {
        api: 'scrub',
        texto: (a, b) => `> 🧽 @${a} está limpiando`
    },
    vergüenza: {
        api: 'cringe',
        texto: (a, b) => `> 😬 @${a} está avergonzado`
    },
    facepalm: {
        api: 'facepalm',
        texto: (a, b) => `> 🤦 @${a} hizo un facepalm`
    },
    boop: {
        api: 'boop',
        texto: (a, b) => `> 👉 @${a} hizo boop a @${b}`
    },
    piggyback: {
        api: 'piggyback',
        texto: (a, b) => `> 🐸 @${a} lleva a @${b}`
    },
    compartircomida: {
        api: 'sharefood',
        texto: (a, b) => `> 🍱 @${a} compartió comida con @${b}`
    },
    regañar: {
        api: 'scold',
        texto: (a, b) => `> 😤 @${a} regañó a @${b}`
    },
    bromear: {
        api: 'tease',
        texto: (a, b) => `> 😜 @${a} bromeó con @${b}`
    },
    inclinar: {
        api: 'bow',
        texto: (a, b) => `> 🙇 @${a} hizo una reverencia`
    },
    girar: {
        api: 'spin',
        texto: (a, b) => `> 🌀 @${a} está girando`
    },
    posar: {
        api: 'pose',
        texto: (a, b) => `> 📸 @${a} está posando`
    },
    flexionar: {
        api: 'flex',
        texto: (a, b) => `> 💪 @${a} está presumiendo`
    },
    puntitas: {
        api: 'tiptoe',
        texto: (a, b) => `> 🤫 @${a} camina de puntitas`
    },
    picnic: {
        api: 'picnic',
        texto: (a, b) => `> 🧺 @${a} está disfrutando un picnic`
    },
    siesta: {
        api: 'snuggle',
        texto: (a, b) => `> 💤 @${a} está descansando con @${b}`
    },
    acurrucar: {
        api: 'cuddle',
        texto: (a, b) => `> 🧸 @${a} se acurrucó con @${b}`
    },
    apenado: {
        api: 'blush',
        texto: (a, b) => `> 😊 @${a} está apenado`
    },
    mirarcurioso: {
        api: 'peek',
        texto: (a, b) => `> 👀 @${a} está mirando discretamente`
    },
    reirnervioso: {
        api: 'cringe',
        texto: (a, b) => `> 😬 @${a} está incómodo`
    },
    cantar: {
        api: 'sing',
        texto: (a, b) => `> 🎤 @${a} está cantando`
    },
    saltito: {
        api: 'trip',
        texto: (a, b) => `> 🐸 @${a} dio un saltito`
    },
    feliz: {
        api: 'happy',
        texto: (a, b) => `> 😄 @${a} está feliz`
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
            'llorar', 'pensar', 'pensarprofundo', 'dormir',
            'saltar', 'caminar', 'bostezar', 'estudiar',
            'cocinar', 'saludar2', 'celebrar', 'curioso',
            'olfatear', 'gritar', 'frio', 'jugar',
            'dibujar', 'llamar', 'aburrido', 'dramatico',
            'cafe', 'enojado', 'bleh', 'nope', 'puchero',
            'correr', 'triste', 'asustado', 'timido',
            'guiñar', 'comer', 'sonrojar', 'presumir',
            'hablar', 'estornudar', 'enfermo', 'limpiar',
            'vergüenza', 'facepalm', 'inclinar', 'girar',
            'posar', 'flexionar', 'puntitas', 'picnic',
            'cantar', 'saltito', 'feliz'
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

        let buffer = Buffer.from(await respuesta.arrayBuffer())

        const primerByte = buffer.length
            ? String.fromCharCode(buffer[0])
            : ''

        if (primerByte === '{' || primerByte === '[') {
            let data

            try {
                data = JSON.parse(buffer.toString('utf8'))
            } catch {
                console.error(
                    '[INTERACCIONES] Respuesta inválida:',
                    buffer.toString('utf8', 0, 200)
                )
                return m.reply('> ❌ La API devolvió una respuesta que no se pudo leer.')
            }

            if (data.status === false) {
                return m.reply(`> ❌ ${data.message || 'La API rechazó la interacción.'}`)
            }

            const mediaUrl =
                data.result ||
                data.url ||
                data.video ||
                data.gif ||
                data.data?.url

            if (!mediaUrl || typeof mediaUrl !== 'string') {
                console.error('[INTERACCIONES] Respuesta API:', data)
                return m.reply('> ❌ La API no devolvió un enlace multimedia válido.')
            }

            const media = await fetch(mediaUrl)

            if (!media.ok) {
                throw new Error('No se pudo descargar el contenido multimedia.')
            }

            buffer = Buffer.from(await media.arrayBuffer())
        }

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
    'consolar',
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
    'pensarprofundo',
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
    'chocarpuños',
    'curioso',
    'olfatear',
    'mirar',
    'kiss',
    'kiss2',
    'cosquillas',
    'gritar',
    'frio',
    'jugar',
    'dibujar',
    'llamar',
    'aburrido',
    'dramatico',
    'cafe',
    'enojado',
    'bleh',
    'nope',
    'puchero',
    'correr',
    'triste',
    'asustado',
    'timido',
    'guiñar',
    'comer',
    'sonrojar',
    'presumir',
    'hablar',
    'estornudar',
    'enfermo',
    'limpiar',
    'vergüenza',
    'facepalm',
    'boop',
    'piggyback',
    'compartircomida',
    'regañar',
    'bromear',
    'inclinar',
    'girar',
    'posar',
    'flexionar',
    'puntitas',
    'picnic',
    'siesta',
    'acurrucar',
    'apenado',
    'mirarcurioso',
    'reirnervioso',
    'cantar',
    'saltito',
    'feliz'
]

handler.help = [
    'abrazar',
    'consolar',
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
    'pensarprofundo',
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
    'chocarpuños',
    'curioso',
    'olfatear',
    'mirar',
    'kiss',
    'kiss2',
    'cosquillas',
    'gritar',
    'frio',
    'jugar',
    'dibujar',
    'llamar',
    'aburrido',
    'dramatico',
    'cafe',
    'enojado',
    'bleh',
    'nope',
    'puchero',
    'correr',
    'triste',
    'asustado',
    'timido',
    'guiñar',
    'comer',
    'sonrojar',
    'presumir',
    'hablar',
    'estornudar',
    'enfermo',
    'limpiar',
    'vergüenza',
    'facepalm',
    'boop',
    'piggyback',
    'compartircomida',
    'regañar',
    'bromear',
    'inclinar',
    'girar',
    'posar',
    'flexionar',
    'puntitas',
    'picnic',
    'siesta',
    'acurrucar',
    'apenado',
    'mirarcurioso',
    'reirnervioso',
    'cantar',
    'saltito',
    'feliz'
]

handler.tags = ['juegos']
handler.menu = true

export default handler
