import config from '../config.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'

const execFileAsync = promisify(execFile)
const handler = {}

handler.run = async (sock, m) => {
const chat = m.chat || m.key?.remoteJid
const sender = String(m.senderNumber || '').replace(/\D/g, '')

const owners = (config.owner || [])
.filter(Boolean)
.map(numero => String(numero).replace(/\D/g, ''))

if (!(m.isOwner || owners.includes(sender))) {
await sock.sendMessage(chat, {
react: { text: '⛔', key: m.key }
}).catch(() => {})

return m.reply('> 🚫 Solo los owners pueden actualizar el bot.')

}

const cwd = '/home/container'

try {
await sock.sendMessage(chat, {
react: { text: '🔄', key: m.key }
}).catch(() => {})

await sock.sendMessage(chat, {
  text: '> 🐸 *PEPE BOT — ACTUALIZADOR*\n\n> 🔍 Comprobando actualizaciones...'
})

if (!fs.existsSync(`${cwd}/.git`)) {
  return sock.sendMessage(chat, {
    text:
      '> ⚠️ No encontré el historial Git del proyecto.\n' +
      '> Este hosting puede tener los archivos subidos sin Git.\n' +
      '> No se modificó ningún archivo.'
  }, { quoted: m })
}

const { stdout: ramaOutput } = await execFileAsync(
  'git',
  ['branch', '--show-current'],
  { cwd, timeout: 15000 }
)

const rama = ramaOutput.trim()

if (!rama) {
  return m.reply('> ⚠️ No pude identificar la rama del repositorio.')
}

await execFileAsync(
  'git',
  ['fetch', 'origin'],
  { cwd, timeout: 60000 }
)

const { stdout: estado } = await execFileAsync(
  'git',
  ['status', '--porcelain'],
  { cwd, timeout: 15000 }
)

if (estado.trim()) {
  return sock.sendMessage(chat, {
    text:
      '> ⚠️ Hay archivos modificados en el servidor.\n' +
      '> Para proteger tus cambios, no se aplicó la actualización.\n' +
      '> Guarda o respalda esos cambios antes de intentarlo de nuevo.'
  }, { quoted: m })
}

const { stdout: comparacion } = await execFileAsync(
  'git',
  ['rev-list', '--count', `HEAD..origin/${rama}`],
  { cwd, timeout: 15000 }
)

const pendientes = Number(comparacion.trim())

if (!pendientes) {
  return sock.sendMessage(chat, {
    text: '> ✅ PEPE BOT ya está actualizado. No hay cambios nuevos.'
  }, { quoted: m })
}

const { stdout: archivos } = await execFileAsync(
  'git',
  ['diff', '--name-only', 'HEAD', `origin/${rama}`],
  { cwd, timeout: 15000 }
)

const packageCambio = archivos
  .split('\n')
  .some(archivo => archivo.trim() === 'package.json')

await execFileAsync(
  'git',
  ['merge', '--ff-only', `origin/${rama}`],
  { cwd, timeout: 60000 }
)

if (packageCambio) {
  await sock.sendMessage(chat, {
    text: '> 📦 Cambió package.json. Instalando dependencias...'
  })

  await execFileAsync(
    'npm',
    ['install', '--no-fund', '--no-audit'],
    { cwd, timeout: 180000 }
  )
}

await sock.sendMessage(chat, {
  react: { text: '✅', key: m.key }
}).catch(() => {})

return sock.sendMessage(chat, {
  text:
    '> ✅ *ACTUALIZACIÓN COMPLETADA*\n\n' +
    `> 📥 Commits nuevos: ${pendientes}\n` +
    `> 🌿 Rama: ${rama}\n` +
    `> 📦 Dependencias: ${packageCambio ? 'actualizadas' : 'sin cambios'}\n\n` +
    '> 🔄 Reinicia el servidor desde el panel para cargar los cambios.'
}, { quoted: m })

} catch (error) {
console.error('[UPDATE ERROR]', error)

await sock.sendMessage(chat, {
  text:
    '> ❌ No se pudo completar la actualización.\n' +
    '> Revisa la consola del servidor para ver el error.\n' +
    '> No uses reset ni fuerces cambios si tienes modificaciones propias.'
}, { quoted: m }).catch(() => {})

}
}

handler.command = ['update', 'actualizar']
handler.help = ['update']
handler.tags = ['owner']
handler.owner = true
handler.menu = true

export default handler