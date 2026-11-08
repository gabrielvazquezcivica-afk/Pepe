
import fs from 'node:fs'
import path from 'node:path'
import { sendButtons } from 'baileys-buttons'

const DB_FILE = path.resolve('./database/nsfw.json')

function cargarDB() {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}', 'utf8')
        return {}
    }

    try {
        const contenido = fs.readFileSync(DB_FILE, 'utf8')
        const db = JSON.parse(contenido || '{}')

        if (!db || typeof db !== 'object' || Array.isArray(db)) {
            throw new Error('Formato JSON incorrecto')
        }

        return db
    } catch (error) {
        console.error('[NSFW] Error leyendo la base de datos:', error)
        throw error
    }
}

function guardarDB(db) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })

    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(db, null, 2),
        'utf8'
    )
}

async function esAdmin(sock, chat, sender) {
    try {
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
    } catch (error) {
        console.error('[NSFW] Error comprobando administrador:', error)
        return false
    }
}

const handler = {}

handler.run = async (sock, m, args = []) => {
    if (!m.isGroup) {
        return m.reply('> ❌ Este comando solo funciona en grupos.')
    }

    if (!(await esAdmin(sock, m.chat, m.sender))) {
        return m.reply('> ⛔ Solo los administradores pueden usar este comando.')
    }

    let db

    try {
        db = cargarDB()
    } catch {
        return m.reply('> ❌ No se pudo leer la base de datos NSFW. Revisa el archivo JSON.')
    }

    const opcion = args[0]?.toLowerCase()

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

    // Crear configuración del grupo
    db[m.chat] ??= {}

    // Guardar estado
    db[m.chat].bloqueado = opcion === 'off'
    db[m.chat].actualizado = Date.now()

    try {
        guardarDB(db)
    } catch (error) {
        console.error('[NSFW] Error guardando configuración:', error)
        return m.reply('> ❌ No se pudo guardar la configuración NSFW.')
    }

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
