
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendButtons } from 'baileys-buttons'

const BASE_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
)

const DB_DIR = path.join(BASE_DIR, 'database')
const DB_FILE = path.join(DB_DIR, 'modoadmin.json')

const handler = {}

const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@').trim()

const esAdmin = participante =>
    ['admin', 'superadmin'].includes(participante?.admin)

const buscar = (participantes, identificadores = []) => {
    const ids = identificadores.filter(Boolean).map(normalizar)

    return participantes.find(p => {
        const idsParticipante = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizar)

        return idsParticipante.some(id => ids.includes(id))
    })
}

function cargarDB() {
    fs.mkdirSync(DB_DIR, { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}', 'utf8')
    }

    try {
        const contenido = fs.readFileSync(DB_FILE, 'utf8')
        const db = contenido.trim() ? JSON.parse(contenido) : {}

        if (!db || typeof db !== 'object' || Array.isArray(db)) {
            throw new Error('Formato de base de datos inválido')
        }

        return db
    } catch (error) {
        console.error('[MODO ADMIN] Error leyendo JSON:', error)
        throw new Error('No se pudo leer modoadmin.json. No se modificó el archivo.')
    }
}

function guardarDB(db) {
    fs.mkdirSync(DB_DIR, { recursive: true })

    const temporal = `${DB_FILE}.tmp`

    try {
        fs.writeFileSync(
            temporal,
            JSON.stringify(db, null, 2),
            'utf8'
        )

        fs.renameSync(temporal, DB_FILE)

        const verificacion = JSON.parse(
            fs.readFileSync(DB_FILE, 'utf8')
        )

        if (JSON.stringify(verificacion) !== JSON.stringify(db)) {
            throw new Error('La verificación del archivo falló')
        }

        console.log('[MODO ADMIN] Base de datos guardada:', DB_FILE)

        return true
    } catch (error) {
        try {
            if (fs.existsSync(temporal)) {
                fs.unlinkSync(temporal)
            }
        } catch {}

        console.error('[MODO ADMIN] Error guardando:', error)
        throw error
    }
}

const sistema = async (sock, from, titulo = 'Pepe Bot 🐸') => {
    let nombreGrupo = 'Chat'
    let thumbnail = null

    try {
        const metadata = await sock.groupMetadata(from)
        nombreGrupo = metadata.subject || 'Grupo'

        try {
            const pp = await sock.profilePictureUrl(from, 'image')
            const res = await fetch(pp)

            if (res.ok) {
                thumbnail = Buffer.from(await res.arrayBuffer())
            }
        } catch {}
    } catch {}

    return {
        key: {
            fromMe: false,
            participant: '0@s.whatsapp.net',
            remoteJid: 'status@broadcast'
        },
        message: {
            extendedTextMessage: {
                text: titulo,
                title: 'Pepe Bot',
                description: nombreGrupo,
                jpegThumbnail: thumbnail,
                previewType: 0
            }
        }
    }
}

handler.run = async (sock, m, args = []) => {
    const chat = m.key?.remoteJid

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solo funciona en grupos.')
    }

    let metadata

    try {
        metadata = await sock.groupMetadata(chat)
    } catch {
        return m.reply('> ❌ No pude obtener la información del grupo.')
    }

    const participantes = metadata.participants || []

    const adminEjecutor = buscar(participantes, [
        m.key?.participant,
        m.key?.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ])

    if (!esAdmin(adminEjecutor)) {
        return m.reply('> 🚫 Solo los administradores pueden modificar el Modo Admin.')
    }

    const accion = String(args[0] || '').toLowerCase()

    let db

    try {
        db = cargarDB()
    } catch {
        return m.reply('> ❌ No pude leer la base de datos del Modo Admin. No se realizaron cambios.')
    }

    const activo = db[chat] === true

    if (['on', 'activar', 'encender'].includes(accion)) {
        if (activo) {
            return m.reply('> ⚠️ El Modo Admin ya está encendido.')
        }

        db[chat] = true

        try {
            guardarDB(db)
        } catch {
            return m.reply('> ❌ No se pudo guardar la activación del Modo Admin.')
        }

        return sock.sendMessage(chat, {
            text: '> 🔒 MODO ADMIN ACTIVADO\n\n> Solamente los administradores pueden utilizar los comandos.'
        }, { quoted: m })
    }

    if (['off', 'desactivar', 'apagar'].includes(accion)) {
        if (!activo) {
            return m.reply('> ⚠️ El Modo Admin ya está apagado.')
        }

        delete db[chat]

        try {
            guardarDB(db)

            const comprobacion = cargarDB()

            if (comprobacion[chat] === true) {
                throw new Error('El grupo continúa marcado como activo')
            }
        } catch (error) {
            console.error('[MODO ADMIN] Error al apagar:', error)
            return m.reply('> ❌ No se pudo confirmar el apagado del Modo Admin.')
        }

        return sock.sendMessage(chat, {
            text: '> 🔓 MODO ADMIN DESACTIVADO\n\n> Todos los miembros pueden volver a utilizar los comandos.'
        }, { quoted: m })
    }

    const estadoActual = cargarDB()
    const estaActivo = estadoActual[chat] === true

    return sendButtons(sock, chat, {
        title: '⚙️ MODO ADMIN',
        text: `🐸 *PEPE BOT*

🔐 *Configuración del grupo*

📌 Estado actual: ${estaActivo ? '🟢 ACTIVADO' : '🔴 DESACTIVADO'}

${estaActivo
    ? '👮 Solamente los administradores pueden utilizar los comandos.'
    : '🔓 Todos los miembros pueden utilizar los comandos.'}

━━━━━━━━━━━━━━━━━━
Selecciona una opción:`,
        footer: '🐸 PEPE BOT',
        buttons: [
            {
                id: '.modoadmin on',
                displayText: '🔒 Encender'
            },
            {
                id: '.modoadmin off',
                displayText: '🔓 Apagar'
            }
        ],
        quoted: m
    })
}

handler.command = ['modoadmin']
handler.help = ['modoadmin']
handler.tags = ['on-off']
handler.menu = true
handler.group = true
handler.admin = true

export default handler
