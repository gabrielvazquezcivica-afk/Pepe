
import fs from 'fs'
import path from 'path'
import { sendButtons } from 'baileys-buttons'

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, '4vs4.json')

const MAX_JUGADORES = 4
const MAX_SUPLENTES = 2

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
    } catch {
        return {}
    }
}

function guardarDB(db) {
    fs.mkdirSync(DB_DIR, { recursive: true })

    const temp = `${DB_FILE}.tmp`
    fs.writeFileSync(temp, JSON.stringify(db, null, 2))
    fs.renameSync(temp, DB_FILE)
}

function obtenerId(m) {
    return m.sender || m.key.participant || m.key.remoteJid
}

function obtenerNombre(m) {
    return m.pushName || 'Jugador'
}

function crearLista() {
    return {
        jugadores: [],
        suplentes: [],
        messageKey: null,
        creada: Date.now()
    }
}

function mostrarLista(lista) {
    const jugadores = lista.jugadores
        .map((j, i) => `${i + 1}. ${j.nombre}`)
        .join('\n')

    const suplentes = lista.suplentes
        .map((j, i) => `${i + 1}. ${j.nombre}`)
        .join('\n')

    return `🐸 *PEPE BOT — RETA 4VS4*

━━━━━━━━━━━━━━

⚽ *JUGADORES (${lista.jugadores.length}/${MAX_JUGADORES})*

${jugadores || 'ㅤVacantes disponibles'}

━━━━━━━━━━━━━━

🔄 *SUPLENTES (${lista.suplentes.length}/${MAX_SUPLENTES})*

${suplentes || 'ㅤSin suplentes'}

━━━━━━━━━━━━━━

📌 Selecciona una opción para participar.`
}

async function actualizarLista(sock, chat, lista, quoted) {
    if (lista.messageKey) {
        try {
            await sock.sendMessage(chat, {
                delete: lista.messageKey
            })
        } catch (error) {
            console.error('Error eliminando lista anterior:', error.message)
        }
    }

    const resultado = await sendButtons(sock, chat, {
        title: '🐸 PEPE BOT',
        text: mostrarLista(lista),
        footer: 'PEPE BOT • RETAS',
        buttons: [
            {
                id: '.4vs4join',
                displayText: '⚽ Anotarse'
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

    if (resultado?.key) {
        lista.messageKey = resultado.key
    }

    const db = cargarDB()
    db[chat] = lista
    guardarDB(db)
}

async function crearLista(sock, m) {
    const chat = m.key.remoteJid

    if (!chat.endsWith('@g.us')) {
        return m.reply('❌ Este comando solamente funciona en grupos.')
    }

    const db = cargarDB()

    if (db[chat]) {
        return m.reply('⚠️ Ya existe una lista 4VS4 en este grupo.')
    }

    const lista = crearLista()

    db[chat] = lista
    guardarDB(db)

    await actualizarLista(sock, chat, lista, m)
}

async function anotarse(sock, m) {
    const chat = m.key.remoteJid
    const id = obtenerId(m)
    const db = cargarDB()
    const lista = db[chat]

    if (!lista) {
        return m.reply('❌ No hay una lista 4VS4 activa.')
    }

    if (lista.jugadores.some(j => j.id === id)) {
        return m.reply('⚠️ Ya estás anotado como jugador.')
    }

    if (lista.suplentes.some(j => j.id === id)) {
        return m.reply('⚠️ Ya estás anotado como suplente.')
    }

    if (lista.jugadores.length >= MAX_JUGADORES) {
        return m.reply('❌ Los 4 lugares de jugadores están ocupados.')
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

    if (!lista) {
        return m.reply('❌ No hay una lista 4VS4 activa.')
    }

    const jugadoresAntes = lista.jugadores.length
    const suplentesAntes = lista.suplentes.length

    lista.jugadores = lista.jugadores.filter(j => j.id !== id)
    lista.suplentes = lista.suplentes.filter(j => j.id !== id)

    if (
        jugadoresAntes === lista.jugadores.length &&
        suplentesAntes === lista.suplentes.length
    ) {
        return m.reply('⚠️ No estás anotado en esta lista.')
    }

    await actualizarLista(sock, chat, lista, m)
}

async function suplente(sock, m) {
    const chat = m.key.remoteJid
    const id = obtenerId(m)
    const db = cargarDB()
    const lista = db[chat]

    if (!lista) {
        return m.reply('❌ No hay una lista 4VS4 activa.')
    }

    if (lista.jugadores.some(j => j.id === id)) {
        return m.reply('⚠️ Ya estás anotado como jugador.')
    }

    if (lista.suplentes.some(j => j.id === id)) {
        return m.reply('⚠️ Ya estás anotado como suplente.')
    }

    if (lista.suplentes.length >= MAX_SUPLENTES) {
        return m.reply('❌ Los 2 lugares de suplentes están ocupados.')
    }

    lista.suplentes.push({
        id,
        nombre: obtenerNombre(m)
    })

    await actualizarLista(sock, chat, lista, m)
}

async function cerrar(sock, m) {
    const chat = m.key.remoteJid

    if (!chat.endsWith('@g.us')) {
        return m.reply('❌ Este comando solamente funciona en grupos.')
    }

    if (!m.isOwner) {
        return m.reply('❌ Solamente el propietario del bot puede cerrar la lista.')
    }

    const db = cargarDB()
    const lista = db[chat]

    if (!lista) {
        return m.reply('❌ No hay ninguna lista activa.')
    }

    if (lista.messageKey) {
        try {
            await sock.sendMessage(chat, {
                delete: lista.messageKey
            })
        } catch {}
    }

    delete db[chat]
    guardarDB(db)

    await m.reply('✅ La lista 4VS4 fue cerrada.')
}

handler.run = async (sock, m, args) => {
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
            return crearLista(sock, m)
    }
}

handler.command = [
    '4vs4',
    '4vs4join',
    '4vs4leave',
    '4vs4sub',
    '4vs4close'
]

handler.help = [
    '4vs4',
    '4vs4close'
]

handler.tags = ['free fire']
handler.menu = true

export default handler
