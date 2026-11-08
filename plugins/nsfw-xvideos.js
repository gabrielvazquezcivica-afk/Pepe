
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.resolve('./database/nsfw.json')

// Sustituye esto por una API de búsqueda de videos no explícitos.
const API_URL = 'https://api.stellarwa.xyz/nsfw/search/xnxx?key=api-hbWMB'

const handler = {}

function cargarDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
    fs.writeFileSync(DB_FILE, '{}')
  }

  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch {
    return {}
  }
}

handler.run = async (sock, m, args = []) => {
  const query = args.join(' ').trim()

  if (m.isGroup) {
    const db = cargarDB()

    if (db[m.chat]?.bloqueado !== false) {
      return m.reply('> 🔒 La búsqueda de videos está desactivada en este grupo.')
    }
  }

  if (!query) {
    return m.reply('> Escribe qué video deseas buscar.\n> Ejemplo: .videos naturaleza')
  }

  try {
    const url = new URL(API_URL)
    url.searchParams.set('query', query)

    const response = await fetch(url)
    const body = await response.text()

    let json
    try {
      json = JSON.parse(body)
    } catch {
      return m.reply('> ❌ La API no devolvió JSON válido.')
    }

    if (!response.ok || json.status !== true) {
      return m.reply('> ❌ No se encontraron resultados.')
    }

    const resultados = json.resultados || json.data || []

    if (!resultados.length) {
      return m.reply('> ❌ No hay resultados para esa búsqueda.')
    }

    const lista = resultados.slice(0, 5).map((v, i) => {
      return [
        `🎬 *Resultado ${i + 1}*`,
        `📌 ${v.title || 'Sin título'}`,
        `👁️ Visitas: ${v.views || 'N/D'}`,
        `⏱️ Duración: ${v.duration || 'N/D'}`,
        `📺 Resolución: ${v.resolution || 'N/D'}`,
        `🔗 Enlace: ${v.url || 'No disponible'}`
      ].join('\n')
    }).join('\n\n')

    await m.reply(`🔎 *Resultados para: ${query}*\n\n${lista}`)
  } catch (error) {
    console.error('[VIDEOS]', error)
    await m.reply('> ❌ Error al buscar videos.')
  }
}

handler.command = ['videos']
handler.help = ['videos <búsqueda>']
handler.tags = ['buscador']
handler.menu = true

export default handler
