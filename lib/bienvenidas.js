
import fs from 'node:fs'
import path from 'node:path'

const DB_FILE = path.resolve('./database/bienvenidas.json')

const DEFAULT_WELCOME_AUDIO = 'https://files.catbox.moe/5yw8fm.mp3'
const DEFAULT_BYE_AUDIO = 'https://files.catbox.moe/swqi7e.mp3'

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })

function cargarDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return {}
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch (error) {
    console.error('[BIENVENIDAS] Error leyendo DB:', error)
    return {}
  }
}

function normalizarId(id) {
  return String(id || '')
    .replace(/:\d+@/, '@')
    .trim()
    .toLowerCase()
}

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
    console.error('[BIENVENIDAS] Error enviando audio:', error)
  }
}

const socketsInstalados = new WeakSet()

export function instalarBienvenidas(sock) {
  if (!sock?.ev || socketsInstalados.has(sock)) return

  socketsInstalados.add(sock)

  let listo = false
  let preparando = false

  const integrantesIniciales = new Map()

  async function prepararGrupos() {
    if (preparando) return

    preparando = true
    listo = false

    try {
      console.log('[BIENVENIDAS] Sincronizando grupos...')

      const grupos = await sock.groupFetchAllParticipating()

      integrantesIniciales.clear()

      for (const [chat, metadata] of Object.entries(grupos || {})) {
        const integrantes = new Set()

        for (const participante of metadata.participants || []) {
          for (const id of obtenerIds(participante)) {
            integrantes.add(id)
          }
        }

        integrantesIniciales.set(chat, integrantes)
      }

      await new Promise(resolve => setTimeout(resolve, 2000))

      listo = true

      console.log(
        `[BIENVENIDAS] Activo en ${integrantesIniciales.size} grupos.`
      )
    } catch (error) {
      listo = false
      console.error('[BIENVENIDAS] Error sincronizando grupos:', error)
    } finally {
      preparando = false
    }
  }

  async function procesarEvento(evento) {
    try {
      if (!listo) return

      const { id: chat, participants, action } = evento || {}

      if (!chat || !Array.isArray(participants)) return
      if (!['add', 'remove'].includes(action)) return

      const db = cargarDB()
      const configuracion = db[chat] || {}

      if (action === 'add' && configuracion.welcome !== true) return
      if (action === 'remove' && configuracion.bye !== true) return

      const integrantes = integrantesIniciales.get(chat)
      if (!integrantes) return

      let metadata

      try {
        metadata = await sock.groupMetadata(chat)
      } catch (error) {
        console.error('[BIENVENIDAS] Error obteniendo grupo:', error)
        return
      }

      const grupo = metadata.subject || 'este grupo'
      const cantidad = metadata.participants?.length || 0

      for (const participante of participants) {
        const ids = obtenerIds(participante)
        if (!ids.length) continue

        const yaExistia = ids.some(id => integrantes.has(id))

        if (action === 'add' && yaExistia) continue
        if (action === 'remove' && !yaExistia) continue

        if (action === 'add') {
          ids.forEach(id => integrantes.add(id))
        } else {
          ids.forEach(id => integrantes.delete(id))
        }

        const usuario = ids[0]
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

  // Este listener permanece instalado durante las reconexiones.
  sock.ev.on('group-participants.update', procesarEvento)

  sock.ev.on('connection.update', update => {
    if (update.connection === 'close') {
      listo = false
      integrantesIniciales.clear()
      return
    }

    if (update.connection === 'open') {
      prepararGrupos()
    }
  })

  // También funciona si el socket ya estaba conectado al instalarlo.
  if (sock.user?.id) {
    prepararGrupos()
  }

  console.log('[BIENVENIDAS] Listener instalado.')
}
