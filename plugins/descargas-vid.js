
const pendientes = new Map()
const conexiones = new WeakSet()

const API_BUSCAR = 'https://api-faa.my.id/faa/youtube?q='
const API_VIDEO = 'https://api-faa.my.id/faa/ytplayvid?q='

const REACCIONES = [
  '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
  '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'
]

function instalarReacciones(conn) {
  if (conexiones.has(conn)) return
  conexiones.add(conn)

  conn.ev.on('messages.reaction', async updates => {
    const eventos = Array.isArray(updates) ? updates : [updates]

    for (const evento of eventos) {
      try {
        const id = evento.key?.id
        const chat = evento.key?.remoteJid
        const reaccion = evento.reaction?.text

        if (!id || !chat || !reaccion) continue

        const clave = `${chat}_${id}`
        const datos = pendientes.get(clave)

        if (!datos || datos.procesando) continue

        // Solo quien realizó la búsqueda puede elegir
        const autor = evento.reaction?.key?.participant ||
          evento.reaction?.key?.remoteJid

        if (autor && autor !== datos.usuario) continue

        if (reaccion === '❌') {
          pendientes.delete(clave)

          await conn.sendMessage(chat, {
            text: '> ❌ Selección cancelada.'
          })

          continue
        }

        const indice = REACCIONES.indexOf(reaccion)

        if (indice === -1 || !datos.resultados[indice]) continue

        datos.procesando = true

        const seleccionado = datos.resultados[indice]

        try {
          await conn.sendMessage(chat, {
            text: `> ⏳ Descargando: ${seleccionado.title}`
          })

          const api = API_VIDEO +
            encodeURIComponent(seleccionado.link)

          const response = await fetch(api)
          if (!response.ok) throw new Error('Error en API de video')

          const data = await response.json()

          if (!data.status || !data.result?.download_url) {
            throw new Error('No se pudo obtener el video')
          }

          const video = data.result

          const caption = `
> 🎬 *INFORMACIÓN DEL VIDEO*

> 📌 Título: ${seleccionado.title}
> 👤 Canal: ${seleccionado.channel}
> ⏱️ Duración: ${seleccionado.duration}
> 📁 Formato: ${video.format || 'MP4'}
> 🔗 Enlace: ${seleccionado.link}

> 🐸 PEPE BOT
`.trim()

          await conn.sendMessage(chat, {
            video: { url: video.download_url },
            mimetype: 'video/mp4',
            fileName: 'video.mp4',
            caption
          })

          pendientes.delete(clave)

        } catch (error) {
          datos.procesando = false
          console.error('[VID DESCARGA]', error)

          await conn.sendMessage(chat, {
            text: '> ❌ No se pudo descargar el video seleccionado.'
          })
        }

      } catch (error) {
        console.error('[VID REACTION]', error)
      }
    }
  })
}

const handler = async (m, { conn, text }) => {
  try {
    if (!text?.trim()) {
      return m.reply('> ⚠️ Escribe qué video quieres buscar.\n> Ejemplo: .vid IMU Jorge Cuellar')
    }

    instalarReacciones(conn)

    await conn.sendMessage(m.chat, {
      react: {
        text: '🔎',
        key: m.key
      }
    })

    const response = await fetch(
      API_BUSCAR + encodeURIComponent(text.trim())
    )

    if (!response.ok) {
      throw new Error('Error al consultar YouTube')
    }

    const data = await response.json()

    if (!data.status || !Array.isArray(data.result) || !data.result.length) {
      return m.reply('> ❌ No se encontraron videos.')
    }

    const resultados = data.result.slice(0, 10)

    let mensaje = `╭━━〔 🎬 BÚSQUEDA DE VIDEOS 〕━━╮\n`
    mensaje += `┃\n`
    mensaje += `┃ 🔎 Búsqueda: ${text}\n`
    mensaje += `┃\n`

    resultados.forEach((video, i) => {
      mensaje += `┃ ${REACCIONES[i]} *${video.title}*\n`
      mensaje += `┃ 👤 Canal: ${video.channel}\n`
      mensaje += `┃ ⏱️ Duración: ${video.duration}\n`
      mensaje += `┃ 🔗 ${video.link}\n`
      mensaje += `┃\n`
    })

    mensaje += `╰━━━━━━━━━━━━━━━━━━╯\n\n`
    mensaje += `> 👆 Reacciona a ESTE mensaje con el número del video que quieres descargar.\n`
    mensaje += `> ❌ Reacciona con ❌ para cancelar.\n`
    mensaje += `> 🐸 PEPE BOT`

    const enviado = await conn.sendMessage(m.chat, {
      text: mensaje
    }, {
      quoted: m
    })

    const clave = `${m.chat}_${enviado.key.id}`

    pendientes.set(clave, {
      usuario: m.sender,
      resultados,
      procesando: false
    })

  } catch (error) {
    console.error('[VID]', error)
    m.reply('> ❌ Ocurrió un error al buscar los videos.')
  }
}

handler.command = ['vid']
handler.help = ['vid <búsqueda>']
handler.tags = ['descargas']

export default handler
