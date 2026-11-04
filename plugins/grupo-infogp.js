
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

const handler = async (m, { conn }) => {
  try {
    const id = m.chat

    if (!id.endsWith('@g.us')) {
      return m.reply('> ⚠️ Este comando solamente funciona en grupos.')
    }

    const metadata = await conn.groupMetadata(id)
    const participantes = metadata.participants || []

    // Comprobar administrador
    const sender = m.sender
    const usuario = participantes.find(p => p.id === sender)

    const esAdmin = usuario?.admin === 'admin' ||
      usuario?.admin === 'superadmin'

    if (!esAdmin) {
      return m.reply('> ❌ Este comando solamente puede ser utilizado por administradores.')
    }

    // Leer bases de datos
    const modoadmin = leerJSON('modoadmin.json')
    const antilink = leerJSON('antilink.json')
    const bienvenidas = leerJSON('bienvenidas.json')

    // Obtener administradores
    const admins = participantes.filter(p =>
      p.admin === 'admin' ||
      p.admin === 'superadmin'
    )

    // Descripción
    const descripcion = metadata.desc?.trim() ||
      'Sin descripción'

    // Estados
    const estadoAntilink = estado(
      obtenerEstado(antilink, id)
    )

    const estadoModoadmin = estado(
      obtenerEstado(modoadmin, id)
    )

    const estadoWelcome = estado(
      obtenerEstado(bienvenidas, id)
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
┃
┣━━━━━━━━━━━━━━━━━━
┃  📝 DESCRIPCIÓN
┃
┃  ${descripcion}
┃
┣━━━━━━━━━━━━━━━━━━
┃  ⚙️ CONFIGURACIONES
┃
┃   🔗 Antilink: ${estadoAntilink}
┃
┃   🛡️ Modoadmin: ${estadoModoadmin}
┃
┃   👋 Welcome: ${estadoWelcome}
┃
╰━━〔 🐸 PEPE BOT 〕━━╯
`.trim()

    await conn.sendMessage(id, {
      text: texto
    }, {
      quoted: m
    })

  } catch (error) {
    console.error('[INFOGRUPO]', error)

    m.reply('> ❌ Ocurrió un error al obtener la información del grupo.')
  }
}

handler.command = ['infogrupo']
handler.help = ['infogrupo']
handler.tags = ['grupo']
handler.group = true
handler.admin = true

export default handler
