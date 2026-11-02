
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.resolve('./database/warns.json')
const MAX_WARNS = 3

function cargarDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return {}
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@').trim()

function buscar(participantes, identificadores = []) {
    const ids = identificadores.filter(Boolean).map(normalizar)

    return participantes.find(p => {
        const idsParticipante = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizar)

        return idsParticipante.some(id => ids.includes(id))
    })
}

function esAdmin(p) {
    return ['admin', 'superadmin'].includes(p?.admin)
}

function obtenerObjetivo(m) {
    const contexto =
        m.message?.extendedTextMessage?.contextInfo ||
        m.message?.imageMessage?.contextInfo ||
        m.message?.videoMessage?.contextInfo ||
        m.message?.documentMessage?.contextInfo ||
        {}

    const mencionado = contexto.mentionedJid?.[0]
    const citado = contexto.participant

    return mencionado || citado || null
}

async function comprobarPermisos(sock, m, metadata) {
    const participantes = metadata.participants || []

    const usuario = buscar(participantes, [
        m.key?.participant,
        m.key?.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ])

    if (!esAdmin(usuario)) {
        return { error: '> ✖️ Solo los administradores pueden usar este comando.' }
    }

    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const bot = buscar(participantes, [
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ])

    return { participantes, botAdmin: esAdmin(bot) }
}

const handler = {}

handler.run = async (sock, m, args) => {
    const comando = m.command
    const chat = m.chat

    if (!m.isGroup) {
        return m.reply('> ✖️ Este comando solo funciona en grupos.')
    }

    try {
        const metadata = await sock.groupMetadata(chat)
        const permisos = await comprobarPermisos(sock, m, metadata)

        if (permisos.error) return m.reply(permisos.error)

        const objetivo = obtenerObjetivo(m)

        if (comando === 'warnlist') {
            const db = cargarDB()
            const registros = db[chat] || {}

            const lista = Object.entries(registros)
                .filter(([jid, datos]) => datos.warns > 0)
                .sort((a, b) => b[1].warns - a[1].warns)

            if (!lista.length) {
                return m.reply('> ✅ No hay usuarios advertidos en este grupo.')
            }

            const texto = lista.map(([jid, datos], i) =>
                `${i + 1}. @${jid.split('@')[0]} — *${datos.warns}/${MAX_WARNS}*`
            ).join('\n')

            return sock.sendMessage(chat, {
                text: `⚠️ *LISTA DE ADVERTENCIAS*\n\n${texto}`,
                mentions: lista.map(([jid]) => jid)
            }, { quoted: m })
        }

        if (!objetivo) {
            return m.reply(
                '> ⚠️ Debes mencionar a un usuario o responder a uno de sus mensajes.'
            )
        }

        const participante = buscar(permisos.participantes, [objetivo])

        if (!participante) {
            return m.reply('> ✖️ No encontré al usuario en este grupo.')
        }

        const jid = participante.id

        if (normalizar(jid) === normalizar(m.sender)) {
            return m.reply('> ✖️ No puedes modificar tus propias advertencias.')
        }

        const botId = sock.user?.id || ''
        const botNumero = botId.split(':')[0].split('@')[0]
        const bot = buscar(permisos.participantes, [
            botId,
            sock.user?.lid,
            `${botNumero}@s.whatsapp.net`
        ])

        if (esAdmin(participante)) {
            return m.reply('> ✖️ No puedes advertir a un administrador.')
        }

        const db = cargarDB()
        if (!db[chat]) db[chat] = {}

        const registro = db[chat][jid] || { warns: 0 }

        if (comando === 'warn') {
            registro.warns++
            db[chat][jid] = registro
            guardarDB(db)

            if (registro.warns < MAX_WARNS) {
                return sock.sendMessage(chat, {
                    text:
                        `⚠️ *ADVERTENCIA*\n\n` +
                        `Usuario: @${jid.split('@')[0]}\n` +
                        `Advertencias: *${registro.warns}/${MAX_WARNS}*\n\n` +
                        `Al llegar a ${MAX_WARNS} advertencias será expulsado.`,
                    mentions: [jid]
                }, { quoted: m })
            }

            if (!esAdmin(bot)) {
                registro.warns = MAX_WARNS
                db[chat][jid] = registro
                guardarDB(db)

                return m.reply(
                    `> ⚠️ @${jid.split('@')[0]} llegó a ${MAX_WARNS} advertencias, pero necesito ser administrador para expulsarlo.`,
                    { mentions: [jid] }
                )
            }

            try {
                await sock.groupParticipantsUpdate(chat, [jid], 'remove')

                delete db[chat][jid]
                guardarDB(db)

                return sock.sendMessage(chat, {
                    text:
                        `🚫 *USUARIO EXPULSADO*\n\n` +
                        `@${jid.split('@')[0]} llegó a *${MAX_WARNS}/${MAX_WARNS} advertencias* y fue expulsado.`,
                    mentions: [jid]
                }, { quoted: m })
            } catch (error) {
                console.error('[WARN KICK]', error)

                return m.reply(
                    `> ⚠️ Llegó a ${MAX_WARNS} advertencias, pero no pude expulsarlo. Revisa mis permisos.`
                )
            }
        }

        if (comando === 'unwarn') {
            if (!db[chat][jid] || registro.warns <= 0) {
                return m.reply('> ✅ Este usuario no tiene advertencias.')
            }

            registro.warns--

            if (registro.warns === 0) {
                delete db[chat][jid]
            } else {
                db[chat][jid] = registro
            }

            guardarDB(db)

            return sock.sendMessage(chat, {
                text:
                    `✅ *ADVERTENCIA RETIRADA*\n\n` +
                    `Usuario: @${jid.split('@')[0]}\n` +
                    `Advertencias restantes: *${registro.warns}/${MAX_WARNS}*`,
                mentions: [jid]
            }, { quoted: m })
        }

    } catch (error) {
        console.error('[WARN SYSTEM]', error)
        return m.reply('> ✖️ Ocurrió un error al procesar las advertencias.')
    }
}

handler.command = ['warn', 'unwarn', 'warnlist']
handler.help = ['warn @usuario', 'unwarn @usuario', 'warnlist']
handler.tags = ['grupo']
handler.menu = true

export default handler
