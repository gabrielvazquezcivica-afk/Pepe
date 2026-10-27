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
    informacion: '📡 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗖𝗜𝗢́𝗡',
    'on-off': '🔌 𝗢𝗡 / 𝗢𝗙𝗙',
    frases: '💬 𝗙𝗥𝗔𝗦𝗘𝗦',
    grupo: '👥 𝗚𝗥𝗨𝗣𝗢',
    descargas: '📥 𝗗𝗘𝗦𝗖𝗔𝗥𝗚𝗔𝗦',
    buscador: '🔎 𝗕𝗨𝗦𝗖𝗔𝗗𝗢𝗥',
    herramientas: '🛠️ 𝗛𝗘𝗥𝗥𝗔𝗠𝗜𝗘𝗡𝗧𝗔𝗦',
    diversion: '🎮 𝗗𝗜𝗩𝗘𝗥𝗦𝗜𝗢́𝗡',
    rpg: '⚔️ 𝗥𝗣𝗚',
    owner: '👑 𝗢𝗪𝗡𝗘𝗥',
    stickers: '🎨 𝗦𝗧𝗜𝗖𝗞𝗘𝗥𝗦',
    nsfw: '🔞 𝗡𝗦𝗙𝗪',
    otros: '📂 𝗢𝗧𝗥𝗢𝗦'
}

const emojis = ['🟢', '⚡', '✦', '🐸']

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

function negrita(texto) {
    const normal = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const bold = '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'

    return String(texto).replace(/[A-Za-z0-9]/g, letra => {
        const index = normal.indexOf(letra)
        return index === -1 ? letra : bold[index]
    })
}

handler.run = async (sock, m) => {
    await sock.sendMessage(m.chat, {
        react: { text: '🐸', key: m.key }
    }).catch(() => {})

    const commandMap = m.commandMap

    if (!commandMap || typeof commandMap.values !== 'function') {
        return m.reply(
            '❌ No se pudo cargar el menú.\n' +
            'Comprueba que index.js tenga m.commandMap = plugins.'
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

    const orden = ordenTags.map(normalizarTag)

    const grupos = [...categorias.values()]
        .filter(grupo => grupo.comandos.length > 0)
        .sort((a, b) => {
            const ia = orden.indexOf(a.tag)
            const ib = orden.indexOf(b.tag)

            return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
        })

    let total = 0

    let texto =
        `╭━━━〔 🐸 ${negrita(nombreBot)} 〕━━━╮\n` +
        `┃\n` +
        `┃ ⚡ 𝗖𝗘𝗡𝗧𝗥𝗢 𝗗𝗘 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦\n` +
        `┃\n` +
        `┃ 💚 Prefijo  » ${prefijo}\n` +
        `┃ 👑 Owner    » ${nombreOwner}\n` +
        `┃ 📚 Explora mis funciones\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━╯\n\n`

    for (const grupo of grupos) {
        const titulo = nombresTags[grupo.tag] ||
            `📂 ${negrita(grupo.tag.toUpperCase())}`

        texto +=
            `┏━━━━━━━━━━━━━━━━━━┓\n` +
            `┃ ${titulo}\n` +
            `┣━━━━━━━━━━━━━━━━━━┫\n`

        grupo.comandos.forEach((comando, index) => {
            texto +=
                `┃ ${emojis[index % emojis.length]} ` +
                `${negrita(prefijo + comando)}\n`
            total++
        })

        texto += `┗━━━━━━━━━━━━━━━━━━┛\n\n`
    }

    texto +=
        `╭━━━━━━━━━━━━━━━━━━╮\n` +
        `┃ 📊 ${negrita('RESUMEN')}\n` +
        `┃ 🔢 Total: ${total} comandos\n` +
        `┃ 🐸 ${negrita(nombreBot)}\n` +
        `╰━━━━━━━━━━━━━━━━━━╯\n\n` +
        `       💚 ⚡ 🐸 ⚡ 💚\n` +
        `> ✨ Gracias por usar ${nombreBot}`

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

    console.error('[PEPE BOT] No se encontró la imagen:', imagen)

    return sock.sendMessage(
        m.chat,
        { text: texto },
        { quoted: m }
    )
}

handler.command = ['menu', 'help', 'ayuda']
handler.help = ['menu]
handler.tags = ['informacion']
handler.menu = true

export default handler