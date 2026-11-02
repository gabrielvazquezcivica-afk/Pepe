import fs from 'fs'
import path from 'path'

const DB_FILE = path.resolve('./database/bienvenidas.json')
const AUDIO_DIR = path.resolve('./database/audios')

// 🔊 AUDIOS PREDETERMINADOS
const DEFAULT_WELCOME_AUDIO = 'https://TU-URL-DE-BIENVENIDA.mp3'
const DEFAULT_BYE_AUDIO = 'https://TU-URL-DE-DESPEDIDA.mp3'

// Crear carpetas si no existen
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
}

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true })
}

// Leer base de datos
function cargarDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return {}
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch (error) {
    console.error('Error leyendo bienvenidas.json:', error)
    return {}
  }
}

// Guardar base de datos
function guardarDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  } catch (error) {
    console.error('Error guardando bienvenidas.json:', error)
  }
}

// Crear texto
function obtenerTexto(tipo, usuario, grupo, cantidad, personalizado) {
  const predeterminado = tipo === 'welcome'
    ? [
        '> 🐸 ¡Bienvenido/a @user a @group!',
        '> 🎉 Ahora somos @count integrantes.',
        '> ¡Esperamos que disfrutes tu estancia!'
      ].join('\n')
    : [
        '> 👋 ¡Hasta pronto @user!',
        '> 🚪 Ha salido de @group.',
        '> Ahora somos @count integrantes.'
      ].join('\n')

  return (personalizado || predeterminado)
    .replace(/@user/g, `@${usuario.split('@')[0]}`)
    .replace(/@group/g, grupo)
    .replace(/@count/g, String(cantidad))
}

// Enviar audio
async function enviarAudio(sock, chat, audioPersonalizado, audioPredeterminado) {
  try {
    const origen = audioPersonalizado || audioPredeterminado

    if (!origen) return

    const esURL = /^https?:\/\//i.test(origen)

    if (esURL) {
      await sock.sendMessage(chat, {
        audio: { url: origen },
        mimetype: 'audio/mpeg',
        ptt: false
      })
      return
    }

    if (fs.existsSync(origen)) {
      await sock.sendMessage(chat, {
        audio: fs.readFileSync(origen),
        mimetype: 'audio/mpeg',
        ptt: false
      })
    }
  } catch (error) {
    console.error('Error enviando audio de bienvenida/despedida:', error)
  }
}

// Instalar detector
export function instalarBienvenidas(sock) {
  sock.ev.on('group-participants.update', async (evento) => {
    try {
      const { id: chat, participants, action } = evento

      if (!chat || !Array.isArray(participants)) return
      if (action !== 'add' && action !== 'remove') return

      const db = cargarDB()
      const configuracion = db[chat] || {}

      // La bienvenida está activada por defecto
      if (action === 'add' && configuracion.welcome === false) return

      const metadata = await sock.groupMetadata(chat)
      const grupo = metadata.subject || 'este grupo'
      const cantidad = metadata.participants?.length || 0

      for (const participante of participants) {
        const usuario = typeof participante === 'string'
          ? participante
          : participante.id || participante.jid

        if (!usuario) continue

        const tipo = action === 'add' ? 'welcome' : 'bye'

        const personalizado = tipo === 'welcome'
          ? configuracion.welcomeMessage
          : configuracion.byeMessage

        const texto = obtenerTexto(
          tipo,
          usuario,
          grupo,
          cantidad,
          personalizado
        )

        await sock.sendMessage(chat, {
          text: texto,
          mentions: [usuario]
        })

        const audioPersonalizado = tipo === 'welcome'
          ? configuracion.welcomeAudio || configuracion.welcomeAudioFile
          : configuracion.byeAudio || configuracion.byeAudioFile

        const audioPredeterminado = tipo === 'welcome'
          ? DEFAULT_WELCOME_AUDIO
          : DEFAULT_BYE_AUDIO

        await enviarAudio(
          sock,
          chat,
          audioPersonalizado,
          audioPredeterminado
        )
      }
    } catch (error) {
      console.error('Error en el detector de bienvenida/despedida:', error)
    }
  })
}