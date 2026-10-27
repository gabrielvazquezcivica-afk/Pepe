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

const categoriasInfo = {
  informacion: { nombre: '𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐂𝐈𝐎́𝐍', emoji: '📌' },
  'on-off': { nombre: '𝐎𝐍 / 𝐎𝐅𝐅', emoji: '🔌' },
  frases: { nombre: '𝐅𝐑𝐀𝐒𝐄𝐒', emoji: '💭' },
  grupo: { nombre: '𝐆𝐑𝐔𝐏𝐎', emoji: '👥' },
  descargas: { nombre: '𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒', emoji: '📥' },
  buscador: { nombre: '𝐁𝐔𝐒𝐂𝐀𝐃𝐎𝐑', emoji: '🔎' },
  herramientas: { nombre: '𝐇𝐄𝐑𝐑𝐀𝐌𝐈𝐄𝐍𝐓𝐀𝐒', emoji: '🛠️' },
  diversion: { nombre: '𝐃𝐈𝐕𝐄𝐑𝐒𝐈𝐎́𝐍', emoji: '🎮' },
  rpg: { nombre: '𝐑𝐏𝐆', emoji: '⚔️' },
  owner: { nombre: '𝐎𝐖𝐍𝐄𝐑', emoji: '👑' },
  stickers: { nombre: '𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒', emoji: '🎨' },
  nsfw: { nombre: '𝐍𝐒𝐅𝐖', emoji: '🔞' },
  otros: { nombre: '𝐎𝐓𝐑𝐎𝐒', emoji: '✨' }
}

function normalizarTag(tag = '') {
  return String(tag)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function letraElegante(texto = '') {
  const normal =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  const elegante =
    '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙' +
    '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳' +
    '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗'

  const letras = [...elegante]

  return String(texto).replace(/[A-Za-z0-9]/g, letra => {
    const indice = normal.indexOf(letra)
    return indice === -1 ? letra : letras[indice]
  })
}

function obtenerSaludo() {
  const hora = new Date().getHours()

  if (hora >= 5 && hora < 12) return '🌅 ¡𝐁𝐮𝐞𝐧𝐨𝐬 𝐝𝐢́𝐚𝐬!'
  if (hora >= 12 && hora < 19) return '☀️ ¡𝐁𝐮𝐞𝐧𝐚𝐬 𝐭𝐚𝐫𝐝𝐞𝐬!'
  return '🌙 ¡𝐁𝐮𝐞𝐧𝐚𝐬 𝐧𝐨𝐜𝐡𝐞𝐬!'
}

function obtenerEmoji(indice = 0) {
  return indice % 2 === 0 ? '🐸' : '🌟'
}

function obtenerComandos(plugin) {
  const origen = Array.isArray(plugin.help)
    ? plugin.help
    : Array.isArray(plugin.command)
      ? plugin.command
      : typeof plugin.help === 'string'
        ? [plugin.help]
        : typeof plugin.command === 'string'
          ? [plugin.command]
          : []

  return origen
    .filter(comando => typeof comando === 'string')
    .map(comando => comando.trim().split(/\s+/)[0])
    .filter(Boolean)
}

handler.run = async (sock, m) => {
  const chat = m.chat || m.key?.remoteJid

  try {
    await sock.sendMessage(chat, {
      react: { text: '🐸', key: m.key }
    }).catch(() => {})

    const commandMap = m.commandMap

    if (!commandMap || typeof commandMap.values !== 'function') {
      return m.reply(
        '> ⚠️ No se recibió el registro de comandos. Revisa index.js.'
      )
    }

    const categorias = new Map()
    const vistos = new Set()

    for (const entradas of commandMap.values()) {
      for (const entrada of Array.isArray(entradas) ? entradas : [entradas]) {
        const plugin = entrada?.handler || entrada

        if (!plugin || plugin.menu === false) continue

        const comandos = obtenerComandos(plugin)
        if (!comandos.length) continue

        const tags = Array.isArray(plugin.tags) && plugin.tags.length
          ? plugin.tags
          : ['otros']

        for (const tagOriginal of tags) {
          const tag = normalizarTag(tagOriginal)
          if (!tag) continue

          if (!categorias.has(tag)) {
            categorias.set(tag, new Set())
          }

          for (const comando of comandos) {
            const clave = `${tag}:${comando.toLowerCase()}`

            if (vistos.has(clave)) continue
            vistos.add(clave)
            categorias.get(tag).add(comando)
          }
        }
      }
    }

    if (!categorias.size) {
      return m.reply('> 🐸 No encontré comandos registrados para mostrar.')
    }

    const prefijo = config.PREFIX || '.'
    const nombreBot = config.BOT_NAME || 'PEPE BOT'
    const nombreOwner = config.OWNER_NAME || 'Owner'
    const saludo = obtenerSaludo()
    const nombreUsuario = m.pushName || 'Usuario'

    const totalComandos = [...categorias.values()]
      .reduce((total, comandos) => total + comandos.size, 0)

    let texto = ''

    texto += '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
    texto += '       ─── ⋆⋅☆⋅⋆ ──\n'
    texto += `       ୨୧ ${nombreBot} ୨୧\n`
    texto += '       ── ⋆⋅☆⋅⋆ ───\n'
    texto += '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n'

    texto += `${saludo}\n`
    texto += `╰┈➤ 👤 𝐔𝐬𝐮𝐚𝐫𝐢𝐨: ${nombreUsuario}\n`
    texto += `╰┈➤ 👑 𝐎𝐰𝐧𝐞𝐫: ${nombreOwner}\n`
    texto += `╰┈➤ ⚙️ 𝐏𝐫𝐞𝐟𝐢𝐣𝐨: ${prefijo}\n`
    texto += `╰┈➤ 📚 𝐂𝐨𝐦𝐚𝐧𝐝𝐨𝐬: ${totalComandos}\n`
    texto += '╭──────── ⋆⋅☆⋅⋆ ────────╮\n'
    texto += '       ✧ 𝐋𝐈𝐒𝐓𝐀 𝐃𝐄 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒 ✧\n'
    texto += '╰──────── ⋆⋅☆⋅⋆ ────────╯\n\n'

    const tagsOrdenados = [
      ...ordenTags.filter(tag => categorias.has(tag)),
      ...[...categorias.keys()]
        .filter(tag => !ordenTags.includes(tag))
        .sort()
    ]

    for (const tag of tagsOrdenados) {
      const comandos = [...categorias.get(tag)]
      if (!comandos.length) continue

      const info = categoriasInfo[tag] || {
        nombre: letraElegante(tag.toUpperCase()),
        emoji: '✨'
      }

      texto += '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
      texto += `┃ ${info.emoji} ${info.nombre}\n`
      texto += '╰━━━━━━━━━━━━━━━━━━━━━━╯\n'

      for (let i = 0; i < comandos.length; i++) {
        const comando = comandos[i]
        texto += `${obtenerEmoji(i)} ${letraElegante(prefijo + comando)}\n`
      }

      texto += '╰────────── ⋆⋅☆⋅⋆ ──────\n\n'
    }

    texto += '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
    texto += `       ୨୧ ${nombreBot} ୨୧\n`
    texto += '╰━━━━━━━━━━━━━━━━━━━━━━╯\n'
    texto += '🐸 ¡𝐃𝐢𝐬𝐟𝐫𝐮𝐭𝐚 𝐥𝐨𝐬 𝐜𝐨𝐦𝐚𝐧𝐝𝐨𝐬!\n'
    texto += '─── ⋆⋅☆⋅⋆ ──'

    const imagen = path.resolve(
      './assets/file_00000000963081fd88ccfde79ffff923.png'
    )

    if (fs.existsSync(imagen)) {
      return await sock.sendMessage(
        chat,
        {
          image: fs.readFileSync(imagen),
          caption: texto
        },
        { quoted: m }
      )
    }

    return await sock.sendMessage(
      chat,
      { text: texto },
      { quoted: m }
    )
  } catch (error) {
    console.error('[MENU ERROR]', error)
    return m.reply('> ❌ Ocurrió un error al generar el menú.')
  }
}

handler.command = ['menu', 'help', 'ayuda']
handler.help = ['menu']
handler.tags = ['informacion']
handler.menu = true

export default handler