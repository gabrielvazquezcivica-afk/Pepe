
import fs from 'node:fs'
import path from 'node:path'
import { sendButtons } from 'baileys-buttons'

import { fileURLToPath } from 'node:url'

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
    try {
        fs.mkdirSync(DB_DIR, { recursive: true })

        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, '{}')
        }

        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(DB_DIR, { recursive: true })

    const temporal = `${DB_FILE}.tmp`
    fs.writeFileSync(temporal, JSON.stringify(db, null, 2))
    fs.renameSync(temporal, DB_FILE)
}

const sistema = async (sock, from, titulo = 'Pepe Bot 🐸') => {
    let nombreGrupo = 'Chat'
    let thumbnail = null

    try {
        if (from.endsWith('@g.us')) {
            const metadata = await sock.groupMetadata(from)
            nombreGrupo = metadata.subject || 'Grupo'

            try {
                const pp = await sock.profilePictureUrl(from, 'image')
                const res = await fetch(pp)

                if (res.ok) {
                    const buffer = await res.arrayBuffer()
                    thumbnail = Buffer.from(buffer)
                }
            } catch {}
        }
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
    const chat = m.key.remoteJid

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
    const db = cargarDB()
    const nombreGrupo = metadata.subject || 'Grupo'

    if (['on', 'activar', 'encender'].includes(accion)) {
        if (db[chat] === true) {
            return m.reply('> ⚠️ El Modo Admin ya está encendido.')
        }

        db[chat] = true
        guardarDB(db)

        const quoted = await sistema(
            sock,
            chat,
            '🔒 MODO ADMIN'
        )

        return sock.sendMessage(chat, {
            text: `> MODO ADMIN ACTIVADO`
        }, { quoted })
    }

    if (['off', 'desactivar', 'apagar'].includes(accion)) {
        if (db[chat] !== true) {
            return m.reply('> ⚠️ El Modo Admin ya está apagado.')
        }

        delete db[chat]
        guardarDB(db)

        const quoted = await sistema(
            sock,
            chat,
            '🔓 MODO ADMIN'
        )

        return sock.sendMessage(chat, {
            text: `> MODO ADMIN DESACTIVO`
        }, { quoted })
    }

    const activo = db[chat] === true

    return sendButtons(sock, chat, {
        title: '⚙️ MODO ADMIN',
        text: `🐸 *PEPE BOT*

🔐 *Configuración del grupo*

📌 Estado actual: ${activo ? '🟢 ACTIVADO' : '🔴 DESACTIVADO'}

${activo
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
