import axios from 'axios'

const API_URL = 'https://api-faa.my.id/faa/pinterest?q='

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid
  const query = args.join(' ').trim()

  if (!query) {
    return sock.sendMessage(chat, {
      text:
        '> 🐸 *PEPE BOT — PINTEREST*\n\n' +
        '> 📌 Escribe qué imágenes quieres buscar.\n\n' +
        '> ✨ *Ejemplo:* .pin ranitas aesthetic'
    }, { quoted: m })
  }

  await sock.sendMessage(chat, {
    react: { text: '🔎', key: m.key }
  }).catch(() => {})

  try {
    const response = await axios.get(
      API_URL + encodeURIComponent(query),
      {
        timeout: 60000,
        headers: { Accept: 'application/json' }
      }
    )

    const data = response.data

    if (!data?.status || !Array.isArray(data.result) || !data.result.length) {
      throw new Error('La API no encontró imágenes.')
    }

    // Limitar la cantidad para evitar saturar el chat.
    const imagenes = data.result
      .filter(url =>
        typeof url === 'string' &&
        /^https:\/\/i\.pinimg\.com\//i.test(url)
      )
      .slice(0, 10)

    if (!imagenes.length) {
      throw new Error('La API no devolvió enlaces de imágenes válidos.')
    }

    await sock.sendMessage(chat, {
      text:
        `> 🐸 *PEPE BOT — PINTEREST*\n\n` +
        `> 🔎 *Búsqueda:* ${query}\n` +
        `> 🖼️ *Imágenes encontradas:* ${imagenes.length}\n` +
        '> 📥 Enviando imágenes...'
    }, { quoted: m })

    let enviadas = 0
    let fallidas = 0

    for (const url of imagenes) {
      try {
        await sock.sendMessage(chat, {
          image: { url }
        }, { quoted: m })

        enviadas++
      } catch (error) {
        fallidas++
        console.error('[PEPE PIN] Error enviando imagen:', error.message)
      }
    }

    await sock.sendMessage(chat, {
      text:
        `> ✅ *Búsqueda finalizada*\n\n` +
        `> 🖼️ Enviadas: ${enviadas}\n` +
        `> ⚠️ Fallidas: ${fallidas}`
    }, { quoted: m })

    await sock.sendMessage(chat, {
      react: { text: enviadas ? '✅' : '❌', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[PEPE PIN]',
      error.response?.status || '',
      error.message
    )

    await sock.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await sock.sendMessage(chat, {
      text:
        '> ❌ *No se pudieron obtener las imágenes.*\n\n' +
        '> Comprueba si la API está disponible e inténtalo de nuevo.'
    }, { quoted: m }).catch(() => {})
  }
}

handler.command = ['pin', 'pinterest']
handler.help = ['pin <búsqueda>']
handler.tags = ['buscador']
handler.menu = true

export default handler