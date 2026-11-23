const handler = {}

const API_URL = 'https://api.stellarwa.xyz/sfw/interaction'
const API_KEY = 'api-xyjFx'

const interacciones = {
    abrazar: { api: 'hug', texto: (a, b) => `> 🤗 @${a} abrazó a @${b}`, reaccion: '🤗' },
    consolar: { api: 'comfort', texto: (a, b) => `> 💗 @${a} consoló a @${b}`, reaccion: '💗' },
    saludar: { api: 'wave', texto: (a, b) => `> 👋 @${a} saludó a @${b}`, reaccion: '👋' },
    acariciar: { api: 'pat', texto: (a, b) => `> @${a} acarició a @${b}`, reaccion: '🐱' },
    sonreir: { api: 'smile', texto: (a, b) => `> 😊 @${a} le sonrió a @${b}`, reaccion: '😊' },
    felicitar: { api: 'happy', texto: (a, b) => `> 🎉 @${a} felicitó a @${b}`, reaccion: '🎉' },
    chocar5: { api: 'highfive', texto: (a, b) => `> 🙌 @${a} chocó los cinco con @${b}`, reaccion: '🙌' },
    animar: { api: 'celebrate', texto: (a, b) => `> 🎉 @${a} animó a @${b}`, reaccion: '🎉' },
    bailar: { api: 'dance', texto: (a, b) => `> 💃 @${a} bailó con @${b}`, reaccion: '💃' },
    reir: { api: 'laugh', texto: (a, b) => `> 😂 @${a} se rio con @${b}`, reaccion: '😂' },
    llorar: { api: 'cry', texto: (a) => `> 😢 @${a} está llorando`, reaccion: '😢', solo: true },
    pensar: { api: 'think', texto: (a) => `> 🤔 @${a} se quedó pensando`, reaccion: '🤔', solo: true },
    pensarprofundo: { api: 'thinkhard', texto: (a) => `> 🧠 @${a} está pensando profundamente`, reaccion: '🧠', solo: true },
    dormir: { api: 'sleep', texto: (a) => `> 😴 @${a} se quedó dormido`, reaccion: '😴', solo: true },
    aplaudir: { api: 'clap', texto: (a, b) => `> 👏 @${a} está aplaudiendo a @${b}`, reaccion: '👏' },
    saltar: { api: 'jump', texto: (a) => `> @${a} está saltando`, reaccion: '🦘', solo: true },
    caminar: { api: 'walk', texto: (a) => `> @${a} está caminando`, reaccion: '🚶', solo: true },
    bostezar: { api: 'yawn', texto: (a) => `> @${a} está bostezando`, reaccion: '🥱', solo: true },
    estudiar: { api: 'study', texto: (a) => `> 📚 @${a} está estudiando`, reaccion: '📚', solo: true },
    cocinar: { api: 'cook', texto: (a) => `> 🍳 @${a} está cocinando`, reaccion: '🍳', solo: true },
    saludar2: { api: 'salute', texto: (a) => `> @${a} saludó`, reaccion: '🫡', solo: true },
    celebrar: { api: 'celebrate', texto: (a) => `> 🎊 @${a} está celebrando`, reaccion: '🎊', solo: true },
    proteger: { api: 'protect', texto: (a, b) => `> 🛡️ @${a} está protegiendo a @${b}`, reaccion: '🛡️' },
    disculparse: { api: 'apologize', texto: (a, b) => `> @${a} se disculpó con @${b}`, reaccion: '🙏' },
    chocarpuños: { api: 'fistbump', texto: (a, b) => `> @${a} chocó puños con @${b}`, reaccion: '👊' },
    curioso: { api: 'curious', texto: (a) => `> 🤨 @${a} tiene curiosidad`, reaccion: '🤨', solo: true },
    olfatear: { api: 'sniff', texto: (a) => `> 🐽 @${a} está olfateando`, reaccion: '🐽', solo: true },
    mirar: { api: 'stare', texto: (a, b) => `> 👀 @${a} se quedó mirando a @${b}`, reaccion: '👀' },
    kiss: { api: 'kiss', texto: (a, b) => `> 💋 @${a} le dio un beso a @${b}`, reaccion: '💋' },
    cosquillas: { api: 'tickle', texto: (a, b) => `> 😂 @${a} le hizo cosquillas a @${b}`, reaccion: '😂' },
    gritar: { api: 'scream', texto: (a) => `> 😱 @${a} está gritando`, reaccion: '😱', solo: true },
    frio: { api: 'cold', texto: (a) => `> 🥶 @${a} tiene frío`, reaccion: '🥶', solo: true },
    jugar: { api: 'gaming', texto: (a) => `> 🎮 @${a} está jugando`, reaccion: '🎮', solo: true },
    dibujar: { api: 'draw', texto: (a) => `> 🎨 @${a} está dibujando`, reaccion: '🎨', solo: true },
    llamar: { api: 'call', texto: (a) => `> 📞 @${a} está llamando`, reaccion: '📞', solo: true },
    aburrido: { api: 'bored', texto: (a) => `> 😐 @${a} está aburrido`, reaccion: '😐', solo: true },
    dramatico: { api: 'dramatic', texto: (a) => `> 🎭 @${a} está siendo dramático`, reaccion: '🎭', solo: true },
    cafe: { api: 'coffee', texto: (a) => `> ☕ @${a} está tomando café`, reaccion: '☕', solo: true },
    enojado: { api: 'angry', texto: (a) => `> 😠 @${a} está enojado`, reaccion: '😠', solo: true },
    bleh: { api: 'bleh', texto: (a) => `> 😛 @${a} sacó la lengua`, reaccion: '😛', solo: true },
    nope: { api: 'nope', texto: (a) => `> 🙅 @${a} dijo que no`, reaccion: '🙅', solo: true },
    puchero: { api: 'pout', texto: (a) => `> 🥺 @${a} está haciendo pucheros`, reaccion: '🥺', solo: true },
    correr: { api: 'run', texto: (a) => `> 🏃 @${a} está corriendo`, reaccion: '🏃', solo: true },
    triste: { api: 'sad', texto: (a) => `> 😔 @${a} está triste`, reaccion: '😔', solo: true },
    asustado: { api: 'scared', texto: (a) => `> 😨 @${a} está asustado`, reaccion: '😨', solo: true },
    timido: { api: 'shy', texto: (a) => `> 😊 @${a} está tímido`, reaccion: '😊', solo: true },
    guiñar: { api: 'wink', texto: (a) => `> 😉 @${a} guiñó un ojo`, reaccion: '😉', solo: true },
    comer: { api: 'eat', texto: (a) => `> 🍽️ @${a} está comiendo`, reaccion: '🍽️', solo: true },
    sonrojar: { api: 'blush', texto: (a) => `> 😊 @${a} se sonrojó`, reaccion: '😊', solo: true },
    presumir: { api: 'smug', texto: (a) => `> 😏 @${a} está presumiendo`, reaccion: '😏', solo: true },
    hablar: { api: 'talk', texto: (a) => `> 💬 @${a} está hablando`, reaccion: '💬', solo: true },
    estornudar: { api: 'sneeze', texto: (a) => `> 🤧 @${a} está estornudando`, reaccion: '🤧', solo: true },
    enfermo: { api: 'sick', texto: (a) => `> 🤒 @${a} no se siente bien`, reaccion: '🤒', solo: true },
    limpiar: { api: 'scrub', texto: (a) => `> 🧽 @${a} está limpiando`, reaccion: '🧽', solo: true },
    vergüenza: { api: 'cringe', texto: (a) => `> 😬 @${a} está avergonzado`, reaccion: '😬', solo: true },
    facepalm: { api: 'facepalm', texto: (a) => `> 🤦 @${a} hizo un facepalm`, reaccion: '🤦', solo: true },
    boop: { api: 'boop', texto: (a, b) => `> 👉 @${a} hizo boop a @${b}`, reaccion: '👉' },
    piggyback: { api: 'piggyback', texto: (a, b) => `> 🐸 @${a} lleva a @${b}`, reaccion: '🐸' },
    compartircomida: { api: 'sharefood', texto: (a, b) => `> 🍱 @${a} compartió comida con @${b}`, reaccion: '🍱' },
    regañar: { api: 'scold', texto: (a, b) => `> 😤 @${a} regañó a @${b}`, reaccion: '😤' },
    bromear: { api: 'tease', texto: (a, b) => `> 😜 @${a} bromeó con @${b}`, reaccion: '😜' },
    inclinar: { api: 'bow', texto: (a) => `> 🙇 @${a} hizo una reverencia`, reaccion: '🙇', solo: true },
    girar: { api: 'spin', texto: (a) => `> 🌀 @${a} está girando`, reaccion: '🌀', solo: true },
    posar: { api: 'pose', texto: (a) => `> 📸 @${a} está posando`, reaccion: '📸', solo: true },
    flexionar: { api: 'flex', texto: (a) => `> 💪 @${a} está presumiendo`, reaccion: '💪', solo: true },
    puntitas: { api: 'tiptoe', texto: (a) => `> 🤫 @${a} camina de puntitas`, reaccion: '🤫', solo: true },
    picnic: { api: 'picnic', texto: (a) => `> 🧺 @${a} está disfrutando un picnic`, reaccion: '🧺', solo: true },
    siesta: { api: 'snuggle', texto: (a, b) => `> 💤 @${a} está descansando con @${b}`, reaccion: '💤' },
    acurrucar: { api: 'cuddle', texto: (a, b) => `> 🧸 @${a} se acurrucó con @${b}`, reaccion: '🧸' },
    apenado: { api: 'blush', texto: (a) => `> 😊 @${a} está apenado`, reaccion: '😊', solo: true },
    mirarcurioso: { api: 'peek', texto: (a) => `> 👀 @${a} está mirando discretamente`, reaccion: '👀', solo: true },
    cantar: { api: 'sing', texto: (a) => `> 🎤 @${a} está cantando`, reaccion: '🎤', solo: true },
    saltito: { api: 'trip', texto: (a) => `> 🐸 @${a} dio un saltito`, reaccion: '🐸', solo: true },
    feliz: { api: 'happy', texto: (a) => `> 😄 @${a} está feliz`, reaccion: '😄', solo: true }
}

const individuales = Object.keys(interacciones).filter(
    comando => interacciones[comando].solo
)

handler.run = async (sock, m, args = []) => {
    const comando = String(m.command || '').toLowerCase()
    const accion = interacciones[comando]

    if (!accion) return

    try {
        const contexto = m.message?.extendedTextMessage?.contextInfo
        const menciones = contexto?.mentionedJid || m.mentionedJid || []
        const citado = m.quoted || null

        let persona1 =
            menciones[0] ||
            citado?.sender ||
            citado?.key?.participant ||
            citado?.key?.participantAlt ||
            null

        if (!persona1 && !accion.solo) {
            return m.reply(
                `> ❌ Menciona a alguien o responde a su mensaje.\n\n` +
                `> Ejemplo: .${comando} @usuario`
            )
        }

        const usuario = String(m.sender || '')
            .split('@')[0]
            .split(':')[0]

        const objetivo = persona1
            ? String(persona1).split('@')[0].split(':')[0]
            : usuario

        await sock.sendMessage(m.chat, {
            react: {
                text: '⏳',
                key: m.key
            }
        })

        const url = `${API_URL}?inter=${encodeURIComponent(accion.api)}&key=${encodeURIComponent(API_KEY)}`

        const respuesta = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: '*/*'
            }
        })

        if (!respuesta.ok) {
            const errorAPI = await respuesta.text()
            throw new Error(`HTTP ${respuesta.status}: ${errorAPI}`)
        }

        const contentType = respuesta.headers.get('content-type') || ''

        let media

        if (contentType.includes('json')) {
            const data = await respuesta.json()

            if (data.status === false) {
                throw new Error(data.message || 'La API rechazó la interacción')
            }

            const mediaUrl =
                data.result ||
                data.url ||
                data.video ||
                data.gif ||
                data.data?.url

            if (!mediaUrl) {
                throw new Error('La API no devolvió una URL multimedia')
            }

            media = { url: mediaUrl }
        } else {
            const buffer = Buffer.from(await respuesta.arrayBuffer())

            if (!buffer.length) {
                throw new Error('El contenido multimedia está vacío')
            }

            media = buffer
        }

        const caption = accion.solo
            ? accion.texto(usuario, usuario)
            : accion.texto(usuario, objetivo)

        await sock.sendMessage(m.chat, {
            video: media,
            gifPlayback: true,
            caption,
            mentions: persona1
                ? [m.sender, persona1]
                : [m.sender]
        }, {
            quoted: m
        })

        await sock.sendMessage(m.chat, {
            react: {
                text: accion.reaccion || '✅',
                key: m.key
            }
        })

    } catch (error) {
        console.error(`[INTERACCIONES] ${comando}:`, error)

        await sock.sendMessage(m.chat, {
            react: {
                text: '❌',
                key: m.key
            }
        })

        await m.reply(
            '> ❌ Ocurrió un error al realizar la interacción.'
        )
    }
}

handler.command = Object.keys(interacciones)
handler.help = Object.keys(interacciones)
handler.tags = ['anime']
handler.menu = true

export default handler