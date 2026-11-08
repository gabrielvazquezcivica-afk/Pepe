import fs from 'fs'
import path from 'path'
import { sendButtons } from 'baileys-buttons'

const DB_FILE = path.resolve('./database/nsfw.json')

function cargarDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

async function esAdmin(sock, chat, sender) {
    const metadata = await sock.groupMetadata(chat)

    const normalizar = jid =>
        String(jid || '').replace(/:\d+@/, '@')

    const ids = [sender, globalThis?.senderLid]
        .filter(Boolean)
        .map(normalizar)

    const participante = metadata.participants.find(p =>
        [p.id, p.jid, p.lid]
            .filter(Boolean)
            .some(id => ids.includes(normalizar(id)))
    )

    return ['admin', 'superadmin'].includes(participante?.admin)
}

const handler = {}

handler.run = async (sock, m, args = []) => {
    if (!m.isGroup) {
        return m.reply('> ❌ Este comando solo funciona en grupos.')
    }

    if (!(await esAdmin(sock, m.chat, m.sender))) {
        return m.reply('> ⛔ Solo los administradores pueden usar este comando.')
    }

    const opcion = args[0]?.toLowerCase()
    const db = cargarDB()

    // Mostrar panel
    if (!['on', 'off'].includes(opcion)) {
        const bloqueado = db[m.chat]?.bloqueado !== false
        const activo = !bloqueado

        return sendButtons(sock, m.chat, {
            title: '🐸 PEPE BOT',
            text: `╭━━━━━━━━━━━━━━━━━━╮
┃ 🔞 *CONTROL NSFW*
┃ 🐸 *PEPE BOT*
╰━━━━━━━━━━━━━━━━━━╯

📌 *Estado actual:* ${activo ? '🟢 ACTIVADO' : '🔴 DESACTIVADO'}

${activo
    ? '🔓 Los comandos NSFW están permitidos en este grupo.'
    : '🔒 Los comandos NSFW están bloqueados en este grupo.'}

━━━━━━━━━━━━━━━━━━
Selecciona una opción:`,
            footer: '🐸 PEPE BOT',
            buttons: [
                {
                    id: '.nsfw on',
                    displayText: '🟢 Encender'
                },
                {
                    id: '.nsfw off',
                    displayText: '🔴 Apagar'
                }
            ],
            quoted: m
        })
    }

    // Crear configuración si no existe
    db[m.chat] ??= {}

    // Guardar estado
    db[m.chat].bloqueado = opcion === 'off'
    db[m.chat].actualizado = Date.now()

    guardarDB(db)

    return m.reply(
        opcion === 'on'
            ? '> ✅ NSFW encendido. Los comandos están permitidos en este grupo.'
            : '> 🔒 NSFW apagado. Los comandos están bloqueados en este grupo.'
    )
}

handler.command = ['nsfw']
handler.help = ['nsfw']
handler.tags = ['on-off']
handler.group = true
handler.menu = true

export default handler