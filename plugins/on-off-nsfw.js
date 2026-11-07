
import fs from 'node:fs'
import path from 'node:path'
import { sendButtons } from 'baileys-buttons'

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, 'nsfw.json')

const handler = {}

function cargarDB() {
    fs.mkdirSync(DB_DIR, { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(DB_DIR, { recursive: true })
    const tmp = `${DB_FILE}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
    fs.renameSync(tmp, DB_FILE)
}

async function esAdmin(sock, m) {
    if (!m.isGroup) return false
    if (m.isAdmin === true) return true

    try {
        const metadata = await sock.groupMetadata(m.chat)
        const id = m.sender

        const normalizar = jid =>
            String(jid || '').replace(/:\d+@/, '@')

        const participante = metadata.participants.find(p =>
            [p.id, p.jid, p.lid].filter(Boolean)
                .some(jid => normalizar(jid) === normalizar(id))
        )

        return Boolean(
            participante?.admin === 'admin' ||
            participante?.admin === 'superadmin'
        )
    } catch (error) {
        console.error('[NSFW] Error:', error.message)
        return false
    }
}

function estado(chat) {
    return cargarDB()[chat]?.bloqueado ?? true
}

async function panel(sock, m) {
    const bloqueado = estado(m.chat)

    await sendButtons(sock, m.chat, {
        title: '🐸 PEPE BOT • CONTROL NSFW',
        text: `╭━━━━━━━━━━━━━━━━━━╮
┃ ⚙️ *CONFIGURACIÓN NSFW*
╰━━━━━━━━━━━━━━━━━━╯

Estado: ${bloqueado ? '🔒 BLOQUEADO' : '🔓 PERMITIDO'}

${bloqueado
    ? 'Los comandos +18 están bloqueados para todos los miembros.'
    : 'El bloqueo está desactivado para los comandos clasificados como +18.'}

👑 Solo administradores pueden cambiarlo.`,
        footer: '🐸 PEPE BOT',
        buttons: [
            {
                id: '.nsfw-on',
                displayText: '🔒 Bloquear +18'
            },
            {
                id: '.nsfw-off',
                displayText: '🔓 Permitir +18'
            }
        ],
        quoted: m
    })
}

async function cambiar(sock, m, bloqueado) {
    if (!m.isGroup) {
        return m.reply('❌ Solo funciona en grupos.')
    }

    if (!(await esAdmin(sock, m))) {
        return m.reply('⚠️ Solo los administradores pueden cambiar esta configuración.')
    }

    const db = cargarDB()

    db[m.chat] = {
        bloqueado,
        actualizado: Date.now()
    }

    guardarDB(db)

    await panel(sock, m)
}

handler.run = async (sock, m) => {
    const comando = (
        m.command ||
        m.textCommand?.split(/\s+/)[0]?.replace(/^[.!/#]+/, '') ||
        ''
    ).toLowerCase()

    if (comando === 'nsfw-on') {
        return cambiar(sock, m, true)
    }

    if (comando === 'nsfw-off') {
        return cambiar(sock, m, false)
    }

    return panel(sock, m)
}

handler.command = ['nsfw', 'nsfw-on', 'nsfw-off']
handler.help = ['nsfw']
handler.tags = ['nsfw']
handler.menu = true

export default handler

