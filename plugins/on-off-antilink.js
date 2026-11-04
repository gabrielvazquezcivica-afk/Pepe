
import fs from 'node:fs'
import path from 'node:path'
import { sendButtons } from 'baileys-buttons'

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, antilink.json')

const handler = {}

function cargarDB() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true })
    }

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[ANTILINK] Error leyendo DB:', error)
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(DB_DIR, { recursive: true })

    const temporal = `${DB_FILE}.tmp`
    fs.writeFileSync(temporal, JSON.stringify(db, null, 2))
    fs.renameSync(temporal, DB_FILE)
}

function obtenerId(m) {
    return m.key?.participant || m.sender || m.key?.remoteJid
}

function normalizarId(id) {
    return String(id || '').split(':')[0]
}

function coincidenIds(a, b) {
    if (!a || !b) return false

    const idA = normalizarId(a)
    const idB = normalizarId(b)

    if (idA === idB) return true

    const numeroA = idA.replace(/\D/g, '')
    const numeroB = idB.replace(/\D/g, '')

    return numeroA.length > 5 && numeroA === numeroB
}

async function esAdmin(sock, m) {
    const chat = m.key?.remoteJid

    if (!chat?.endsWith('@g.us')) return false
    if (m.isAdmin === true) return true

    try {
        const metadata = await sock.groupMetadata(chat)
        const id = obtenerId(m)

        const participante = metadata.participants.find(p =>
            coincidenIds(p.id, id) ||
            coincidenIds(p.lid, id)
        )

        return Boolean(
            participante?.admin === 'admin' ||
            participante?.admin === 'superadmin'
        )
    } catch (error) {
        console.error('[ANTILINK] Error verificando admin:', error.message)
        return false
    }
}

async function botEsAdmin(sock, chat, metadata) {
    try {
        const botIds = [
            sock.user?.id,
            sock.user?.lid
        ].filter(Boolean)

        const participante = metadata.participants.find(p =>
            botIds.some(id =>
                coincidenIds(p.id, id) ||
                coincidenIds(p.lid, id)
            )
        )

        return Boolean(
            participante?.admin === 'admin' ||
            participante?.admin === 'superadmin'
        )
    } catch {
        return false
    }
}

function contieneEnlace(texto) {
    if (!texto || typeof texto !== 'string') return false

    const regex = /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i

    return regex.test(texto)
}

async function mostrarMenu(sock, m) {
    const chat = m.key.remoteJid
    const db = cargarDB()
    const activo = db[chat] === true

    const texto = `╭━━━━━━━━━━━━━━━━━━╮
┃ 🛡️ *SISTEMA ANTILINK*
┃ 🐸 *PEPE BOT*
╰━━━━━━━━━━━━━━━━━━╯

📌 *Configuración del grupo*

🔰 Estado: ${activo ? '🟢 ACTIVADO' : '🔴 DESACTIVADO'}

${activo
    ? '🚫 Los miembros normales no pueden enviar enlaces.'
    : '🔓 Los miembros pueden enviar enlaces.'}

👮 Los administradores siempre podrán compartir enlaces.

━━━━━━━━━━━━━━━━━━
Selecciona una opción:`

    try {
        const resultado = await sendButtons(sock, chat, {
            title: '🛡️ ANTILINK',
            text: texto,
            footer: '🐸 PEPE BOT',
            buttons: [
                {
                    id: '.antilink_on',
                    displayText: '🟢 Activar'
                },
                {
                    id: '.antilink_off',
                    displayText: '🔴 Desactivar'
                }
            ],
            quoted: m
        })

        return resultado
    } catch (error) {
        console.error('[ANTILINK MENU] Error:', error.message)
        return m.reply('❌ No se pudo mostrar el menú Antilink.')
    }
}

async function cambiarEstado(sock, m, estado) {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
    }

    if (!(await esAdmin(sock, m))) {
        return m.reply('> ⚠️ Solamente los administradores pueden modificar el Antilink.')
    }

    const db = cargarDB()

    if (db[chat] === estado) {
        return m.reply(
            estado
                ? '> ⚠️ El Antilink ya está activado.'
                : '> ⚠️ El Antilink ya está desactivado.'
        )
    }

    db[chat] = estado
    guardarDB(db)

    return m.reply(
        estado
            ? '> 🟢 *ANTILINK ACTIVADO*\n\n> 🚫 Los miembros que no sean administradores no podrán enviar enlaces.'
            : '> 🔴 *ANTILINK DESACTIVADO*\n\n> 🔓 Ahora los miembros pueden enviar enlaces.'
    )
}

// Menú y comandos
handler.run = async (sock, m) => {
    const comando = (
        m.command ||
        m.textCommand?.split(/\s+/)[0]?.replace(/^[.!/#]+/, '') ||
        ''
    ).toLowerCase()

    switch (comando) {
        case 'antilink_on':
            return cambiarEstado(sock, m, true)

        case 'antilink_off':
            return cambiarEstado(sock, m, false)

        default:
            if (!m.key.remoteJid?.endsWith('@g.us')) {
                return m.reply('> ❌ Este comando solamente funciona en grupos.')
            }

            if (!(await esAdmin(sock, m))) {
                return m.reply('> ⚠️ Solamente los administradores pueden abrir este menú.')
            }

            return mostrarMenu(sock, m)
    }
}

// Detector global de enlaces
handler.all = async (sock, m) => {
    const chat = m.key?.remoteJid

    if (!chat?.endsWith('@g.us')) return
    if (m.fromMe || m.key?.fromMe) return

    const db = cargarDB()

    if (db[chat] !== true) return

    const texto = m.text || ''
    if (!contieneEnlace(texto)) return

    const metadata = await sock.groupMetadata(chat).catch(() => null)
    if (!metadata?.participants) return

    const id = obtenerId(m)

    // Los administradores pueden enviar enlaces
    const participante = metadata.participants.find(p =>
        coincidenIds(p.id, id) ||
        coincidenIds(p.lid, id)
    )

    if (
        participante?.admin === 'admin' ||
        participante?.admin === 'superadmin'
    ) return

    // El bot necesita ser administrador para eliminar mensajes
    if (!(await botEsAdmin(sock, chat, metadata))) return

    try {
        await sock.sendMessage(chat, {
            delete: m.key
        })

        await sock.sendMessage(chat, {
            text: '> ⚠️ *SISTEMA ANTILINK*\n\n> 🚫 No puedes enviar enlaces en este grupo.\n> 👮 Respeta las reglas del grupo.',
            contextInfo: {
                isForwarded: true,
                forwardingScore: 1
            }
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[ANTILINK] Error eliminando enlace:', error.message)
    }
}

handler.command = [
    'antilink',
    'antilink_on',
    'antilink_off'
]

handler.help = ['antilink']
handler.tags = ['on-off']
handler.menu = true

export default handler
