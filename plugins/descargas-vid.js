
import fs from 'node:fs'
import path from 'node:path'

const DB = './database'
const ARCHIVO = path.join(DB, 'vid.json')
const TIEMPO_EXPIRACION = 15 * 60 * 1000

if (!fs.existsSync(DB)) {
  fs.mkdirSync(DB, { recursive: true })
}

function leerPendientes() {
  try {
    if (!fs.existsSync(ARCHIVO)) return {}
    return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'))
  } catch {
    return {}
  }
}

function guardarPendientes(data) {
  fs.writeFileSync(ARCHIVO, JSON.stringify(data, null, 2))
}

function limpiarPendientes(data) {
  const ahora = Date.now()

  for (const id in data) {
    if (ahora - data[id].fecha > TIEMPO_EXPIRACION) {
      delete data[id]
    }
  }

  return data
}

function obtenerCitado(m) {
  return m.quoted?.id ||
    m.quoted?.key?.id ||
    m.msg?.contextInfo?.stanzaId ||
    m.message?.extendedTextMessage?.contextInfo?.stanzaId ||
    null
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    const pendientes = limpiarPendientes(leerPendientes())
    const citado = obtenerCitado(m)

    // Elegir video respondiendo al resultado
    if (/^\d+$/.test(text?.trim() || '')) {
      if (!citado || !pendientes[citado]) {
        return m.reply(
          '> ⚠️ Responde al mensaje de resultados con el comando .vid y el número del video.'
        )
      }

      const datos = pendientes[citado]

      if (datos.usuario !== m.sender) {
        return m.reply('> ❌ Esta búsqueda pertenece a otro usuario.')
      }

      const numero = Number(text.trim())

      if (numero < 1 || numero > datos.resultados.length) {
        return m.reply('> ⚠️ Número de video no válido.')
      }

      const seleccionado = datos.resultados[numero - 1]

      await conn.sendMessage(m.chat, {
        react: { text: '⬇️', key: m.key }
      })

      // Obtener descarga
      let response = await fetch(
        `https://api-faa.my.id/faa/ytplayvid?q=${encodeURIComponent(seleccionado.link)}`
      )

      let resultado = await response.json()

      // Segundo intento usando el título
      if (!resultado.status || !resultado.result?.download_url) {
        response = await fetch(
          `https://api-faa.my.id/faa/ytplayvid?q=${encodeURIComponent(seleccionado.title)}`
        )

        resultado = await response.json()
      }

      if (!resultado.status || !resultado.result?.download_url) {
        return m.reply('> ❌ No se pudo obtener el video.')
      }

      const video = resultado.result

      const titulo = video.searched_title || seleccionado.title
      const enlace = video.searched_url || seleccionado.link

      const nombreArchivo = titulo
        .replace(/[\\/:*?"<>|]/g, '')
        .substring(0, 80)

      const caption = `
> 🎬 *VIDEO DESCARGADO*

> 📌 Título: ${titulo}
> 👤 Canal: ${seleccionado.channel}
> ⏱️ Duración: ${seleccionado.duration}
> 📁 Formato: MP4
> 🔗 Enlace: ${enlace}

> 🐸 PEPE BOT
`.trim()

      await conn.sendMessage(m.chat, {
        video: { url: video.download_url },
        mimetype: 'video/mp4',
        fileName: `${nombreArchivo}.mp4`,
        caption
      }, { quoted: m })

      delete pendientes[citado]
      guardarPendientes(pendientes)
      return
    }

    // Buscar videos
    if (!text?.trim()) {
      return m.reply(
        `> ⚠️ Escribe el nombre del video.\n> Ejemplo: ${usedPrefix + command} IMU Jorge Cuellar`
      )
    }

    await conn.sendMessage(m.chat, {
      react: { text: '🔎', key: m.key }
    })

    const api = `https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(text.trim())}`

    const response = await fetch(api)
    if (!response.ok) throw new Error('Error en la búsqueda')

    const data = await response.json()

    if (!data.status || !Array.isArray(data.result) || !data.result.length) {
      return m.reply('> ❌ No se encontraron videos.')
    }

    const resultados = data.result.slice(0, 10)

    let mensaje = `> 🔎 RESULTADOS DE YOUTUBE\n`
    mensaje += `> 🔍 Búsqueda: ${text}\n\n`

    resultados.forEach((video, index) => {
      mensaje += `> *${index + 1}.* ${video.title}\n`
      mensaje += `> 👤 Canal: ${video.channel}\n`
      mensaje += `> ⏱️ Duración: ${video.duration}\n`
      mensaje += `> 🔗 ${video.link}\n\n`
    })

    mensaje += '> 📥 Para descargar, responde a este mensaje con .vid y el número del video.\n'
    mensaje += '> Ejemplo: .vid 1\n'
    mensaje += '> ⏳ Los resultados expiran en 15 minutos.'

    const enviado = await conn.sendMessage(m.chat, {
      text: mensaje
    }, { quoted: m })

    if (!enviado?.key?.id) {
      throw new Error('No se pudo guardar el mensaje de resultados')
    }

    pendientes[enviado.key.id] = {
      usuario: m.sender,
      fecha: Date.now(),
      resultados
    }

    guardarPendientes(pendientes)

  } catch (error) {
    console.error('[VID]', error)
    m.reply('> ❌ Ocurrió un error al buscar o descargar el video.')
  }
}

handler.command = ['vid']
handler.help = ['vid <búsqueda>']
handler.tags = ['descargas']

export default handler
