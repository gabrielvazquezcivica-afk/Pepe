import axios from 'axios'

const API_URL = 'https://api.stellarwa.xyz/sfw/interaction'
const API_KEY = 'api-xyjFx'

const interacciones = {
  abrazar: {
    api: 'hug',
    texto: '🤗 @usuario recibió un abrazo',
    reaccion: '🤗'
  },
  consolar: {
    api: 'comfort',
    texto: '🫂 @usuario está siendo consolado',
    reaccion: '🫂'
  },
  saludar: {
    api: 'wave',
    texto: '👋 @usuario recibió un saludo',
    reaccion: '👋'
  },
  acariciar: {
    api: 'pat',
    texto: '🐾 @usuario recibió una caricia',
    reaccion: '🐾'
  },
  sonreir: {
    api: 'smile',
    texto: '😊 @usuario está sonriendo',
    reaccion: '😊'
  },
  felicitar: {
    api: 'congratulate',
    texto: '🎉 @usuario recibió una felicitación',
    reaccion: '🎉'
  },
  chocar5: {
    api: 'highfive',
    texto: '🙌 @usuario chocó los cinco',
    reaccion: '🙌'
  },
  animar: {
    api: 'cheer',
    texto: '💪 @usuario está siendo animado',
    reaccion: '💪'
  },
  bailar: {
    api: 'dance',
    texto: '💃 @usuario está bailando',
    reaccion: '💃'
  },
  reir: {
    api: 'laugh',
    texto: '😂 @usuario está riendo',
    reaccion: '😂'
  },
  llorar: {
    api: 'cry',
    texto: '😢 @usuario está llorando',
    reaccion: '😢'
  },
  pensar: {
    api: 'think',
    texto: '🤔 @usuario está pensando',
    reaccion: '🤔'
  },
  pensarprofundo: {
    api: 'deepthink',
    texto: '🧠 @usuario está pensando profundamente',
    reaccion: '🧠'
  },
  dormir: {
    api: 'sleep',
    texto: '😴 @usuario se fue a dormir',
    reaccion: '😴'
  },
  aplaudir: {
    api: 'clap',
    texto: '👏 @usuario está aplaudiendo',
    reaccion: '👏'
  },
  saltar: {
    api: 'jump',
    texto: '🦘 @usuario está saltando',
    reaccion: '🦘'
  },
  caminar: {
    api: 'walk',
    texto: '🚶 @usuario está caminando',
    reaccion: '🚶'
  },
  bostezar: {
    api: 'yawn',
    texto: '🥱 @usuario está bostezando',
    reaccion: '🥱'
  },
  estudiar: {
    api: 'study',
    texto: '📚 @usuario está estudiando',
    reaccion: '📚'
  },
  cocinar: {
    api: 'cook',
    texto: '🍳 @usuario está cocinando',
    reaccion: '🍳'
  },
  saludar2: {
    api: 'salute',
    texto: '🫡 @usuario está saludando',
    reaccion: '🫡'
  },
  celebrar: {
    api: 'celebrate',
    texto: '🥳 @usuario está celebrando',
    reaccion: '🥳'
  },
  proteger: {
    api: 'protect',
    texto: '🛡️ @usuario está protegiendo',
    reaccion: '🛡️'
  },
  disculparse: {
    api: 'sorry',
    texto: '🥺 @usuario se disculpa',
    reaccion: '🥺'
  },
  chocarpuños: {
    api: 'fistbump',
    texto: '👊 @usuario chocó los puños',
    reaccion: '👊'
  },
  curioso: {
    api: 'curious',
    texto: '🧐 @usuario está curioso',
    reaccion: '🧐'
  },
  olfatear: {
    api: 'sniff',
    texto: '🐽 @usuario está olfateando',
    reaccion: '🐽'
  },
  mirar: {
    api: 'look',
    texto: '👀 @usuario está mirando',
    reaccion: '👀'
  },
  kiss: {
    api: 'kiss',
    texto: '💋 @usuario recibió un beso',
    reaccion: '💋'
  },
  cosquillas: {
    api: 'tickle',
    texto: '🤣 @usuario está recibiendo cosquillas',
    reaccion: '🤣'
  },
  gritar: {
    api: 'scream',
    texto: '😱 @usuario está gritando',
    reaccion: '😱'
  },
  frio: {
    api: 'cold',
    texto: '🥶 @usuario tiene frío',
    reaccion: '🥶'
  },
  jugar: {
    api: 'play',
    texto: '🎮 @usuario está jugando',
    reaccion: '🎮'
  },
  dibujar: {
    api: 'draw',
    texto: '🎨 @usuario está dibujando',
    reaccion: '🎨'
  },
  llamar: {
    api: 'call',
    texto: '📞 @usuario está llamando',
    reaccion: '📞'
  },
  aburrido: {
    api: 'bored',
    texto: '🥱 @usuario está aburrido',
    reaccion: '🥱'
  },
  dramatico: {
    api: 'dramatic',
    texto: '🎭 @usuario está siendo dramático',
    reaccion: '🎭'
  },
  cafe: {
    api: 'coffee',
    texto: '☕ @usuario está tomando café',
    reaccion: '☕'
  },
  enojado: {
    api: 'angry',
    texto: '😡 @usuario está enojado',
    reaccion: '😡'
  },
  bleh: {
    api: 'bleh',
    texto: '😝 @usuario sacó la lengua',
    reaccion: '😝'
  },
  nope: {
    api: 'nope',
    texto: '🙅 @usuario dijo que no',
    reaccion: '🙅'
  },
  puchero: {
    api: 'pout',
    texto: '🥺 @usuario está haciendo pucheros',
    reaccion: '🥺'
  },
  correr: {
    api: 'run',
    texto: '🏃 @usuario está corriendo',
    reaccion: '🏃'
  },
  triste: {
    api: 'sad',
    texto: '😢 @usuario está triste',
    reaccion: '😢'
  },
  asustado: {
    api: 'scared',
    texto: '😨 @usuario está asustado',
    reaccion: '😨'
  },
  timido: {
    api: 'shy',
    texto: '😳 @usuario está tímido',
    reaccion: '😳'
  },
  guinar: {
    api: 'wink',
    texto: '😉 @usuario guiñó el ojo',
    reaccion: '😉'
  },
  comer: {
    api: 'eat',
    texto: '🍜 @usuario está comiendo',
    reaccion: '🍜'
  },
  sonrojar: {
    api: 'blush',
    texto: '😊 @usuario está sonrojado',
    reaccion: '😊'
  },
  presumir: {
    api: 'flex',
    texto: '😎 @usuario está presumiendo',
    reaccion: '😎'
  },
  hablar: {
    api: 'talk',
    texto: '💬 @usuario está hablando',
    reaccion: '💬'
  },
  estornudar: {
    api: 'sneeze',
    texto: '🤧 @usuario está estornudando',
    reaccion: '🤧'
  },
  enfermo: {
    api: 'sick',
    texto: '🤒 @usuario está enfermo',
    reaccion: '🤒'
  },
  limpiar: {
    api: 'clean',
    texto: '🧹 @usuario está limpiando',
    reaccion: '🧹'
  },
  vergüenza: {
    api: 'embarrassed',
    texto: '😳 @usuario tiene vergüenza',
    reaccion: '😳'
  },
  facepalm: {
    api: 'facepalm',
    texto: '🤦 @usuario hizo facepalm',
    reaccion: '🤦'
  },
  boop: {
    api: 'boop',
    texto: '👉 @usuario recibió un boop',
    reaccion: '👉'
  },
  piggyback: {
    api: 'piggyback',
    texto: '🐷 @usuario está cargando a alguien',
    reaccion: '🐷'
  },
  compartircomida: {
    api: 'sharefood',
    texto: '🍱 @usuario está compartiendo comida',
    reaccion: '🍱'
  },
  regañar: {
    api: 'scold',
    texto: '😤 @usuario está siendo regañado',
    reaccion: '😤'
  },
  bromear: {
    api: 'joke',
    texto: '🤣 @usuario está bromeando',
    reaccion: '🤣'
  },
  inclinar: {
    api: 'bow',
    texto: '🙇 @usuario está haciendo una reverencia',
    reaccion: '🙇'
  },
  girar: {
    api: 'spin',
    texto: '💫 @usuario está girando',
    reaccion: '💫'
  },
  posar: {
    api: 'pose',
    texto: '📸 @usuario está posando',
    reaccion: '📸'
  },
  flexionar: {
    api: 'flex',
    texto: '💪 @usuario está flexionando',
    reaccion: '💪'
  },
  puntitas: {
    api: 'tiptoe',
    texto: '🤫 @usuario está caminando de puntitas',
    reaccion: '🤫'
  },
  picnic: {
    api: 'picnic',
    texto: '🧺 @usuario está haciendo un picnic',
    reaccion: '🧺'
  },
  siesta: {
    api: 'nap',
    texto: '😴 @usuario está tomando una siesta',
    reaccion: '😴'
  },
  acurrucar: {
    api: 'cuddle',
    texto: '🫂 @usuario está acurrucándose',
    reaccion: '🫂'
  },
  apenado: {
    api: 'flustered',
    texto: '😳 @usuario está apenado',
    reaccion: '😳'
  },
  mirarcurioso: {
    api: 'peek',
    texto: '👀 @usuario está mirando curiosamente',
    reaccion: '👀'
  },
  cantar: {
    api: 'sing',
    texto: '🎤 @usuario está cantando',
    reaccion: '🎤'
  },
  saltito: {
    api: 'hop',
    texto: '🐰 @usuario está dando un saltito',
    reaccion: '🐰'
  },
  feliz: {
    api: 'happy',
    texto: '😄 @usuario está feliz',
    reaccion: '😄'
  }
}

const handler = {}

handler.command = Object.keys(interacciones)
handler.help = Object.keys(interacciones)
handler.tags = ['interacciones']
handler.menu = true

handler.run = async (sock, m, args = []) => {
  const chat = m.chat || m.key?.remoteJid
  const comando = m.command?.toLowerCase()
  const accion = interacciones[comando]

  if (!accion) return

  const persona1 = m.mentionedJid?.[0] ||
    m.quoted?.sender ||
    m.sender

  const nombre = persona1.split('@')[0]

  const texto = accion.texto.replace(
    '@usuario',
    `@${nombre}`
  )

  const mentions = [persona1]

  // Reacción inmediata
  await sock.sendMessage(chat, {
    react: {
      text: accion.reaccion || '⚡',
      key: m.key
    }
  }).catch(() => {})

  try {
    const response = await axios.get(API_URL, {
      params: {
        inter: accion.api,
        key: API_KEY
      },
      timeout: 15000,
      responseType: 'arraybuffer',
      headers: {
        Accept: '*/*'
      }
    })

    const contentType =
      response.headers['content-type'] || ''

    let media

    // Detectar respuestas JSON
    if (
      contentType.includes('application/json') ||
      contentType.includes('text/json')
    ) {
      const data = JSON.parse(
        Buffer.from(response.data).toString('utf8')
      )

      media =
        data.result_url ||
        data.url ||
        data.result ||
        data.data?.url ||
        data.data?.result_url ||
        data.video ||
        data.gif

      if (typeof media === 'object' && media !== null) {
        media = media.url || media.result_url
      }

      if (!media) {
        throw new Error('La API no devolvió una URL')
      }
    } else {
      // Respuesta multimedia directa
      media = Buffer.from(response.data)
    }

    // Enviar GIF o video
    await sock.sendMessage(chat, {
      video: typeof media === 'string'
        ? { url: media }
        : media,
      gifPlayback: true,
      caption: texto,
      mentions
    }, {
      quoted: m
    })

  } catch (error) {
    console.error(
      `[INTERACCIONES] ${comando}:`,
      error.message
    )

    const mensaje = error.code === 'ECONNABORTED'
      ? '⏳ La API tardó demasiado en responder. Intenta nuevamente.'
      : '❌ No se pudo obtener la interacción.'

    await sock.sendMessage(chat, {
      text: mensaje,
      mentions
    }, {
      quoted: m
    }).catch(() => {})
  }
}

export default handler