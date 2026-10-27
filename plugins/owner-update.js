import config from '../config.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const handler = {}

const cwd = '/home/container'

handler.run = async (sock, m) => {
const chat = m.chat || m.key?.remoteJid

const sender = String(m.senderNumber || '').replace(/\D/g, '')
const owners = (config.owner || [])
.filter(Boolean)
.map(numero => String(numero).replace(/\D/g, ''))

const isOwner = Boolean(m.isOwner || owners.includes(sender))

if (!isOwner) {
await sock.sendMessage(chat, {
react: { text: '⛔', key: m.key }
}).catch(() => {})

return m.reply('> 🚫 Solo los owners pueden actualizar el bot.')

}

try {
await sock.sendMessage(chat, {
react: { text: '🔄', key: m.key }
}).catch(() => {})

await sock.sendMessage(chat, {
  text:
    '> 🐸 *PEPE BOT — ACTUALIZADOR*\n\n' +
    '> 🔍 Comprobando el repositorio...'
})

// Comprobar que Git esté disponible en el proyecto
await execFileAsync(
  'git',
  ['rev-parse', '--is-inside-work-tree'],
  { cwd, timeout: 15000 }
)

// Detectar la rama actual
const { stdout: ramaOutput } = await execFileAsync(
  'git',
  ['branch', '--show-current'],
  { cwd, timeout: 15000 }
)

const rama = ramaOutput.trim()

if (!rama) {
  return sock.sendMessage(chat, {
    text:
      '> ❌ No pude identificar la rama actual.\n' +
      '> Revisa la configuración Git del servidor.'
  }, { quoted: m })
}

// Obtener los últimos cambios del remoto
await execFileAsync(
  'git',
  ['fetch', 'origin'],
  { cwd, timeout: 90000 }
)

// Confirmar que existe la rama remota
await execFileAsync(
  'git',
  ['rev-parse', '--verify', `origin/${rama}`],
  { cwd, timeout: 15000 }
)

// Contar commits que llegarán desde GitHub
const { stdout: conteoOutput } = await execFileAsync(
  'git',
  ['rev-list', '--count', `HEAD..origin/${rama}`],
  { cwd, timeout: 15000 }
)

const commitsNuevos = Number(conteoOutput.trim())

// Detectar si hay diferencias locales o archivos nuevos
const { stdout: estadoOutput } = await execFileAsync(
  'git',
  ['status', '--porcelain'],
  { cwd, timeout: 15000 }
)

const hayCambiosLocales = Boolean(estadoOutput.trim())

if (commitsNuevos === 0 && !hayCambiosLocales) {
  await sock.sendMessage(chat, {
    react: { text: '✅', key: m.key }
  }).catch(() => {})

  return sock.sendMessage(chat, {
    text: '> ✅ PEPE BOT ya está actualizado. No hay cambios nuevos.'
  }, { quoted: m })
}

await sock.sendMessage(chat, {
  text:
    '> ⚠️ Se reemplazarán los cambios locales y archivos no rastreados.\n' +
    '> 📥 Sincronizando con GitHub...'
})

// Reemplazar el estado de los archivos rastreados
await execFileAsync(
  'git',
  ['reset', '--hard', `origin/${rama}`],
  { cwd, timeout: 90000 }
)

// Eliminar archivos/carpetas no rastreados por Git
await execFileAsync(
  'git',
  ['clean', '-fd'],
  { cwd, timeout: 90000 }
)

// Instalar las dependencias definidas por el repositorio
await sock.sendMessage(chat, {
  text: '> 📦 Instalando dependencias...'
})

await execFileAsync(
  'npm',
  ['install', '--no-fund', '--no-audit'],
  { cwd, timeout: 240000 }
)

await sock.sendMessage(chat, {
  react: { text: '✅', key: m.key }
}).catch(() => {})

return sock.sendMessage(chat, {
  text:
    '> ✅ *ACTUALIZACIÓN COMPLETADA*\n\n' +
    `> 🌿 Rama: ${rama}\n` +
    `> 📥 Commits nuevos: ${commitsNuevos}\n` +
    '> 📦 Dependencias instaladas.\n\n' +
    '> 🔄 Reinicia el servidor desde el panel para cargar los cambios.'
}, { quoted: m })

} catch (error) {
console.error('[UPDATE ERROR]', error)

await sock.sendMessage(chat, {
  text:
    '> ❌ No se pudo completar la actualización.\n' +
    '> Revisa la consola del servidor para ver el error.\n' +
    '> Si Git no tiene configurado origin o la rama remota, debes corregirlo antes de actualizar.'
}, { quoted: m }).catch(() => {})

}
}

handler.command = ['update', 'actualizar']
handler.help = ['update']
handler.tags = ['owner']
handler.owner = true
handler.menu = true

export default handler