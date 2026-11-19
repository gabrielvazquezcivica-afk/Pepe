import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.resolve('./database/bienvenidas.json')
const AUDIO_DIR = path.resolve('./database/audios')

const DEFAULT_WELCOME_AUDIO = 'https://files.catbox.moe/5yw8fm.mp3'
const DEFAULT_BYE_AUDIO = 'https://files.catbox.moe/swqi7e.mp3'

// Crear carpetas necesarias
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
fs.mkdirSync(AUDIO_DIR, { recursive: true })

function cargarDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return {}

    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch (error) {
    console.error('Error leyendo bienvenidas.json:', error)
    return {}
  }
}

function guardarDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

async function obtenerImagen(sock, usuario, chat) {
  try {
    const foto = await sock.profilePictureUrl(usuario, 'image')
    if (foto) return foto
  } catch {}

  try {
    const foto = await sock.profilePictureUrl(chat, 'image')
    if (foto) return foto
  } catch {}

  try {
    const bot = sock.user?.id

    if (bot) {
      const foto = await sock.profilePictureUrl(bot, 'image')
      if (foto) return foto
    }
  } catch {}

  return null
}

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

// Normalizar IDs para compararlos
function normalizarId(id) {
  return String(id || '')
    .replace(/:\d+@/, '@')
    .trim()
    .toLowerCase()
}

// Obtener identificadores de un participante
function obtenerIds(participante) {
  if (typeof participante === 'string') {
    return [normalizarId(participante)]
  }

  if (!participante) return []

  return [
    participante.id,
    participante.jid,
    participante.lid,
    participante.phoneNumber
  ]
    .filter(Boolean)
    .map(normalizarId)
}

// Evitar instalar varias veces el sistema en el mismo socket
const socketsInstalados = new WeakSet()

export function instalarBienvenidas(sock) {
  if (socketsInstalados.has(sock)) {
    console.log('[BIENVENIDAS] Sistema ya instalado en este socket.')
    return
  }

  socketsInstalados.add(sock)

  let listo = false
  let preparando = false

  // Lista de integrantes existentes al iniciar
  const integrantesIniciales = new Map()

  // Procesar eventos nuevos
  const listener = async (evento) => {
    try {
      if (!listo) return

      const {
        id: chat,
        participants,
        action
      } = evento

      if (!chat || !Array.isArray(participants)) return
      if (!['add', 'remove'].includes(action)) return

      const db = cargarDB()
      const configuracion = db[chat] || {}

      if (action === 'add' && configuracion.welcome === false) return
      if (action === 'remove' && configuracion.bye === false) return

      const integrantes = integrantesIniciales.get(chat)

      // Si no tenemos una lista inicial del grupo,
      // ignoramos el evento para evitar mensajes atrasados.
      if (!integrantes) return

      const metadata = await sock.groupMetadata(chat)

      const grupo = metadata.subject || 'este grupo'
      const cantidad = metadata.participants?.length || 0

      for (const participante of participants) {
        const ids = obtenerIds(participante)

        if (!ids.length) continue

        const yaExistia = ids.some(id => integrantes.has(id))

        // Ignorar entradas antiguas
        if (action === 'add' && yaExistia) {
          continue
        }

        // Ignorar salidas antiguas
        if (action === 'remove' && !yaExistia) {
          continue
        }

        // Actualizar la lista de integrantes
        if (action === 'add') {
          ids.forEach(id => integrantes.add(id))
        } else {
          ids.forEach(id => integrantes.delete(id))
        }

        const usuario = ids[0]

        if (!usuario) continue

        const tipo = action === 'add'
          ? 'welcome'
          : 'bye'

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

        // Enviar mensaje
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
      console.error('[BIENVENIDAS] Error procesando evento:', error)
    }
  }

  sock.ev.on('group-participants.update', listener)

  // Preparar lista inicial al conectar
  sock.ev.on('connection.update', async (update) => {
    if (update.connection === 'close') {
      listo = false
      preparando = false
      integrantesIniciales.clear()

      sock.ev.off('group-participants.update', listener)

      return
    }

    if (update.connection !== 'open') return
    if (preparando) return

    preparando = true
    listo = false

    try {
      integrantesIniciales.clear()

      console.log('[BIENVENIDAS] Obteniendo integrantes actuales...')

      const grupos = await sock.groupFetchAllParticipating()

      for (const [chat, metadata] of Object.entries(grupos || {})) {
        const integrantes = new Set()

        for (const participante of metadata.participants || []) {
          obtenerIds(participante).forEach(id => {
            integrantes.add(id)
          })
        }

        integrantesIniciales.set(chat, integrantes)
      }

      // Esperar a que termine la sincronización inicial
      await new Promise(resolve => setTimeout(resolve, 3000))

      listo = true

      console.log(
        `[BIENVENIDAS] Sistema activo. ${integrantesIniciales.size} grupos sincronizados.`
      )
    } catch (error) {
      listo = false

      console.error(
        '[BIENVENIDAS] Error preparando integrantes:',
        error
      )
    } finally {
      preparando = false
    }
  })
}