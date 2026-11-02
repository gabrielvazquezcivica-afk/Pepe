
import fs from 'node:fs'
import path from 'node:path'

const handler = {}

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, 'cierres.json')

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
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

function convertirTiempo(valor) {
    const coincidencia = String(valor || '').match(/^(\d+)(s|m|h)$/i)

    if (!coincidencia) return null

    const cantidad = Number(coincidencia[1])
    const unidad = coincidencia[2].toLowerCase()

    if (cantidad <= 0) return null

    const multiplicador = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000
    }

    const tiempo = cantidad * multiplicador[unidad]

    if (!Number.isSafeInteger(tiempo)) return null

    return tiempo
}

async function reaccionar(sock, m, emoji) {
    try {
        await sock.sendMessage(m.chat, {
            react: {
                text: emoji,
                key: m.key
            }
        })
    } catch {}
}

handler.run = async (sock, m, args) => {
    const chat = m.key.remoteJid
    const accion = String(m.command || '').toLowerCase()

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
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
        return m.reply('> 🚫 Solamente los administradores pueden usar este comando.')
    }

    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const botInfo = buscar(participantes, [
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ])

    if (!esAdmin(botInfo)) {
        return m.reply('> ⚠️ Pepe Bot necesita ser administrador del grupo.')
    }

    const db = cargarDB()

    if (['open', 'abrir'].includes(accion)) {
        await reaccionar(sock, m, '⏳')

        try {
            await sock.groupSettingUpdate(chat, 'not_announcement')

            delete db[chat]
            guardarDB(db)

            await reaccionar(sock, m, '✅')

            return m.reply('> 🔓 Grupo abierto. Temporizador cancelado.')
        } catch {
            await reaccionar(sock, m, '❌')
            return m.reply('> ❌ No pude abrir el grupo.')
        }
    }

    if (!['close', 'cerrar'].includes(accion)) return

    const duracion = convertirTiempo(args[0])

    if (args.length && !duracion) {
        return m.reply('> ⚠️ Tiempo inválido. Usa: 30s, 10m o 2h.')
    }

    await reaccionar(sock, m, '⏳')

    try {
        await sock.groupSettingUpdate(chat, 'announcement')

        if (duracion) {
            db[chat] = {
                abrirEn: Date.now() + duracion
            }

            guardarDB(db)
        } else {
            delete db[chat]
            guardarDB(db)
        }

        await reaccionar(sock, m, '✅')

        const numeroAdmin = String(
            adminEjecutor.id || m.sender
        ).split('@')[0].split(':')[0]

        const tiempoTexto = duracion
            ? `\n> ⏱️ Se abrirá automáticamente en ${args[0]}.`
            : '\n> 🔒 Permanecerá cerrado hasta que un administrador lo abra.'

        return sock.sendMessage(chat, {
            text: `> 🔒 Grupo cerrado correctamente.${tiempoTexto}\n> 🛡️ Acción realizada por @${numeroAdmin}.`,
            mentions: [adminEjecutor.id || m.sender]
        }, { quoted: m })

    } catch {
        await reaccionar(sock, m, '❌')
        return m.reply('> ❌ No pude cerrar el grupo.')
    }
}

handler.command = ['cerrar', 'abrir']
handler.help = ['cerrar <tiempo>']
handler.tags = ['grupo']
handler.menu = true
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
