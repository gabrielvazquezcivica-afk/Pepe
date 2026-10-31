
const handler = {}

const API_URL = 'https://api-faa.my.id/faa/tts-legkap?text='

// Voces disponibles
const voces = [
    { id: 'nahida', nombre: '🌸 Nahida' },
    { id: 'nami', nombre: '🌊 Nami' },
    { id: 'ana', nombre: '👩 Ana' },
    { id: 'optimus_prime', nombre: '🤖 Optimus Prime' },
    { id: 'goku', nombre: '🔥 Goku' },
    { id: 'elon_musk', nombre: '🚀 Elon Musk' },
    { id: 'mickey_mouse', nombre: '🐭 Mickey Mouse' },
    { id: 'kendrick_lamar', nombre: '🎤 Kendrick Lamar' },
    { id: 'eminem', nombre: '🎧 Eminem' }
]

// Almacenar textos pendientes por usuario y chat
const pendientes = new Map()

function obtenerClave(m) {
    const chat = m.key.remoteJid
    const usuario = m.key.participant || m.sender || chat
    return `${chat}:${usuario}`
}

function obtenerTexto(m) {
    return m.textCommand || m.text || ''
}

async function consultarAPI(texto) {
    const url = API_URL + encodeURIComponent(texto)

    const respuesta = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        },
        signal: AbortSignal.timeout(60000)
    })

    if (!respuesta.ok) {
        throw new Error(`La API respondió con código ${respuesta.status}`)
    }

    return respuesta.json()
}

async function mostrarVoces(sock, m, texto, pagina = 0) {
    const clave = obtenerClave(m)

    pendientes.set(clave, {
        texto,
        pagina
    })

    const inicio = pagina * 3
    const opciones = voces.slice(inicio, inicio + 3)

    const botones = opciones.map(voz => ({
        buttonId: `.ttsvoice ${voz.id}`,
        buttonText: { displayText: voz.nombre },
        type: 1
    }))

    const fin = inicio + opciones.length

    await sock.sendMessage(m.chat, {
        text:
`╭─── ⋆⋅☆⋅⋆ ───╮
       🎙️ 𝐓𝐄𝐗𝐓𝐎 𝐀 𝐕𝐎𝐙
╰─── ⋆⋅☆⋅⋆ ───╯

> 📝 Texto: ${texto}

> 🎧 Selecciona la voz que quieres utilizar.
> 📄 Página: ${pagina + 1}/${Math.ceil(voces.length / 3)}

${fin < voces.length ? 'Escribe .ttsmas para ver más voces.' : 'Has llegado a la última página.'}`,
        footer: '🐸 PEPE BOT',
        buttons: botones,
        headerType: 1
    }, { quoted: m })
}

// Comando principal y paginación
handler.run = async (sock, m, args = []) => {
    const comando = m.command

    if (comando === 'ttsmas') {
        const clave = obtenerClave(m)
        const pendiente = pendientes.get(clave)

        if (!pendiente) {
            return m.reply('❌ Primero utiliza .tts seguido de un texto.')
        }

        const siguiente = pendiente.pagina + 1
        const maximo = Math.ceil(voces.length / 3) - 1

        if (siguiente > maximo) {
            return m.reply('❌ No hay más voces disponibles.')
        }

        return mostrarVoces(sock, m, pendiente.texto, siguiente)
    }

    const texto = args.join(' ').trim()

    if (!texto) {
        return m.reply(
            '❌ Escribe un texto para convertirlo en audio.\n\nEjemplo: .tts Hola, ¿cómo estás?'
        )
    }

    if (texto.length > 500) {
        return m.reply('❌ El texto es demasiado largo. Máximo 500 caracteres.')
    }

    await mostrarVoces(sock, m, texto, 0)
}

// Elegir una voz
handler.voice = async (sock, m, args = []) => {
    const clave = obtenerClave(m)
    const pendiente = pendientes.get(clave)

    if (!pendiente) {
        return m.reply('❌ No hay ningún texto pendiente. Usa .tts nuevamente.')
    }

    const modelo = args[0]?.toLowerCase()
    const voz = voces.find(v => v.id === modelo)

    if (!voz) {
        return m.reply('❌ Esa voz no está disponible.')
    }

    await m.reply(`⏳ Generando audio con ${voz.nombre}...`)

    try {
        const data = await consultarAPI(pendiente.texto)

        if (!data?.status || !Array.isArray(data.result)) {
            throw new Error('La API no devolvió resultados válidos.')
        }

        const resultado = data.result.find(item =>
            item.model === modelo &&
            item.url &&
            !item.error
        )

        if (!resultado) {
            throw new Error('La voz seleccionada no pudo generar el audio.')
        }

        await sock.sendMessage(m.chat, {
            audio: { url: resultado.url },
            mimetype: 'audio/wav',
            ptt: true,
            fileName: `PepeTTS-${modelo}.wav`
        }, { quoted: m })

        pendientes.delete(clave)

    } catch (error) {
        console.error('Error TTS:', error)

        await m.reply(
            `❌ No se pudo generar el audio con ${voz.nombre}.\nPrueba con otra voz.`
        )
    }
}

handler.command = ['tts', 'ttsmas', 'ttsvoice']
handler.help = ['tts <texto>', 'ttsmas']
handler.tags = ['herramientas']
handler.menu = true

// El index.js debe dirigir ttsvoice a handler.voice.
handler.handler = async (m, context) => {
    if (m.command === 'ttsvoice') {
        return handler.voice(
            context.sock,
            m,
            m.args || []
        )
    }

    return handler.run(
        context.sock,
        m,
        m.args || []
    )
}

export default handler
