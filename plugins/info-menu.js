
import config from '../config.js'

const handler = {}

const ordenTags = [
    'informacion',
    'on-off',
    'frases',
    'grupo',
    'descargas',
    'buscador',
    'herramientas',
    'diversión',
    'rpg',
    'owner',
    'stickers',
    'nsfw'
]

const nombresTags = {
    informacion: '🐸 INFORMACIÓN 🐸',
    'on-off': '🔌 ON - OFF 🔌',
    frases: '💬 FRASES 💬',
    grupo: '👥 GRUPO 👥',
    descargas: '📥 DESCARGAS 📥',
    buscador: '🔎 BUSCADOR 🔎',
    herramientas: '🛠️ HERRAMIENTAS 🛠️',
    diversion: '🎉 DIVERSIÓN 🎉',
    rpg: '⚔️ RPG ⚔️',
    owner: '👑 OWNER 👑',
    stickers: '🎨 STICKERS 🎨',
    nsfw: '🔞 NSFW 🔞',
    otros: '🐸 OTROS COMANDOS 🐸'
}

const emojis = ['💚', '🌟']

function normalizarTag(tag = 'otros') {
    const limpio = String(tag)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const alias = {
        info: 'informacion',
        grupo: 'grupo',
        grupos: 'grupo',
        group: 'grupo',
        groups: 'grupo',
        diversion: 'diversion',
        descarga: 'descargas',
        download: 'descargas',
        downloader: 'descargas',
        herramienta: 'herramientas',
        tools: 'herramientas',
        sticker: 'stickers',
        stickers: 'stickers',
        owners: 'owner'
    }

    return alias[limpio] || limpio
}

handler.run = async (sock, m) => {
    await sock.sendMessage(m.chat, {
        react: {
            text: '📜',
            key: m.key
        }
    }).catch(() => {})

    const commandMap = m.commandMap

    if (!commandMap || typeof commandMap.values !== 'function') {
        return m.reply(
            '❌ No se pudo obtener la lista de plugins.\n' +
            'Agrega `m.commandMap = plugins` en executePlugin() de tu index.js.'
        )
    }

    const prefijo = config.PREFIX || '.'
    const nombreBot = config.BOT_NAME || 'PEPE BOT'
    const nombreOwner = config.OWNER_NAME || 'Owner'

    const categorias = new Map()
    const comandosVistos = new Set()

    // Reunir comandos de todos los plugins.
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
            const comandos = Array.isArray(help) ? help : [help]

            for (const comando of comandos) {
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

    // Ordenar según ordenTags; las categorías desconocidas quedan al final.
    const ordenNormalizado = ordenTags.map(normalizarTag)

    const grupos = [...categorias.values()]
        .filter(grupo => grupo.comandos.length > 0)
        .sort((a, b) => {
            const ia = ordenNormalizado.indexOf(a.tag)
            const ib = ordenNormalizado.indexOf(b.tag)

            const posA = ia === -1 ? Infinity : ia
            const posB = ib === -1 ? Infinity : ib

            return posA - posB
        })

    let total = 0

    let texto =
        `╭━━〔 🐸 ${nombreBot} 〕━━╮\n` +
        `┃\n` +
        `┃ 💚 Prefijo: ${prefijo}\n` +
        `┃ 👑 Owner: ${nombreOwner}\n` +
        `┃ 📚 Lista de comandos\n` +
        `┃\n`

    for (const grupo of grupos) {
        const titulo =
            nombresTags[grupo.tag] ||
            `🐸 ${grupo.tag.toUpperCase()} 🐸`

        texto += `┣━━〔 ${titulo} 〕\n`

        grupo.comandos.forEach((comando, index) => {
            texto += `┃ ${emojis[index % emojis.length]} ${prefijo}${comando}\n`
            total++
        })

        texto += '┃\n'
    }

    texto +=
        `┣━━━━━━━━━━━━━━━━━━\n` +
        `┃ 📊 Total: ${total} comandos\n` +
        `╰━━〔 💚 ${nombreBot} 〕━━╯\n` +
        `> 🌟 Gracias por usarme.`

    return sock.sendMessage(
        m.chat,
        {
            text: texto,
            mentions: m.sender ? [m.sender] : []
        },
        {
            quoted: m
        }
    )
}

handler.command = ['menu', 'help', 'ayuda']
handler.help = ['menu', 'help', 'ayuda']
handler.tags = ['informacion']
handler.menu = true

export default handler
