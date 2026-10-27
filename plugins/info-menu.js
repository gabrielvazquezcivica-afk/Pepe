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
informacion: '𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐂𝐈𝐎́𝐍',
'on-off': '𝐎𝐍 / 𝐎𝐅𝐅',
frases: '𝐅𝐑𝐀𝐒𝐄𝐒',
grupo: '𝐆𝐑𝐔𝐏𝐎',
descargas: '𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒',
buscador: '𝐁𝐔𝐒𝐂𝐀𝐃𝐎𝐑',
herramientas: '𝐇𝐄𝐑𝐑𝐀𝐌𝐈𝐄𝐍𝐓𝐀𝐒',
diversion: '𝐃𝐈𝐕𝐄𝐑𝐒𝐈𝐎́𝐍',
rpg: '𝐑𝐏𝐆',
owner: '𝐎𝐖𝐍𝐄𝐑',
stickers: '𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒',
nsfw: '𝐍𝐒𝐅𝐖'
}

function normalizarTag(tag = '') {
return String(tag)
.toLowerCase()
.normalize('NFD')
.replace(/[\u0300-\u036f]/g, '')
.trim()
}

function letraElegante(texto = '') {
const normal = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
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

handler.run = async (sock, m) => {
try {
await sock.sendMessage(m.chat, {
react: { text: '🐸', key: m.key }
}).catch(() => {})

const commandMap = m.commandMap

if (!commandMap || typeof commandMap.values !== 'function') {
  return m.reply('⚠️ No se pudo cargar el menú dinámico. Revisa index.js.')
}

const categorias = new Map()

for (const entradas of commandMap.values()) {
  for (const entrada of Array.isArray(entradas) ? entradas : [entradas]) {
    const plugin = entrada?.handler || entrada

    if (!plugin || plugin.menu === false) continue

    const tags = Array.isArray(plugin.tags) ? plugin.tags : ['otros']
    const comandos = Array.isArray(plugin.help)
      ? plugin.help
      : Array.isArray(plugin.command)
        ? plugin.command
        : []

    if (!comandos.length) continue

    for (const tagOriginal of tags) {
      const tag = normalizarTag(tagOriginal)

      if (!categorias.has(tag)) categorias.set(tag, new Set())

      for (const comando of comandos) {
        if (typeof comando === 'string' && comando.trim()) {
          categorias.get(tag).add(comando.trim())
        }
      }
    }
  }
}

if (!categorias.size) {
  return m.reply('🐸 No encontré comandos para mostrar.')
}

const prefijo = config.PREFIX || '.'
const nombreBot = config.BOT_NAME || 'PEPE BOT'
const nombreOwner = config.OWNER_NAME || 'Owner'

let texto = ''

texto += '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
texto += '       ─── ⋆⋅☆⋅⋆ ──\n'
texto += `       ୨୧ ${nombreBot} ୨୧\n`
texto += '       ── ⋆⋅☆⋅⋆ ───\n'
texto += '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n'

texto += '╭───────「 🐸 」───────╮\n'
texto += `╰┈➤ 💚 𝐏𝐫𝐞𝐟𝐢𝐣𝐨: ${prefijo}\n`
texto += `╰┈➤ 💚 𝐎𝐰𝐧𝐞𝐫: ${nombreOwner}\n`
texto += `╰┈➤ 💚 𝐂𝐚𝐭𝐞𝐠𝐨𝐫𝐢́𝐚𝐬: ${categorias.size}\n`
texto += '╰─────────────────────╯\n\n'

const tagsOrdenados = [
  ...ordenTags.filter(tag => categorias.has(tag)),
  ...[...categorias.keys()].filter(tag => !ordenTags.includes(tag)).sort()
]

for (const tag of tagsOrdenados) {
  const comandos = [...categorias.get(tag)]
  if (!comandos.length) continue

  const titulo = nombresTags[tag] || letraElegante(tag.toUpperCase())

  texto += '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
  texto += `       ✧ ${titulo} ✧\n`
  texto += '╰━━━━━━━━━━━━━━━━━━━━━━╯\n'

  for (const comando of comandos) {
    texto += `╰┈➤ 🐸 ${letraElegante(prefijo + comando)}\n`
  }

  texto += '╰────────── ⋆⋅☆⋅⋆ ──────\n\n'
}

texto += '╭━━━━━━━━━━━━━━━━━━━━━━╮\n'
texto += '       ୨୧ 𝐏𝐄𝐏𝐄 𝐁𝐎𝐓 ୨୧\n'
texto += '╰━━━━━━━━━━━━━━━━━━━━━━╯\n'
texto += '╰┈➤ 𝐆𝐫𝐚𝐜𝐢𝐚𝐬 𝐩𝐨𝐫 𝐮𝐬𝐚𝐫𝐦𝐞 🐸\n'
texto += '─── ⋆⋅☆⋅⋆ ──'

const imagen = path.resolve(
  './assets/file_00000000963081fd88ccfde79ffff923.png'
)

if (fs.existsSync(imagen)) {
  return await sock.sendMessage(
    m.chat,
    {
      image: fs.readFileSync(imagen),
      caption: texto
    },
    { quoted: m }
  )
}

return await sock.sendMessage(m.chat, { text: texto }, { quoted: m })

} catch (error) {
console.error('[MENU ERROR]', error)
return m.reply('❌ Ocurrió un error al generar el menú.')
}
}

handler.command = ['menu', 'help', 'ayuda']
handler.help = ['menu']
handler.tags = ['informacion']
handler.menu = true

export default handler