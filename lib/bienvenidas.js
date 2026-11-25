
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.resolve('./database/bienvenidas.json')
const AUDIO_DIR = path.resolve('./database/audios')

const DEFAULT_WELCOME_AUDIO = 'https://files.catbox.moe/5yw8fm.mp3'
const DEFAULT_BYE_AUDIO = 'https://files.catbox.moe/swqi7e.mp3'

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
fs.mkdirSync(AUDIO_DIR, { recursive: true })

function cargarDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return {}

        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[BIENVENIDAS] Error leyendo DB:', error)
        return {}
    }
}

function normalizarId(id) {
    return String(id || '')
        .replace(/:\d+@/, '@')
        .trim()
        .toLowerCase()
}

function obtenerIds(participante) {
    if (typeof participante === 'string') {
        return [normalizarId(participante)]
    }

    if (!participante) return []

    return [
        participante.id,
        participante.jid,
        participante.lid,
        participante.phoneNumber
    ]
        .filter(Boolean)
        .map(normalizarId)
}

function obtenerTexto(tipo, usuario, grupo, cantidad, personalizado) {
    const predeterminado = tipo === 'welcome'
        ? [
            '> 🐸 ¡Bienvenido/a @user a @group!',
            '> 🎉 Ahora somos @count integrantes.',
            '> ¡Esperamos que disfrutes tu estancia!'
        ].join('\n')
        : [
            '> 👋 ¡Hasta pronto @user!',
            '> 🚪 Ha salido de @group.',
            '> Ahora somos @count integrantes.'
        ].join('\n')

    return (personalizado || predeterminado)
        .replace(/@user/g, `@${usuario.split('@')[0]}`)
        .replace(/@group/g, grupo)
        .replace(/@count/g, String(cantidad))
}

async function obtenerImagen(sock, usuario, chat) {
    const objetivos = [
        usuario,
        chat,
        sock.user?.id
    ]

    for (const objetivo of objetivos) {
        if (!objetivo) continue

        try {
            const foto = await sock.profilePictureUrl(objetivo, 'image')
            if (foto) return foto
        } catch {}
    }

    return null
}

function obtenerRutaAudio(origen) {
    if (!origen) return null

    if (/^https?:\/\//i.test(origen)) {
        return origen
    }

    if (path.isAbsolute(origen)) {
        return origen
    }

    return path.resolve(AUDIO_DIR, origen)
}

async function enviarAudio(sock, chat, personalizado, predeterminado) {
    try {
        const origen = personalizado || predeterminado
        if (!origen) return

        const ruta = obtenerRutaAudio(origen)

        if (/^https?:\/\//i.test(ruta)) {
            await sock.sendMessage(chat, {
                audio: { url: ruta },
                mimetype: 'audio/mpeg',
                ptt: false
            })

            return
        }

        if (!fs.existsSync(ruta)) {
            console.log('[BIENVENIDAS] Audio no encontrado:', ruta)
            return
        }

        await sock.sendMessage(chat, {
            audio: fs.readFileSync(ruta),
            mimetype: 'audio/mpeg',
            ptt: false
        })

    } catch (error) {
        console.error('[BIENVENIDAS] Error enviando audio:', error)
    }
}

const socketsInstalados = new WeakSet()

export function instalarBienvenidas(sock) {
    if (!sock?.ev || socketsInstalados.has(sock)) return

    socketsInstalados.add(sock)

    let preparando = false

    async function prepararGrupos() {
        if (preparando) return

        preparando = true

        try {
            console.log('[BIENVENIDAS] Sincronizando grupos...')

            const grupos = await sock.groupFetchAllParticipating()

            console.log(
                `[BIENVENIDAS] Activo en ${Object.keys(grupos || {}).length} grupos.`
            )

        } catch (error) {
            console.error(
                '[BIENVENIDAS] Error sincronizando grupos:',
                error
            )
        } finally {
            preparando = false
        }
    }

    async function procesarEvento(evento) {
        try {
            const {
                id: chat,
                participants,
                action
            } = evento || {}

            console.log(
                `[BIENVENIDAS] Evento recibido: ${action || 'desconocido'} | ${chat || 'sin grupo'}`
            )

            if (!chat || !Array.isArray(participants)) return

            if (!['add', 'remove'].includes(action)) return

            const db = cargarDB()
            const configuracion = db[chat] || {}

            // Comprobar si el sistema está activado.
            if (action === 'add' && configuracion.welcome !== true) return
            if (action === 'remove' && configuracion.bye !== true) return

            let metadata

            try {
                metadata = await sock.groupMetadata(chat)
            } catch (error) {
                console.error(
                    '[BIENVENIDAS] Error obteniendo grupo:',
                    error
                )
                return
            }

            const grupo = metadata.subject || 'este grupo'
            const cantidad = metadata.participants?.length || 0

            for (const participante of participants) {
                const ids = obtenerIds(participante)

                const usuario = ids.find(id =>
                    id.includes('@')
                )

                if (!usuario) {
                    console.log(
                        '[BIENVENIDAS] No se encontró el ID del participante.'
                    )
                    continue
                }

                const tipo = action === 'add'
                    ? 'welcome'
                    : 'bye'

                const personalizado = tipo === 'welcome'
                    ? configuracion.welcomeMessage
                    : configuracion.byeMessage

                const texto = obtenerTexto(
                    tipo,
                    usuario,
                    grupo,
                    cantidad,
                    personalizado
                )

                // Obtener foto de perfil.
                const imagen = await obtenerImagen(
                    sock,
                    usuario,
                    chat
                )

                // Enviar aviso.
                if (imagen) {
                    await sock.sendMessage(chat, {
                        image: { url: imagen },
                        caption: texto,
                        mentions: [usuario]
                    })
                } else {
                    await sock.sendMessage(chat, {
                        text: texto,
                        mentions: [usuario]
                    })
                }

                // Seleccionar audio personalizado o predeterminado.
                const audioPersonalizado = tipo === 'welcome'
                    ? configuracion.welcomeAudio ||
                      configuracion.welcomeAudioFile
                    : configuracion.byeAudio ||
                      configuracion.byeAudioFile

                const audioPredeterminado = tipo === 'welcome'
                    ? DEFAULT_WELCOME_AUDIO
                    : DEFAULT_BYE_AUDIO

                await enviarAudio(
                    sock,
                    chat,
                    audioPersonalizado,
                    audioPredeterminado
                )

                console.log(
                    `[BIENVENIDAS] Aviso enviado: ${tipo} | ${grupo}`
                )
            }

        } catch (error) {
            console.error(
                '[BIENVENIDAS] Error procesando evento:',
                error
            )
        }
    }

    // Detectar entradas y salidas.
    sock.ev.on(
        'group-participants.update',
        procesarEvento
    )

    // Sincronizar al conectar y al reconectar.
    sock.ev.on('connection.update', update => {
        if (update.connection === 'open') {
            prepararGrupos()
        }
    })

    if (sock.user?.id) {
        prepararGrupos()
    }

    console.log('[BIENVENIDAS] Listener instalado.')
}
