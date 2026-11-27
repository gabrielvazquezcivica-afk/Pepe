
import fs from 'node:fs'
import path from 'node:path'

const handler = {}

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, 'marry.json')

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
}

function cargarDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({
                matrimonios: {},
                pendientes: {}
            }, null, 2))
        }

        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))

        return {
            matrimonios: db.matrimonios || {},
            pendientes: db.pendientes || {}
        }
    } catch {
        return {
            matrimonios: {},
            pendientes: {}
        }
    }
}

function guardarDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

function limpiarJid(jid) {
    return jid?.split(':')[0] || jid
}

function mencionar(jid) {
    return `@${jid.split('@')[0]}`
}

function buscarPareja(db, jid) {
    jid = limpiarJid(jid)

    for (const [persona, pareja] of Object.entries(db.matrimonios)) {
        if (limpiarJid(persona) === jid) return pareja
        if (limpiarJid(pareja) === jid) return persona
    }

    return null
}

function obtenerObjetivo(m) {
    const mencionados =
        m.mentionedJid ||
        m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
        []

    if (mencionados.length) return mencionados[0]

    return (
        m.quoted?.sender ||
        m.message?.extendedTextMessage?.contextInfo?.participant ||
        null
    )
}

handler.run = async (sock, m, args = []) => {
    const comando = (m.command || '').toLowerCase()
    const usuario = limpiarJid(m.sender)
    const db = cargarDB()

    // PROPUESTA DE MATRIMONIO
    if (comando === 'marry' || comando === 'casar') {
        const objetivo = obtenerObjetivo(m)

        if (!objetivo) {
            return m.reply(
                '> 💍 Debes mencionar o responder al mensaje de la persona con la que quieres casarte.'
            )
        }

        const pareja = limpiarJid(objetivo)

        if (usuario === pareja) {
            return m.reply('> ❌ No puedes casarte contigo mismo.')
        }

        const matrimonioUsuario = buscarPareja(db, usuario)
        const matrimonioObjetivo = buscarPareja(db, pareja)

        if (matrimonioUsuario) {
            return m.reply(
                `> 💍 Ya estás casado con ${mencionar(matrimonioUsuario)}.`,
                { mentions: [matrimonioUsuario] }
            )
        }

        if (matrimonioObjetivo) {
            return m.reply(
                `> 💍 Esta persona ya está casada con ${mencionar(matrimonioObjetivo)}.`,
                { mentions: [matrimonioObjetivo] }
            )
        }

        if (db.pendientes[pareja]) {
            const pendiente = db.pendientes[pareja]

            return m.reply(
                `> ⏳ Esta persona ya tiene una propuesta pendiente de ${mencionar(pendiente.de)}.`,
                { mentions: [pendiente.de] }
            )
        }

        db.pendientes[pareja] = {
            de: usuario,
            chat: m.chat
        }

        guardarDB(db)

        return sock.sendMessage(m.chat, {
            text:
                `> 💍 *PROPUESTA DE MATRIMONIO* 💍\n\n` +
                `> ❤️ ${mencionar(usuario)} quiere casarse contigo, ${mencionar(pareja)}.\n\n` +
                `> 💌 ¿Aceptas la propuesta?\n\n` +
                `> ✅ Escribe .aceptarmarry\n` +
                `> ❌ Escribe .rechazarmarry`,
            mentions: [usuario, pareja]
        }, { quoted: m })
    }

    // ACEPTAR MATRIMONIO
    if (comando === 'aceptarmarry') {
        const propuesta = db.pendientes[usuario]

        if (!propuesta) {
            return m.reply('> ❌ No tienes ninguna propuesta de matrimonio pendiente.')
        }

        const solicitante = limpiarJid(propuesta.de)

        if (buscarPareja(db, usuario) || buscarPareja(db, solicitante)) {
            delete db.pendientes[usuario]
            guardarDB(db)

            return m.reply(
                '> ❌ No se puede completar el matrimonio porque una de las personas ya está casada.'
            )
        }

        db.matrimonios[solicitante] = usuario
        delete db.pendientes[usuario]

        guardarDB(db)

        return sock.sendMessage(m.chat, {
            text:
                `> 💍 *¡MATRIMONIO CONFIRMADO!* 💍\n\n` +
                `> ❤️ ${mencionar(solicitante)} y ${mencionar(usuario)} ahora están casados.\n\n` +
                `> 🐸 ¡Que viva el amor!`,
            mentions: [solicitante, usuario]
        }, { quoted: m })
    }

    // RECHAZAR MATRIMONIO
    if (comando === 'rechazarmarry') {
        const propuesta = db.pendientes[usuario]

        if (!propuesta) {
            return m.reply('> ❌ No tienes ninguna propuesta de matrimonio pendiente.')
        }

        delete db.pendientes[usuario]
        guardarDB(db)

        return sock.sendMessage(m.chat, {
            text:
                `> 💔 ${mencionar(usuario)} ha rechazado la propuesta de matrimonio de ${mencionar(propuesta.de)}.`,
            mentions: [usuario, propuesta.de]
        }, { quoted: m })
    }
}

handler.command = [
    'marry',
    'casar',
    'aceptarmarry',
    'rechazarmarry'
]

handler.help = ['marry @usuario']
handler.tags = ['juegos']
handler.menu = true

export default handler
