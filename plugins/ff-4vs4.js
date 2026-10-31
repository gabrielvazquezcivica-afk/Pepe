
import fs from 'node:fs'
import path from 'node:path'
import { sendButtons } from 'baileys-buttons'

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, '4vs4.json')

const MAX_JUGADORES = 4
const MAX_SUPLENTES = 2

const handler = {}

const PAISES = {
    mx: {
        nombre: 'México',
        zona: 'America/Mexico_City',
        aliases: ['mx', 'mexico', 'méxico']
    },
    ve: {
        nombre: 'Venezuela',
        zona: 'America/Caracas',
        aliases: ['ve', 'venezuela']
    },
    ec: {
        nombre: 'Ecuador',
        zona: 'America/Guayaquil',
        aliases: ['ec', 'ecuador']
    },
    ar: {
        nombre: 'Argentina',
        zona: 'America/Argentina/Buenos_Aires',
        aliases: ['ar', 'argentina']
    },
    co: {
        nombre: 'Colombia',
        zona: 'America/Bogota',
        aliases: ['co', 'colombia']
    }
}

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
        console.error('[FF 4VS4] Error leyendo base de datos:', error)
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
    return m.sender || m.key.participant || m.key.remoteJid
}

function obtenerNombre(m) {
    return m.pushName || 'Jugador'
}

function crearDatosLista(evento) {
    return {
        jugadores: [],
        suplentes: [],
        messageKey: null,
        evento,
        creada: Date.now()
    }
}

async function esAdmin(sock, m) {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) return false
    if (m.isAdmin === true) return true

    try {
        const metadata = await sock.groupMetadata(chat)
        const id = obtenerId(m)

        const participante = metadata.participants.find(p =>
            p.id === id || p.lid === id
        )

        return Boolean(
            participante?.admin === 'admin' ||
            participante?.admin === 'superadmin'
        )
    } catch (error) {
        console.error('[FF 4VS4] Error verificando administrador:', error.message)
        return false
    }
}

function obtenerPartesFecha(fecha, zona) {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: zona,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(fecha)

    return Object.fromEntries(
        partes.map(p => [p.type, p.value])
    )
}

function obtenerOffset(timestamp, zona) {
    const partes = obtenerPartesFecha(new Date(timestamp), zona)

    const horaLocalUTC = Date.UTC(
        Number(partes.year),
        Number(partes.month) - 1,
        Number(partes.day),
        Number(partes.hour),
        Number(partes.minute),
        Number(partes.second)
    )

    return horaLocalUTC - timestamp
}

function convertirHora(hora, minutos, periodo, zonaOrigen) {
    const ahora = new Date()
    const fechaActual = obtenerPartesFecha(ahora, zonaOrigen)

    let hora24 = hora % 12

    if (periodo === 'PM') hora24 += 12

    const fechaUTC = Date.UTC(
        Number(fechaActual.year),
        Number(fechaActual.month) - 1,
        Number(fechaActual.day),
        hora24,
        minutos,
        0
    )

    const offset = obtenerOffset(fechaUTC, zonaOrigen)

    return new Date(fechaUTC - offset)
}

function formatearHora(fecha, zona) {
    return new Intl.DateTimeFormat('es-MX', {
        timeZone: zona,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(fecha)
}

function formatearFecha(fecha, zona) {
    return new Intl.DateTimeFormat('es-MX', {
        timeZone: zona,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(fecha)
}

function obtenerEvento(args) {
    const texto = args.join(' ').trim()

    const coincidencia = texto.match(
        /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s+(.+)$/i
    )

    if (!coincidencia) return null

    const hora = Number(coincidencia[1])
    const minutos = Number(coincidencia[2] || 0)
    const periodo = coincidencia[3].toUpperCase()
    const paisTexto = coincidencia[4].trim().toLowerCase()

    if (hora < 1 || hora > 12 || minutos > 59) return null

    const pais = Object.values(PAISES).find(p =>
        p.aliases.includes(paisTexto)
    )

    if (!pais) return null

    const fecha = convertirHora(
        hora,
        minutos,
        periodo,
        pais.zona
    )

    return {
        horaOriginal: `${hora}:${String(minutos).padStart(2, '0')} ${periodo}`,
        paisOriginal: pais.nombre,
        zonaOriginal: pais.zona,
        timestamp: fecha.getTime()
    }
}

function mostrarHorarios(evento) {
    const fecha = new Date(evento.timestamp)

    let texto = `🕒 *HORARIO DEL VERSUS*

📍 Hora indicada: ${evento.horaOriginal}
🌎 País de referencia: ${evento.paisOriginal}

━━━━━━━━━━━━━━━━━━`

    for (const pais of Object.values(PAISES)) {
        texto += `\n🌐 *${pais.nombre}:* ${formatearHora(fecha, pais.zona)}`
        texto += `\n📅 ${formatearFecha(fecha, pais.zona)}`
    }

    return texto
}

function mostrarInstrucciones() {
    return `🔥 *PEPE BOT — FREE FIRE 4 VS 4*

📌 *CÓMO CREAR EL VERSUS*

Escribe el comando con la hora y el país:

*.4vs4 <hora> <país>*

Ejemplos:
• .4vs4 9 PM MX
• .4vs4 7 PM Colombia
• .4vs4 8:30 PM Venezuela

🌎 *PAÍSES DISPONIBLES*
🇲🇽 México (MX)
🇻🇪 Venezuela
🇪🇨 Ecuador
🇦🇷 Argentina
🇨🇴 Colombia

🕒 PEPE BOT convertirá automáticamente el horario a los otros países.

🏆 *INSCRIPCIONES*
4 jugadores principales y 2 suplentes.

🔒 *CÓMO CERRAR EL VERSUS*

El administrador debe escribir:
*.4vs4close*

━━━━━━━━━━━━━━━━━━
🐸 PEPE BOT • FREE FIRE`
}

function mostrarLista(lista) {
    const jugadores = lista.jugadores
        .map((j, i) => `┃ ${i + 1}. ${j.nombre}`)
        .join('\n')

    const suplentes = lista.suplentes
        .map((j, i) => `┃ ${i + 1}. ${j.nombre}`)
        .join('\n')

    return `╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🔥 *FREE FIRE 4 VS 4*
┃ 🐸 *PEPE BOT*
╰━━━━━━━━━━━━━━━━━━━━╯

${mostrarHorarios(lista.evento)}

╭━━━━━━ 🏆 ━━━━━━╮
┃ *ESCUADRA PRINCIPAL*
┃ ${lista.jugadores.length}/${MAX_JUGADORES}
╰━━━━━━━━━━━━━━━━━━
${jugadores || '┃ 🟢 Esperando jugadores'}

╭━━━━━━ 🔄 ━━━━━━╮
┃ *SUPLENTES*
┃ ${lista.suplentes.length}/${MAX_SUPLENTES}
╰━━━━━━━━━━━━━━━━━━
${suplentes || '┃ 💤 Sin suplentes'}

╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🎮 *SELECCIONA TU OPCIÓN*
╰━━━━━━━━━━━━━━━━━━━━╯`
}

async function borrarListaAnterior(sock, chat, key) {
    if (!key?.id) return false

    try {
        await sock.sendMessage(chat, {
            delete: {
                remoteJid: chat,
                fromMe: true,
                id: key.id
            }
        })

        return true
    } catch (error) {
        console.error('[FF 4VS4] Error borrando mensaje:', error.message)
        return false
    }
}

async function actualizarLista(sock, chat, lista, quoted) {
    await borrarListaAnterior(sock, chat, lista.messageKey)

    lista.messageKey = null

    const resultado = await sendButtons(sock, chat, {
        title: '🔥 FREE FIRE 4 VS 4',
        text: mostrarLista(lista),
        footer: '🐸 PEPE BOT • FREE FIRE',
        buttons: [
            {
                id: '.4vs4join',
                displayText: '🏆 Anotarse'
            },
            {
                id: '.4vs4leave',
                displayText: '🚪 Salir'
            },
            {
                id: '.4vs4sub',
                displayText: '🔄 Suplente'
            }
        ],
        quoted
    })

    const key = resultado?.key || resultado?.message?.key

    if (key?.id) {
        lista.messageKey = {
            id: key.id
        }
    } else {
        console.error('[FF 4VS4] No se recibió la clave del mensaje.')
    }

    const db = cargarDB()
    db[chat] = lista
    guardarDB(db)
}

async function iniciarLista(sock, m, args) {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
    }

    if (!(await esAdmin(sock, m))) {
        return m.reply('> ⚠️ Solamente los administradores pueden crear listas.')
    }

    if (!args.length) {
        return m.reply(mostrarInstrucciones())
    }

    const evento = obtenerEvento(args)

    if (!evento) {
        return m.reply(
            '> ❌ Formato incorrecto.\n\n> Ejemplo: .4vs4 9 PM MX\n\n> Países: MX, Venezuela, Ecuador, Argentina y Colombia.'
        )
    }

    const db = cargarDB()

    if (db[chat]) {
        return m.reply('> ⚠️ Ya existe un versus activo. Usa .4vs4close para cerrarlo.')
    }

    const lista = crearDatosLista(evento)

    db[chat] = lista
    guardarDB(db)

    await actualizarLista(sock, chat, lista, m)
}

async function anotarse(sock, m) {
    const chat = m.key.remoteJid
    const id = obtenerId(m)
    const db = cargarDB()
    const lista = db[chat]

    if (!lista) return m.reply('❌ No hay un versus activo.')

    if (lista.jugadores.some(j => j.id === id)) {
        return m.reply('⚠️ Ya estás anotado como jugador.')
    }

    if (lista.suplentes.some(j => j.id === id)) {
        return m.reply('⚠️ Ya estás anotado como suplente. Primero sal de la lista.')
    }

    if (lista.jugadores.length >= MAX_JUGADORES) {
        return m.reply('❌ La escuadra principal está completa.')
    }

    lista.jugadores.push({
        id,
        nombre: obtenerNombre(m)
    })

    await actualizarLista(sock, chat, lista, m)
}

async function salir(sock, m) {
    const chat = m.key.remoteJid
    const id = obtenerId(m)
    const db = cargarDB()
    const lista = db[chat]

    if (!lista) return m.reply('❌ No hay un versus activo.')

    const jugadoresAntes = lista.jugadores.length
    const suplentesAntes = lista.suplentes.length

    lista.jugadores = lista.jugadores.filter(j => j.id !== id)
    lista.suplentes = lista.suplentes.filter(j => j.id !== id)

    if (
        jugadoresAntes === lista.jugadores.length &&
        suplentesAntes === lista.suplentes.length
    ) {
        return m.reply('⚠️ No estás anotado en este versus.')
    }

    await actualizarLista(sock, chat, lista, m)
}

async function suplente(sock, m) {
    const chat = m.key.remoteJid
    const id = obtenerId(m)
    const db = cargarDB()
    const lista = db[chat]

    if (!lista) return m.reply('❌ No hay un versus activo.')

    if (lista.jugadores.some(j => j.id === id)) {
        return m.reply('⚠️ Ya estás anotado como jugador.')
    }

    if (lista.suplentes.some(j => j.id === id)) {
        return m.reply('⚠️ Ya estás anotado como suplente.')
    }

    if (lista.suplentes.length >= MAX_SUPLENTES) {
        return m.reply('❌ Los 2 espacios de suplentes están ocupados.')
    }

    lista.suplentes.push({
        id,
        nombre: obtenerNombre(m)
    })

    await actualizarLista(sock, chat, lista, m)
}

async function cerrar(sock, m) {
    const chat = m.key.remoteJid

    if (!chat?.endsWith('@g.us')) {
        return m.reply('> ❌ Este comando solamente funciona en grupos.')
    }

    if (!(await esAdmin(sock, m))) {
        return m.reply('> ⚠️ Solamente los administradores pueden cerrar el versus.')
    }

    const db = cargarDB()
    const lista = db[chat]

    if (!lista) {
        return m.reply('> ❌ No hay ningún versus activo.')
    }

    await borrarListaAnterior(sock, chat, lista.messageKey)

    delete db[chat]
    guardarDB(db)

    await m.reply('> ✅ El versus de Free Fire fue cerrado.')
}

handler.run = async (sock, m, args = []) => {
    const comando = (
        m.command ||
        m.textCommand?.split(/\s+/)[0]?.replace(/^[.!/#]+/, '') ||
        ''
    ).toLowerCase()

    switch (comando) {
        case '4vs4join':
            return anotarse(sock, m)

        case '4vs4leave':
            return salir(sock, m)

        case '4vs4sub':
            return suplente(sock, m)

        case '4vs4close':
            return cerrar(sock, m)

        default:
            return iniciarLista(sock, m, args)
    }
}

handler.command = [
    '4vs4',
    '4vs4join',
    '4vs4leave',
    '4vs4sub',
    '4vs4close'
]

handler.help = ['4vs4']
handler.tags = ['free fire']
handler.menu = true

export default handler
