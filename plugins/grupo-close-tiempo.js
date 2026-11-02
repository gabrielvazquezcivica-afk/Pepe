import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_DIR = path.resolve(__dirname, '../database')
const DB_FILE = path.join(DB_DIR, 'cierres.json')

const cargarDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return {}
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

const guardarDB = db => {
    fs.mkdirSync(DB_DIR, { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@').trim()

const buscar = (participantes, identificadores = []) => {
    const ids = identificadores.filter(Boolean).map(normalizar)

    return participantes.find(p => {
        const idsParticipante = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizar)

        return idsParticipante.some(id => ids.includes(id))
    })
}

const convertirTiempo = texto => {
    const coincidencia = String(texto || '').match(/^(\d+)(s|m|h)$/i)

    if (!coincidencia) return null

    const cantidad = Number(coincidencia[1])
    const unidad = coincidencia[2].toLowerCase()

    if (cantidad <= 0) return null

    const multiplicador = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000
    }

    return cantidad * multiplicador[unidad]
}

const mostrarTiempo = milisegundos => {
    const segundos = Math.ceil(milisegundos / 1000)

    if (segundos < 60) return `${segundos} segundos`

    const minutos = Math.ceil(segundos / 60)

    if (minutos < 60) return `${minutos} minutos`

    const horas = Math.ceil(minutos / 60)
    return `${horas} horas`
}

const handler = {}

handler.run = async (sock, m, args) => {
    const chat = m.chat

    if (!m.isGroup) {
        return m.reply('> Este comando solo funciona en grupos.')
    }

    const duracion = convertirTiempo(args[0])

    if (!duracion) {
        return m.reply(
            '> Uso correcto:\n' +
            '> .cerrartemporal 30s\n' +
            '> .cerrartemporal 10m\n' +
            '> .cerrartemporal 2h'
        )
    }

    const metadata = await sock.groupMetadata(chat)
    const participantes = metadata.participants || []

    const usuario = buscar(participantes, [
        m.key?.participant,
        m.key?.participantAlt,
        m.sender,
        m.senderLid
    ])

    if (!['admin', 'superadmin'].includes(usuario?.admin)) {
        return m.reply('> Solo los administradores pueden usar este comando.')
    }

    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const bot = buscar(participantes, [
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ])

    if (!['admin', 'superadmin'].includes(bot?.admin)) {
        return m.reply('> Necesito ser administrador para cerrar el grupo.')
    }

    try {
        await sock.groupSettingUpdate(chat, 'announcement')

        const db = cargarDB()

        db[chat] = {
            abrirEn: Date.now() + duracion
        }

        guardarDB(db)

        return m.reply(
            `> 🔒 Grupo cerrado temporalmente.\n\n` +
            `> ⏱️ Tiempo: ${mostrarTiempo(duracion)}\n` +
            `> 🔓 Se abrirá automáticamente al terminar el tiempo.`
        )
    } catch {
        return m.reply('> No pude cerrar el grupo.')
    }
}

handler.command = ['cerrartemporal']
handler.help = ['cerrartemporal']
handler.tags = ['grupo']
handler.menu = true

export default handler