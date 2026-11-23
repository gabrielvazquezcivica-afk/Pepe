
import fs from 'node:fs'
import path from 'node:path'
import axios from 'axios'

const API_URL = 'https://api.stellarwa.xyz/sfw/interaction'
const API_KEY = 'api-xyjFx'

const CACHE_DIR = './media/interacciones'
const PRELOAD_ON_START = true
const PRELOAD_CONCURRENCY = 2
const TIMEOUT = 15000

const interacciones = {
  abrazar: { api: 'hug', emoji: '🤗', texto: 'abrazó a', duo: true },
  consolar: { api: 'comfort', emoji: '🫂', texto: 'consoló a', duo: true },
  saludar: { api: 'wave', emoji: '👋', texto: 'saludó a', duo: true },
  acariciar: { api: 'pat', emoji: '🐾', texto: 'acarició a', duo: true },
  sonreir: { api: 'smile', emoji: '😊', texto: 'sonrió', duo: false },
  felicitar: { api: 'congratulate', emoji: '🎉', texto: 'felicitó a', duo: true },
  chocar5: { api: 'highfive', emoji: '🙌', texto: 'chocó los cinco con', duo: true },
  animar: { api: 'cheer', emoji: '💪', texto: 'animó a', duo: true },
  bailar: { api: 'dance', emoji: '💃', texto: 'está bailando', duo: false },
  reir: { api: 'laugh', emoji: '😂', texto: 'está riendo', duo: false },
  llorar: { api: 'cry', emoji: '😢', texto: 'está llorando', duo: false },
  pensar: { api: 'think', emoji: '🤔', texto: 'está pensando', duo: false },
  pensarprofundo: { api: 'deepthink', emoji: '🧠', texto: 'está pensando profundamente', duo: false },
  dormir: { api: 'sleep', emoji: '😴', texto: 'se fue a dormir', duo: false },
  aplaudir: { api: 'clap', emoji: '👏', texto: 'está aplaudiendo', duo: false },
  saltar: { api: 'jump', emoji: '🦘', texto: 'está saltando', duo: false },
  caminar: { api: 'walk', emoji: '🚶', texto: 'está caminando', duo: false },
  bostezar: { api: 'yawn', emoji: '🥱', texto: 'está bostezando', duo: false },
  estudiar: { api: 'study', emoji: '📚', texto: 'está estudiando', duo: false },
  cocinar: { api: 'cook', emoji: '🍳', texto: 'está cocinando', duo: false },
  saludar2: { api: 'salute', emoji: '🫡', texto: 'está saludando', duo: false },
  celebrar: { api: 'celebrate', emoji: '🥳', texto: 'está celebrando', duo: false },
  proteger: { api: 'protect', emoji: '🛡️', texto: 'está protegiendo a', duo: true },
  disculparse: { api: 'sorry', emoji: '🥺', texto: 'se disculpó con', duo: true },
  chocarpuños: { api: 'fistbump', emoji: '👊', texto: 'chocó los puños con', duo: true },
  curioso: { api: 'curious', emoji: '🧐', texto: 'está curioso', duo: false },
  olfatear: { api: 'sniff', emoji: '🐽', texto: 'está olfateando', duo: false },
  mirar: { api: 'look', emoji: '👀', texto: 'está mirando', duo: false },
  kiss: { api: 'kiss', emoji: '💋', texto: 'le dio un beso a', duo: true },
  cosquillas: { api: 'tickle', emoji: '🤣', texto: 'le hizo cosquillas a', duo: true },
  gritar: { api: 'scream', emoji: '😱', texto: 'está gritando', duo: false },
  frio: { api: 'cold', emoji: '🥶', texto: 'tiene frío', duo: false },
  jugar: { api: 'play', emoji: '🎮', texto: 'está jugando', duo: false },
  dibujar: { api: 'draw', emoji: '🎨', texto: 'está dibujando', duo: false },
  llamar: { api: 'call', emoji: '📞', texto: 'está llamando a', duo: true },
  aburrido: { api: 'bored', emoji: '🥱', texto: 'está aburrido', duo: false },
  dramatico: { api: 'dramatic', emoji: '🎭', texto: 'está siendo dramático', duo: false },
  cafe: { api: 'coffee', emoji: '☕', texto: 'está tomando café', duo: false },
  enojado: { api: 'angry', emoji: '😡', texto: 'está enojado', duo: false },
  bleh: { api: 'bleh', emoji: '😝', texto: 'sacó la lengua', duo: false },
  nope: { api: 'nope', emoji: '🙅', texto: 'dijo que no', duo: false },
  puchero: { api: 'pout', emoji: '🥺', texto: 'está haciendo pucheros', duo: false },
  correr: { api: 'run', emoji: '🏃', texto: 'está corriendo', duo: false },
  triste: { api: 'sad', emoji: '😢', texto: 'está triste', duo: false },
  asustado: { api: 'scared', emoji: '😨', texto: 'está asustado', duo: false },
  timido: { api: 'shy', emoji: '😳', texto: 'está tímido', duo: false },
  guinar: { api: 'wink', emoji: '😉', texto: 'guiñó el ojo', duo: false },
  comer: { api: 'eat', emoji: '🍜', texto: 'está comiendo', duo: false },
  sonrojar: { api: 'blush', emoji: '😊', texto: 'está sonrojado', duo: false },
  presumir: { api: 'flex', emoji: '😎', texto: 'está presumiendo', duo: false },
  hablar: { api: 'talk', emoji: '💬', texto: 'está hablando', duo: false },
  estornudar: { api: 'sneeze', emoji: '🤧', texto: 'está estornudando', duo: false },
  enfermo: { api: 'sick', emoji: '🤒', texto: 'está enfermo', duo: false },
  limpiar: { api: 'clean', emoji: '🧹', texto: 'está limpiando', duo: false },
  vergüenza: { api: 'embarrassed', emoji: '😳', texto: 'está avergonzado', duo: false },
  facepalm: { api: 'facepalm', emoji: '🤦', texto: 'hizo facepalm', duo: false },
  boop: { api: 'boop', emoji: '👉', texto: 'le dio un boop a', duo: true },
  piggyback: { api: 'piggyback', emoji: '🐷', texto: 'cargó a', duo: true },
  compartircomida: { api: 'sharefood', emoji: '🍱', texto: 'compartió comida con', duo: true },
  regañar: { api: 'scold', emoji: '😤', texto: 'regañó a', duo: true },
  bromear: { api: 'joke', emoji: '🤣', texto: 'está bromeando', duo: false },
  inclinar: { api: 'bow', emoji: '🙇', texto: 'hizo una reverencia', duo: false },
  girar: { api: 'spin', emoji: '💫', texto: 'está girando', duo: false },
  posar: { api: 'pose', emoji: '📸', texto: 'está posando', duo: false },
  flexionar: { api: 'flex', emoji: '💪', texto: 'está flexionando', duo: false },
  puntitas: { api: 'tiptoe', emoji: '🤫', texto: 'está caminando de puntitas', duo: false },
  picnic: { api: 'picnic', emoji: '🧺', texto: 'está haciendo un picnic', duo: false },
  siesta: { api: 'nap', emoji: '😴', texto: 'está tomando una siesta', duo: false },
  acurrucar: { api: 'cuddle', emoji: '🫂', texto: 'se acurrucó con', duo: true },
  apenado: { api: 'flustered', emoji: '😳', texto: 'está apenado', duo: false },
  mirarcurioso: { api: 'peek', emoji: '👀', texto: 'está mirando curiosamente', duo: false },
  cantar: { api: 'sing', emoji: '🎤', texto: 'está cantando', duo: false },
  saltito: { api: 'hop', emoji: '🐰', texto: 'está dando un saltito', duo: false },
  feliz: { api: 'happy', emoji: '😄', texto: 'está feliz', duo: false }
}

function limpiarJid(jid) {
  if (!jid || typeof jid !== 'string') return null
  return jid.trim()
}

function obtenerSender(m) {
  return limpiarJid(
    m.sender ||
    m.key?.participant ||
    m.participant ||
    m.key?.remoteJid
  )
}

function extraerMensaje(m) {
  let msg = m?.message || m?.msg || m?.key?.message || m

  while (msg) {
    if (msg.ephemeralMessage?.message) {
      msg = msg.ephemeralMessage.message
      continue
    }

    if (msg.viewOnceMessage?.message) {
      msg = msg.viewOnceMessage.message
      continue
    }

    if (msg.viewOnceMessageV2?.message) {
      msg = msg.viewOnceMessageV2.message
      continue
    }

    if (msg.viewOnceMessageV2Extension?.message) {
      msg = msg.viewOnceMessageV2Extension.message
      continue
    }

    if (msg.documentWithCaptionMessage?.message) {
      msg = msg.documentWithCaptionMessage.message
      continue
    }

    break
  }

  return msg || {}
}

function obtenerContextInfo(m) {
  const mensaje = extraerMensaje(m)

  const tipos = [
    'extendedTextMessage',
    'imageMessage',
    'videoMessage',
    'documentMessage',
    'audioMessage',
    'stickerMessage',
    'buttonsResponseMessage',
    'templateButtonReplyMessage',
    'listResponseMessage',
    'interactiveResponseMessage'
  ]

  for (const tipo of tipos) {
    const contextInfo = mensaje?.[tipo]?.contextInfo
    if (contextInfo) return contextInfo
  }

  return null
}

function obtenerMencion(m) {
  const sender = obtenerSender(m)
  const contextInfo = obtenerContextInfo(m)

  const menciones = [
    ...(Array.isArray(m.mentionedJid) ? m.mentionedJid : []),
    ...(Array.isArray(m.mentions) ? m.mentions : []),
    ...(Array.isArray(contextInfo?.mentionedJid) ? contextInfo.mentionedJid : [])
  ]

  const mencion = menciones
    .map(limpiarJid)
    .find(jid => jid && jid !== sender)

  if (mencion) return mencion

  return null
}

function obtenerRespondido(m) {
  const sender = obtenerSender(m)
  const contextInfo = obtenerContextInfo(m)

  const candidatos = [
    m.quoted?.sender,
    m.quoted?.participant,
    m.quoted?.key?.participant,
    m.quoted?.key?.remoteJid,
    m.reply?.sender,
    m.reply?.participant,
    contextInfo?.participant
  ]

  for (const candidato of candidatos) {
    const jid = limpiarJid(candidato)

    if (!jid) continue
    if (jid === sender) continue

    if (jid.endsWith('@g.us')) continue

    return jid
  }

  return null
}

function obtenerObjetivo(m) {
  return obtenerMencion(m) || obtenerRespondido(m)
}

function archivoCache(comando) {
  return path.join(CACHE_DIR, `${comando}.mp4`)
}

async function descargarMedia(comando, api) {
  const archivo = archivoCache(comando)

  try {
    if (fs.existsSync(archivo)) {
      const stat = fs.statSync(archivo)

      if (stat.size > 0) {
        return fs.readFileSync(archivo)
      }
    }
  } catch {}

  const response = await axios.get(API_URL, {
    params: {
      inter: api,
      key: API_KEY
    },
    timeout: TIMEOUT,
    responseType: 'arraybuffer'
  })

  let buffer = Buffer.from(response.data)

  const contentType = response.headers?.['content-type'] || ''

  if (contentType.includes('application/json')) {
    const json = JSON.parse(buffer.toString())

    const url =
      json?.result_url ||
      json?.url ||
      json?.result ||
      json?.data?.url ||
      json?.data?.result_url ||
      json?.video ||
      json?.gif

    if (!url || typeof url !== 'string') {
      throw new Error('La API no devolvió una URL válida')
    }

    const mediaResponse = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT
    })

    buffer = Buffer.from(mediaResponse.data)
  }

  if (!buffer || buffer.length === 0) {
    throw new Error('El archivo descargado está vacío')
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true })

  const temporal = `${archivo}.tmp`

  fs.writeFileSync(temporal, buffer)
  fs.renameSync(temporal, archivo)

  return buffer
}

async function precargarInteracciones() {
  if (!PRELOAD_ON_START) return

  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true })

    const pendientes = Object.entries(interacciones)
      .filter(([comando, accion]) => {
        const archivo = archivoCache(comando)

        if (!fs.existsSync(archivo)) return true

        try {
          return fs.statSync(archivo).size === 0
        } catch {
          return true
        }
      })

    let index = 0

    async function worker() {
      while (index < pendientes.length) {
        const actual = index++
        const [comando, accion] = pendientes[actual]

        try {
          await descargarMedia(comando, accion.api)
          console.log(`✅ Interacción precargada: ${comando}`)
        } catch (error) {
          console.log(`⚠️ Error precargando ${comando}: ${error.message}`)
        }
      }
    }

    const workers = Array.from(
      { length: Math.min(PRELOAD_CONCURRENCY, pendientes.length) },
      () => worker()
    )

    await Promise.all(workers)

    console.log('✅ Precarga de interacciones finalizada')
  } catch (error) {
    console.error('Error en precarga:', error.message)
  }
}

if (PRELOAD_ON_START) {
  precargarInteracciones().catch(console.error)
}

const handler = {}

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid
  const sender = obtenerSender(m)

  if (!chat || !sender) return

  const comando = (m.command || m.cmd || '').toLowerCase()
  const accion = interacciones[comando]

  if (!accion) return

  const objetivo = obtenerObjetivo(m)

  if (accion.duo && !objetivo) {
    await sock.sendMessage(chat, {
      text: `❗ Debes mencionar a alguien o responder a su mensaje para usar .${comando}\n\nEjemplo:\n.${comando} @usuario`
    }, { quoted: m })

    return
  }

  try {
    await sock.sendMessage(chat, {
      react: {
        text: accion.emoji,
        key: m.key
      }
    })

    let buffer

    try {
      buffer = await descargarMedia(comando, accion.api)
    } catch (error) {
      console.error(`Error descargando ${comando}:`, error.message)

      await sock.sendMessage(chat, {
        text: `❌ No pude obtener la animación de *${comando}*. Intenta nuevamente más tarde.`
      }, { quoted: m })

      return
    }

    const nombreSender = `@${sender.split('@')[0]}`

    let texto

    if (accion.duo) {
      const nombreObjetivo = `@${objetivo.split('@')[0]}`

      texto = `${accion.emoji} ${nombreSender} ${accion.texto} ${nombreObjetivo}`
    } else {
      texto = `${accion.emoji} ${nombreSender} ${accion.texto}`
    }

    await sock.sendMessage(chat, {
      video: buffer,
      caption: texto,
      gifPlayback: true,
      mentions: accion.duo ? [sender, objetivo] : [sender]
    }, { quoted: m })

    await sock.sendMessage(chat, {
      react: {
        text: '✅',
        key: m.key
      }
    })

  } catch (error) {
    console.error(`Error en interacción ${comando}:`, error)

    try {
      await sock.sendMessage(chat, {
        text: `❌ Ocurrió un error al ejecutar *${comando}*.`
      }, { quoted: m })
    } catch {}
  }
}

handler.command = Object.keys(interacciones)

handler.help = Object.entries(interacciones).map(([comando, accion]) =>
  accion.duo ? `${comando} <@usuario>` : comando
)

handler.tags = ['interacciones']
handler.menu = true

export default handler
