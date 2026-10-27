
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
    otros: '🐸 OTROS 🐸'
}

const emojis = ['💚', '🌟']

// Unifica variantes para que no se repitan las categorías.
function normalizarTag(tag = 'otros') {
    const limpio = String(tag)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const alias = {
        info: 'informacion',
        información: 'informacion',
        informaciones: 'informacion',
        grupo: 'grupo',
        grupos: 'grupo',
        group: 'grupo',
        groups: 'grupo',
        diversion: 'diversion',
        diversiones: 'diversion',
        descarga: 'descargas',
        download: 'descargas',
        downloader: 'descargas',
        herramienta: 'herramientas',
        tools: 'herramientas',
        juegos: 'diversion',
        game: 'diversion',
        games: 'diversion',
        sticker: 'stickers',
        owner: 'owner',
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

    // El index.js debe proporcionar el mapa de plugins.
    const commandMap = m.commandMap

    if (!commandMap || typeof commandMap.values !== 'function') {
        return m.reply(
            '⚠️ No se pudo obtener la lista de comandos. ' +
            'Hay que conectar el menú con el cargador de plugins del index.js.'
        )
    }

    const prefijo = config.PREFIX || '.'
    const nombreBot = config.BOT_NAME || 'PEPE BOT'
    const nombreOwner = config.OWNER_NAME || 'Owner'

    // Agrupar comandos sin duplicar categorías.
    const categorias = new Map()
    const comandosVistos = new Set()

    for (const entries of commandMap.values()) {
        // El cargador puede guardar varios plugins por comando.
        const lista = Array.isArray(entries) ? entries : [entries]

        for (const entry of lista) {
            const plugin = entry?.handler || entry

            if (!plugin || plugin.menu === false) continue

            const tagOriginal = Array.isArray(plugin.tags)
                ? plugin.tags[0]
                : plugin.tags

            const tag = normalizarTag(tagOriginal || 'otros')

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

    // Orden manual de categorías.
    const ordenNormalizado = ordenTags.map(normalizarTag)

    const grupos = [...categorias.values()]
        .filter(categoria => categoria.comandos.length > 0)
        .sort((a, b) => {
            const indexA = ordenNormalizado.indexOf(a.tag)
            const indexB = ordenNormalizado.indexOf(b.tag)

            const posicionA = indexA === -1
                ? Infinity
                : indexA

            const posicionB = indexB === -1
                ? Infinity
                : indexB

            return posicionA - posicionB
        })

    let total = 0

    let texto =
        `╭━━〔 🐸 ${nombreBot} 〕━━╮\n` +
        `┃\n` +
        `┃ 💚 Prefijo: ${prefijo}\n` +
        `┃ 👑 Owner: ${nombreOwner}\n` +
        `┃ 📚 Comandos disponibles\n` +
        `┃\n`

    for (const grupo of grupos) {
        const titulo = nombresTags[grupo.tag] ||
            `🐸 ${grupo.tag.toUpperCase()} 🐸`

        texto += `┣━━〔 ${titulo} 〕\n`

        grupo.comandos.forEach((comando, index) => {
            texto += `┃ ${emojis[index % emojis.length]} ${prefijo}${comando}\n`
            total++
        })

        texto += `┃\n`
    }

    texto +=
        `┣━━━━━━━━━━━━━━\n` +
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
