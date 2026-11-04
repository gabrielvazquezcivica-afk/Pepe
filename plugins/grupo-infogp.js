
import fs from 'node:fs'
import path from 'node:path'

const DB = path.join(process.cwd(), 'database')

function leerJSON(archivo) {
  try {
    const ruta = path.join(DB, archivo)

    if (!fs.existsSync(ruta)) return {}

    return JSON.parse(fs.readFileSync(ruta, 'utf8'))
  } catch {
    return {}
  }
}

function obtenerEstado(datos, id) {
  const valor = datos[id]

  if (typeof valor === 'boolean') return valor

  if (typeof valor === 'object' && valor !== null) {
    return valor.enabled ??
      valor.activo ??
      valor.status ??
      false
  }

  return Boolean(valor)
}

function estado(valor) {
  return valor
    ? '🟢 Activado'
    : '🔴 Desactivado'
}

function obtenerMensaje(datos, id, tipo) {
  const grupo = datos[id] || {}

  const mensaje = tipo === 'bienvenida'
    ? grupo.welcome || grupo.bienvenida || grupo.msg || ''
    : grupo.bye || grupo.despedida || grupo.goodbye || ''

  return typeof mensaje === 'string' && mensaje.trim()
    ? '✏️ Personalizado'
    : '📄 Predeterminado'
}

const handler = async (m, { conn }) => {
  const id = m.chat

  if (!id.endsWith('@g.us')) {
    return m.reply('> ⚠️ Este comando solamente funciona en grupos.')
  }

  const metadata = await conn.groupMetadata(id)
  const participantes = metadata.participants || []

  // Verificar que quien ejecuta sea administrador
  const sender = participantes.find(p => p.id === m.sender)

  if (!sender || !['admin', 'superadmin'].includes(sender.admin)) {
    return m.reply('> ❌ Este comando solamente puede ser utilizado por administradores del grupo.')
  }

  const admins = participantes.filter(p =>
    ['admin', 'superadmin'].includes(p.admin)
  )

  // Leer bases de datos
  const modoadmin = leerJSON('modoadmin.json')
  const antilink = leerJSON('antilink.json')
  const bienvenidas = leerJSON('bienvenidas.json')

  // Obtener configuraciones
  const estadoAntilink = obtenerEstado(antilink, id)
  const estadoModoadmin = obtenerEstado(modoadmin, id)
  const estadoWelcome = obtenerEstado(bienvenidas, id)

  // Obtener mensajes
  const bienvenida = obtenerMensaje(
    bienvenidas,
    id,
    'bienvenida'
  )

  const despedida = obtenerMensaje(
    bienvenidas,
    id,
    'despedida'
  )

  const texto = `
╭━━〔 🐸 PEPE BOT 〕━━╮
┃
┃  📋 INFORMACIÓN DEL GRUPO
┃
┃  🏷️ Nombre:
┃  ${metadata.subject || 'Sin nombre'}
┃
┃  👥 Miembros: ${participantes.length}
┃  👑 Administradores: ${admins.length}
┣━━━━━━━━━━━━━━━━━━
┃  ⚙️ CONFIGURACIONES
┃
┃  🔗 Antilink:
┃  ${estado(estadoAntilink)}
┃
┃  🛡️ Modoadmin:
┃  ${estado(estadoModoadmin)}
┃
┃  👋 Welcome:
┃  ${estado(estadoWelcome)}
┣━━━━━━━━━━━━━━━━━━
┃  💬 MENSAJES DE BIENVENIDA Y SALIDA
┃
┃  📥 Bienvenida:
┃  ${bienvenida}
┃
┃  📤 Despedida:
┃  ${despedida}
┃
╰━━〔 PEPE BOT 〕━━╯
`.trim()

  await conn.sendMessage(id, {
    text: texto
  }, { quoted: m })
}

handler.command = ['infogrupo']
handler.help = ['infogrupo']
handler.tags = ['grupo']
handler.group = true

export default handler
