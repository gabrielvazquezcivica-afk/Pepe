
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
    informacion: '𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝘾𝙄𝙊𝙉',
    'on-off': '𝙊𝙉 - 𝙊𝙁𝙁',
    frases: '𝙁𝙍𝘼𝙎𝙀𝙎',
    grupo: '𝙂𝙍𝙐𝙋𝙊',
    descargas: '𝘿𝙀𝙎𝘾𝘼𝙍𝙂𝘼𝙎',
    buscador: '𝘽𝙐𝙎𝘾𝘼𝘿𝙊𝙍',
    herramientas: '𝙃𝙀𝙍𝙍𝘼𝙈𝙄𝙀𝙉𝙏𝘼𝙎',
    diversion: '𝘿𝙄𝙑𝙀𝙍𝙎𝙄𝙊́𝙉',
    rpg: '𝙍𝙋𝙂',
    owner: '𝙊𝙒𝙉𝙀𝙍',
    stickers: '𝙎𝙏𝙄𝘾𝙆𝙀𝙍𝙎',
    nsfw: '𝙉𝙎𝙁𝙒',
    otros: '𝙊𝙏𝙍𝙊𝙎'
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
        información: 'informacion',
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
        owners: 'owner'
    }

    return alias[limpio] || limpio
}

// Convierte letras normales a negrita Unicode.
function negrita(texto) {
    const normal = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const bold = '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'

    return [...String(texto)].map(letra => {
        const index = normal.indexOf(letra)
        return index === -1 ? letra : bold[index]
    }).join('')
}

handler.run = async (sock, m) => {
    await sock.sendMessage(m.chat, {
        react: { text: '📜', key: m.key }
    }).catch(() => {})

    const commandMap = m.commandMap

    if (!commandMap || typeof commandMap.values !== 'function') {
        return m.reply(
            '❌ No se pudo obtener la lista de plugins.\n' +
            'Agrega m.commandMap = plugins en executePlugin() de index.js.'
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
                categorias.set(tag, { tag, comandos: [] })
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

    const ordenNormalizado = ordenTags.map(normalizarTag)

    const grupos = [...categorias.values()]
        .filter(grupo => grupo.comandos.length > 0)
        .sort((a, b) => {
            const ia = ordenNormalizado.indexOf(a.tag)
            const ib = ordenNormalizado.indexOf(b.tag)

            return (ia === -1 ? Infinity : ia) -
                   (ib === -1 ? Infinity : ib)
        })

    let total = 0

    let texto =
        `╭━━〔 🐸 ${negrita(nombreBot)} 〕━━╮\n` +
        `┃\n` +
        `┃ 💚 𝗣𝗿𝗲𝗳𝗶𝗷𝗼: ${prefijo}\n` +
        `┃ 👑 𝗢𝘄𝗻𝗲𝗿: ${negrita(nombreOwner)}\n` +
        `┃\n`

    for (const grupo of grupos) {
        const titulo = nombresTags[grupo.tag] ||
            `𝙊𝙏𝙍𝙊𝙎: ${grupo.tag.toUpperCase()}`

        texto += `┣━━〔 ${titulo} 〕\n`

        grupo.comandos.forEach((comando, index) => {
            texto += `┃ ${emojis[index % emojis.length]} ${negrita(comando)}\n`
            total++
        })

        texto += '┃\n'
    }

    texto +=
        `┣━━━━━━━━━━━━━━━━━━\n` +
        `┃ 📊 𝗧𝗼𝘁𝗮𝗹: ${negrita(String(total))} 𝗰𝗼𝗺𝗮𝗻𝗱𝗼𝘀\n` +
        `╰━━〔 💚 ${negrita(nombreBot)} 〕━━╯\n` +
        `> 🌟 𝗚𝗿𝗮𝗰𝗶𝗮𝘀 𝗽𝗼𝗿 𝘂𝘀𝗮𝗿𝗺𝗲.`

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
