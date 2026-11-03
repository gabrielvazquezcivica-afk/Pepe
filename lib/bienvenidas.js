
import fs from 'fs'
import path from 'path'

const DB_FILE = path.resolve('./database/bienvenidas.json')
const AUDIO_DIR = path.resolve('./database/audios')

// URLs de los audios predeterminados
const DEFAULT_WELCOME_AUDIO = 'https://files.catbox.moe/5yw8fm.mp3'
const DEFAULT_BYE_AUDIO = 'https://files.catbox.moe/swqi7e.mp3'

// Crear carpetas necesarias
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
fs.mkdirSync(AUDIO_DIR, { recursive: true })

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
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

// Obtener imagen con respaldo
async function obtenerImagen(sock, usuario, chat) {
  // 1. Foto del usuario
  try {
    const foto = await sock.profilePictureUrl(usuario, 'image')
    if (foto) return foto
  } catch {}

  // 2. Foto del grupo
  try {
    const foto = await sock.profilePictureUrl(chat, 'image')
    if (foto) return foto
  } catch {}

  // 3. Foto del bot
  try {
    const bot = sock.user?.id
    if (bot) {
      const foto = await sock.profilePictureUrl(bot, 'image')
      if (foto) return foto
    }
  } catch {}

  return null
}

// Crear mensaje
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

  // Si hay mensaje personalizado, no agregar símbolos ">"
  const contenido = personalizado || predeterminado

  return contenido
    .replace(/@user/g, `@${usuario.split('@')[0]}`)
    .replace(/@group/g, grupo)
    .replace(/@count/g, String(cantidad))
}

// Enviar audio
async function enviarAudio(sock, chat, personalizado, predeterminado) {
  try {
    const origen = personalizado || predeterminado
    if (!origen) return

    if (/^https?:\/\//i.test(origen)) {
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
    console.error('Error enviando audio:', error)
  }
}

// Detector de entradas y salidas
export function instalarBienvenidas(sock) {
  sock.ev.on('group-participants.update', async (evento) => {
    try {
      const { id: chat, participants, action } = evento

      if (!chat || !Array.isArray(participants)) return
      if (!['add', 'remove'].includes(action)) return

      const db = cargarDB()
      const configuracion = db[chat] || {}

      // Bienvenida activada por defecto
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

        const imagen = await obtenerImagen(sock, usuario, chat)

        // Enviar imagen o texto
        if (imagen) {
          await sock.sendMessage(chat, {
            image: { url: imagen },
            caption: texto,
            mentions: [usuario]
          })
        } else {
          await sock.sendMessage(chat, {
            text: texto,
            mentions: [usuario]
          })
        }

        // Audio personalizado o predeterminado
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
      console.error('Error en bienvenida/despedida:', error)
    }
  })
}
