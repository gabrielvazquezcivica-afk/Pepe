
const handler = {}

const url = `${api.url}/sfw/interaction?inter=${encodeURIComponent(accion.api)}&key=${api.key}`
const respuesta = await fetch(url)

const interacciones = {
  abrazar: {
    api: 'hug',
    texto: (a, b) => `> ${a} abrazó a ${b}`
  },
  saludar: {
    api: 'wave',
    texto: (a, b) => `> ${a} saludó a ${b}`
  },
  acariciar: {
    api: 'pat',
    texto: (a, b) => `> ${a} acarició a ${b}`
  },
  sonreir: {
    api: 'smile',
    texto: (a, b) => `> ${a} le sonrió a ${b}`
  },
  felicitar: {
    api: 'happy',
    texto: (a, b) => `> ${a} felicitó a ${b}`
  },
  chocar5: {
    api: 'highfive',
    texto: (a, b) => `> ${a} chocó los cinco con ${b}`
  },
  animar: {
    api: 'cheer',
    texto: (a, b) => `> ${a} animó a ${b}`
  },
  bailar: {
    api: 'dance',
    texto: (a, b) => `> ${a} bailó con ${b}`
  },
  reir: {
    api: 'laugh',
    texto: (a, b) => `> ${a} se rio con ${b}`
  },
  llorar: {
    api: 'cry',
    texto: (a, b) => `> ${a} está llorando`
  },
  pensar: {
    api: 'think',
    texto: (a, b) => `> ${a} se quedó pensando`
  },
  dormir: {
    api: 'sleep',
    texto: (a, b) => `> ${a} se quedó dormido`
  }
}

handler.run = async (sock, m, args = []) => {
  try {
    const comando = String(m.command || '').toLowerCase()
    const accion = interacciones[comando]

    if (!accion) return

    const mencionado = m.mentionedJid?.[0]
    const citado = m.quoted?.sender
    const objetivo = mencionado || citado

    if (
      ['abrazar', 'saludar', 'acariciar', 'felicitar', 'chocar5', 'animar', 'bailar'].includes(comando) &&
      !objetivo
    ) {
      return m.reply(`> Menciona o responde al mensaje de alguien para usar este comando.`)
    }

    const nombreUsuario = m.pushName || 'Alguien'
    let nombreObjetivo = 'a sí mismo'

    if (objetivo) {
      nombreObjetivo = `@${objetivo.split('@')[0]}`
    }

    const respuesta = await fetch(
      `${API_URL}?inter=${encodeURIComponent(accion.api)}&key=${encodeURIComponent(API_KEY)}`
    )

    if (!respuesta.ok) {
      throw new Error(`La API respondió con estado ${respuesta.status}`)
    }

    const buffer = Buffer.from(await respuesta.arrayBuffer())

    if (!buffer.length) {
      throw new Error('La API no devolvió contenido')
    }

    await sock.sendMessage(
      m.chat,
      {
        video: buffer,
        gifPlayback: true,
        caption: accion.texto(nombreUsuario, nombreObjetivo),
        mentions: objetivo ? [objetivo] : []
      },
      { quoted: m }
    )
  } catch (error) {
    console.error('[PEPE BOT - INTERACCIONES]', error)
    await m.reply('> Ocurrió un error al realizar la interacción. Inténtalo más tarde.')
  }
}

handler.command = [
  'abrazar',
  'saludar',
  'acariciar',
  'sonreir',
  'felicitar',
  'chocar5',
  'animar',
  'bailar',
  'reir',
  'llorar',
  'pensar',
  'dormir'
]

handler.help = [
  'abrazar',
  'saludar',
  'acariciar',
  'sonreir',
  'felicitar',
  'chocar5',
  'animar',
  'bailar',
  'reir',
  'llorar',
  'pensar',
  'dormir'
]

handler.tags = ['juegos']
handler.menu = true

export default handler