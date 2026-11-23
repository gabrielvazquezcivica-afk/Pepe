import axios from 'axios'
import fs from 'node:fs'
import path from 'node:path'

const API_URL = 'https://api.stellarwa.xyz/sfw/interaction'
const API_KEY = 'TU_API_KEY'

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

const handler = {}

handler.command = Object.keys(interacciones)
handler.help = Object.entries(interacciones).map(([cmd, data]) =>
  data.duo ? `${cmd} <@usuario>` : cmd
)
handler.tags = ['interacciones']
handler.menu = true

function obtenerArchivo(comando) {
  return path.join(CACHE_DIR, `${comando}.mp4`)
}

function archivoExiste(comando) {
  const archivo = obtenerArchivo(comando)

  try {
    return fs.existsSync(archivo) &&
      fs.statSync(archivo).size > 0
  } catch {
    return false
  }
}

async function descargarMedia(comando, api) {
  const archivo = obtenerArchivo(comando)

  if (archivoExiste(comando)) {
    return fs.promises.readFile(archivo)
  }

  const response = await axios.get(API_URL, {
    params: {
      inter: api,
      key: API_KEY
    },
    timeout: TIMEOUT,
    responseType: 'arraybuffer'
  })

  const contentType = response.headers['content-type'] || ''
  let buffer

  const contenido = Buffer.from(response.data)

  const pareceJSON =
    contentType.includes('json') ||
    contenido.toString('utf8', 0, 1).trim() === '{'

  if (pareceJSON) {
    const data = JSON.parse(contenido.toString('utf8'))

    let url =
      data.result_url ||
      data.url ||
      data.result ||
      data.data?.url ||
      data.data?.result_url ||
      data.video ||
      data.gif

    if (typeof url === 'object' && url !== null) {
      url = url.url || url.result_url
    }

    if (!url) {
      throw new Error('La API no devolvió una URL')
    }

    const descarga = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT
    })

    buffer = Buffer.from(descarga.data)
  } else {
    buffer = contenido
  }

  if (!buffer || !buffer.length) {
    throw new Error('Media vacío')
  }

  await fs.promises.mkdir(CACHE_DIR, {
    recursive: true
  })

  const temporal = `${archivo}.tmp`

  await fs.promises.writeFile(temporal, buffer)
  await fs.promises.rename(temporal, archivo)

  return buffer
}

// Precarga en segundo plano
async function precargarInteracciones() {
  if (!PRELOAD_ON_START) return

  await fs.promises.mkdir(CACHE_DIR, {
    recursive: true
  })

  const pendientes = Object.entries(interacciones)
    .filter(([comando]) => !archivoExiste(comando))

  console.log(`[INTERACCIONES] ${pendientes.length} archivos pendientes de precarga`)

  let indice = 0

  async function trabajador() {
    while (indice < pendientes.length) {
      const actual = pendientes[indice++]
      const [comando, accion] = actual

      try {
        await descargarMedia(comando, accion.api)
        console.log(`[INTERACCIONES] Guardado: ${comando}`)
      } catch (error) {
        console.error(`[INTERACCIONES] No se pudo precargar ${comando}: ${error.message}`)
      }
    }
  }

  const trabajadores = Array.from(
    { length: PRELOAD_CONCURRENCY },
    () => trabajador()
  )

  await Promise.all(trabajadores)

  console.log('[INTERACCIONES] Precarga finalizada')
}

// No bloquea el inicio del bot
precargarInteracciones().catch(error => {
  console.error('[INTERACCIONES] Error en precarga:', error.message)
})

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid
  const comando = m.command?.toLowerCase()
  const accion = interacciones[comando]

  if (!accion) return

  const mencionados = m.mentionedJid || []
  const citado = m.quoted?.sender

  let objetivo = mencionados[0] || citado

  // Interacciones de dos personas
  if (accion.duo && !objetivo) {
    return sock.sendMessage(chat, {
      text: `❌ Debes mencionar a alguien.\n\nEjemplo: .${comando} @usuario`,
    }, {
      quoted: m
    })
  }

  const autor = m.sender
  const nombreAutor = autor.split('@')[0]

  let texto
  let mentions

  if (accion.duo) {
    const nombreObjetivo = objetivo.split('@')[0]

    texto = `✨ @${nombreAutor} ${accion.texto} @${nombreObjetivo}`
    mentions = [autor, objetivo]
  } else {
    texto = `✨ @${nombreAutor} ${accion.texto}`
    mentions = [autor]
  }

  // Reacción instantánea
  sock.sendMessage(chat, {
    react: {
      text: accion.emoji,
      key: m.key
    }
  }).catch(() => {})

  try {
    const media = await descargarMedia(comando, accion.api)

    await sock.sendMessage(chat, {
      video: media,
      gifPlayback: true,
      caption: texto,
      mentions
    }, {
      quoted: m
    })

  } catch (error) {
    console.error(`[INTERACCIONES] ${comando}:`, error.message)

    await sock.sendMessage(chat, {
      text: '❌ No se pudo enviar la interacción. Intenta nuevamente.',
      mentions
    }, {
      quoted: m
    }).catch(() => {})
  }
}

export default handler