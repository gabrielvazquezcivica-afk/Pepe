
import fs from 'node:fs'
import path from 'node:path'

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, 'rpg.json')

const handler = {}

function cargarDB() {
    fs.mkdirSync(DB_DIR, { recursive: true })

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '{}')
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (error) {
        console.error('[RPG] Error leyendo base de datos:', error)
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

async function enviarYEditar(sock, chat, textoInicial, textoFinal, quoted, menciones = []) {
    const enviado = await sock.sendMessage(
        chat,
        {
            text: textoInicial,
            mentions: menciones
        },
        { quoted }
    )

    if (!enviado?.key) return enviado

    await new Promise(resolve => setTimeout(resolve, 1500))

    return sock.sendMessage(chat, {
        text: textoFinal,
        mentions: menciones,
        edit: enviado.key
    })
}

async function registrar(sock, m, args) {
    const chat = m.key.remoteJid
    const id = obtenerId(m)
    const db = cargarDB()

    if (db[id]) {
        return m.reply('> ⚠️ Ya estás registrado en el RPG.')
    }

    if (!args.length) {
        return enviarYEditar(
            sock,
            chat,
            '> 📋 Revisando tu registro en la base de datos...',
            '> ❌ No estás registrado en el RPG.\n\n> 📝 Para registrarte utiliza:\n> .reg <nombre> <edad>\n\n> Ejemplo: .reg Gabo 18',
            m
        )
    }

    const edad = Number(args[args.length - 1])
    const nombre = args.slice(0, -1).join(' ').trim()

    if (!nombre || !Number.isInteger(edad) || edad < 1 || edad > 99) {
        return m.reply(
            '> ❌ Formato incorrecto.\n\n> Utiliza: .reg <nombre> <edad>\n> Ejemplo: .reg Gabo 18'
        )
    }

    const nombreLimpio = nombre.slice(0, 30)

    await enviarYEditar(
        sock,
        chat,
        `> 📋 Registrando a @${id.split('@')[0]} en la base de datos...`,
        `> ✅ ¡REGISTRO COMPLETADO!\n\n> 👤 Nombre: ${nombreLimpio}\n> 🎂 Edad: ${edad}\n> 🐸 Ya formas parte del RPG de PEPE BOT.\n\n> ¡Prepárate para comenzar tu aventura!`,
        m,
        [id]
    )

    db[id] = {
        id,
        nombre: nombreLimpio,
        edad,
        registrado: Date.now()
    }

    guardarDB(db)
}

async function quitarRegistro(sock, m) {
    const chat = m.key.remoteJid
    const id = obtenerId(m)
    const db = cargarDB()

    if (!db[id]) {
        return enviarYEditar(
            sock,
            chat,
            '> 📋 Revisando tu registro...',
            '> ❌ No tienes ningún registro en el RPG.',
            m
        )
    }

    const nombre = db[id].nombre || obtenerNombre(m)

    await enviarYEditar(
        sock,
        chat,
        `> 🗑️ Quitando a @${id.split('@')[0]} de la base de registro...`,
        `> ✅ REGISTRO ELIMINADO\n\n> 👤 Jugador: ${nombre}\n> 📂 Ha sido quitado de la base de datos del RPG.\n\n> 🐸 ¡Puedes volver a registrarte cuando quieras!`,
        m,
        [id]
    )

    delete db[id]
    guardarDB(db)
}

handler.run = async (sock, m, args = []) => {
    const comando = (
        m.command ||
        m.textCommand?.split(/\s+/)[0]?.replace(/^[.!/#]+/, '') ||
        ''
    ).toLowerCase()

    switch (comando) {
        case 'reg':
            return registrar(sock, m, args)

        case 'unreg':
            return quitarRegistro(sock, m)
    }
}

handler.command = ['reg', 'unreg']
handler.help = ['reg <nombre> <edad>', 'unreg']
handler.tags = ['rpg']
handler.menu = true

export default handler
