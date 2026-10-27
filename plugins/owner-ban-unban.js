import { addBan, removeBan } from '../lib/banlist.js'

const handler = {}

function getTarget(m, args = []) {
  const message =
    m.message?.ephemeralMessage?.message || m.message

  const context =
    message?.extendedTextMessage?.contextInfo

  const quoted = context?.participant
  const mentioned = context?.mentionedJid?.[0]

  if (mentioned) return mentioned
  if (quoted) return quoted

  const number = args[0]?.replace(/\D/g, '')
  return number ? `${number}@s.whatsapp.net` : null
}

async function react(sock, m, emoji) {
  await sock.sendMessage(m.key.remoteJid, {
    react: { text: emoji, key: m.key }
  }).catch(() => {})
}

handler.run = async (sock, m, args = []) => {
  const command = String(m.command || '').toLowerCase()

  if (!m.isOwner) {
    await react(sock, m, '❌')
    return m.reply(
      '> 🚫 *Acceso denegado*\n\n' +
      '> Solo el owner principal o los owners agregados pueden usar este comando.'
    )
  }

  const target = getTarget(m, args)

  if (!target) {
    await react(sock, m, '⚠️')
    return m.reply(
      '> 🐸 *PEPE BOT — BAN / UNBAN*\n\n' +
      '> Menciona o responde al usuario para banear o desbanear.\n\n' +
      '`.ban — Banear usuario`\n' +
      '`.unban — Desbanear usuario`\n'
    )
  }

  const botNumber = sock.user?.id?.split('@')[0]?.split(':')[0]
  const targetNumber = target.split('@')[0].split(':')[0]

  if (botNumber && targetNumber === botNumber) {
    await react(sock, m, '❌')
    return m.reply('> ❌ No puedes banear ni desbanear al propio bot.')
  }

  try {
    if (command === 'unban') {
      const removed = removeBan(target)

      if (removed) {
        await react(sock, m, '✅')
        return m.reply(
          '> ✅ *Usuario desbaneado*\n\n' +
          `> 👤 Usuario: \`${target}\`\n` +
          '> Ya puede volver a utilizar los comandos de PEPE BOT.'
        )
      }

      await react(sock, m, '⚠️')
      return m.reply(
        '> ⚠️ Ese usuario no aparece en la lista de baneados.'
      )
    }

    addBan(target, m.sender || 'owner')

    await react(sock, m, '🔨')
    return m.reply(
      '> 🔨 *Usuario baneado*\n\n' +
      `> 👤 Usuario: \`${target}\`\n` +
      '> Se le ha bloqueado el uso de los comandos de PEPE BOT.\n'
    )

  } catch (error) {
    console.error('[PEPE BAN]', error)
    await react(sock, m, '❌')
    return m.reply('> ❌ Ocurrió un error al actualizar la lista de baneados.')
  }
}

handler.command = ['ban', 'unban']
handler.help = ['ban', 'unban']
handler.tags = ['owner']
handler.menu = true

export default handler