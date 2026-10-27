import config from '../config.js'
import fs from 'node:fs'
import path from 'node:path'

const handler = {}

const ordenTags = [
    'informacion',
    'on-off',
    'frases',
    'grupo',
    'descargas',
    'buscador',
    'herramientas',
    'diversion',
    'rpg',
    'owner',
    'stickers',
    'nsfw'
]

const nombresTags = {
    informacion: '📌 INFORMACIÓN',
    'on-off': '🔌 ON / OFF',
    frases: '💬 FRASES',
    grupo: '👥 GRUPO',
    descargas: '📥 DESCARGAS',
    buscador: '🔎 BUSCADOR',
    herramientas: '🛠️ HERRAMIENTAS',
    diversion: '🎮 DIVERSIÓN',
    rpg: '⚔️ RPG',
    owner: '👑 OWNER',
    stickers: '🎨 STICKERS',
    nsfw: '🔞 NSFW',
    otros: '📂 OTROS'
}

const emojis = ['💚', '✨', '🐸', '🌟']

function normalizarTag(tag = 'otros') {
    const limpio = String(tag)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const alias = {
        info: 'informacion',
        grupos: 'grupo',
        group: 'grupo',
        groups: 'grupo',
        descarga: 'descargas',
        download: 'descargas',
        downloader: 'descargas',
        herramienta: 'herramientas',
        tools: 'herramientas',
        sticker: 'stickers',
        owners: 'owner'
    }

    return alias[limpio] || limpio
}

handler.run = async (sock, m) => {
    await sock.sendMessage(m.chat, {
        react: {
            text: '🐸',
            key: m.key
        }
    }).catch(() => {})

    const commandMap = m.commandMap

    if (!commandMap || typeof commandMap.values !== 'function') {
        return m.reply(
            '❌ No se pudo cargar la lista de comandos.\n' +
            'Comprueba que index.js incluya m.commandMap = plugins.'
        )
    }

    const prefijo = config.PREFIX || '.'
    const nombreBot = config.BOT_NAME || 'PEPE BOT'
    const nombreOwner = config.OWNER_NAME || 'Owner'

    const categorias = new Map()
    const comandosVistos = new Set()

    for (const entries of commandMap.values()) {
        const lista = Array.isArray(entries) ? entries : [entries]

        for (const entry of lista) {
            const plugin = entry?.handler || entry

            if (!plugin || plugin.menu === false) continue

            const tags = Array.isArray(plugin.tags)
                ? plugin.tags
                : [plugin.tags || 'otros']

            const tag = normalizarTag(tags[0] || 'otros')

            if (!categorias.has(tag)) {
                categorias.set(tag, {
                    tag,
                    comandos: []
                })
            }

            const help = plugin.help ?? plugin.command ?? []
            const listaComandos = Array.isArray(help) ? help : [help]

            for (const comando of listaComandos) {
                if (typeof comando !== 'string') continue

                const nombre = comando.trim()
                if (!nombre) continue

                const clave = `${tag}:${nombre.toLowerCase()}`

                if (comandosVistos.has(clave)) continue

                comandosVistos.add(clave)
                categorias.get(tag).comandos.push(nombre)
            }
        }
    }

    const ordenNormalizado = ordenTags.map(normalizarTag)

    const grupos = [...categorias.values()]
        .filter(grupo => grupo.comandos.length > 0)
        .sort((a, b) => {
            const ia = ordenNormalizado.indexOf(a.tag)
            const ib = ordenNormalizado.indexOf(b.tag)

            const ordenA = ia === -1 ? 999 : ia
            const ordenB = ib === -1 ? 999 : ib

            return ordenA - ordenB
        })

    let total = 0

    let texto =
        `╭━━━〔 🐸 ${nombreBot} 〕━━━╮\n` +
        `┃ 💚 ¡Hola! Bienvenido al menú\n` +
        `┃\n` +
        `┃ 👑 Owner: ${nombreOwner}\n` +
        `┃ ⚙️ Prefijo: ${prefijo}\n` +
        `┃ 📚 Comandos disponibles\n` +
        `╰━━━━━━━━━━━━━━━━━━╯\n\n`

    for (const grupo of grupos) {
        texto += `┏━━━〔 ${nombresTags[grupo.tag] || `📂 ${grupo.tag.toUpperCase()}`} 〕\n`

        for (let i = 0; i < grupo.comandos.length; i++) {
            const comando = grupo.comandos[i]
            const emoji = emojis[i % emojis.length]

            texto += `┃ ${emoji} ${prefijo}${comando}\n`
            total++
        }

        texto += `┗━━━━━━━━━━━━━━━━━━\n\n`
    }

    texto +=
        `╭━━━〔 📊 ESTADÍSTICAS 〕\n` +
        `┃ 🧩 Total: ${total} comandos\n` +
        `┃ 💚 Gracias por usar ${nombreBot}\n` +
        `╰━━━━━━━━━━━━━━━━━━╯`

    const imagen = path.resolve(
        './assets/file_00000000963081fd88ccfde79ffff923.png'
    )

    if (fs.existsSync(imagen)) {
        return sock.sendMessage(
            m.chat,
            {
                image: fs.readFileSync(imagen),
                caption: texto,
                mentions: m.sender ? [m.sender] : []
            },
            { quoted: m }
        )
    }

    console.error('[PEPE MENU] No se encontró la imagen:', imagen)

    return sock.sendMessage(
        m.chat,
        { text: texto },
        { quoted: m }
    )
}

handler.command = ['menu', 'help', 'ayuda']
handler.help = ['menu', 'help', 'ayuda']
handler.tags = ['informacion']
handler.menu = true

export default handler