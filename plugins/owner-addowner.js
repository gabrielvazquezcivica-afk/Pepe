
import fs from 'fs'
import path from 'path'
import config from '../config.js'

const file = path.resolve('./owners.json')
const handler = {}

const clean = value =>
  String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '')

function getOwners() {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveOwners(owners) {
  fs.writeFileSync(file, JSON.stringify(owners, null, 2))
}

function getSender(m) {
  const jid = m.key.participant || m.key.remoteJid || ''
  const isLid = jid.endsWith('@lid')

  return {
    jid,
    number: isLid ? '' : clean(jid),
    lid: isLid ? clean(jid) : ''
  }
}

function isMainOwner(sender) {
  const numbers = (config.owner || []).map(clean).filter(Boolean)
  const lids = (config.ownerLid || []).map(clean).filter(Boolean)

  return (
    (sender.number && numbers.includes(sender.number)) ||
    (sender.lid && lids.includes(sender.lid))
  )
}

function getTarget(m, args) {
  const context =
    m.message?.extendedTextMessage?.contextInfo ||
    m.message?.imageMessage?.contextInfo ||
    m.message?.videoMessage?.contextInfo ||
    {}

  const mentioned = context.mentionedJid?.[0]
  const quoted = context.participant
  const input = (args[0] || '').trim()

  const jid = mentioned || quoted

  if (jid) {
    if (jid.endsWith('@lid')) {
      return { key: clean(jid), jid, lid: true }
    }

    return { key: clean(jid), jid, lid: false }
  }

  if (input) {
    const number = clean(input)
    if (!number) return null

    return {
      key: number,
      jid: `${number}@s.whatsapp.net`,
      lid: false
    }
  }

  return null
}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const sender = getSender(m)

  if (!isMainOwner(sender)) {
    return m.reply(
      '> SOLO EL OWNER PRINCIPAL PUEDE AGREGAR OWNER'
    )
  }

  const target = getTarget(m, args)

  if (!target?.key) {
    return m.reply(
      '> MENCIONA O RESPONDE A UN USUARIO PARA PROMOVER A OWNER'
    )
  }

  const mainNumbers = (config.owner || []).map(clean).filter(Boolean)
  const mainLids = (config.ownerLid || []).map(clean).filter(Boolean)

  if (
    (!target.lid && mainNumbers.includes(target.key)) ||
    (target.lid && mainLids.includes(target.key))
  ) {
    return m.reply('> ESTE USUARIO YA ES OWNER')
  }

  const owners = getOwners()

  if (owners.some(owner => clean(owner) === target.key)) {
    return m.reply('> ESTE USUARIO YA ES OWNER')
  }

  owners.push(target.key)
  saveOwners(owners)

  const senderJid = sender.jid
  const senderTag = sender.number || sender.lid
  const targetTag = target.key

  return sock.sendMessage(chat, {
    text:
      '`¡ NUEVO OWNER AGREGADO !`\n' +
      `> @${targetTag}\n` +
      '`OTORGADO POR:`\n' +
      `> @${senderTag}`,
    mentions: [...new Set([target.jid, senderJid])]
  }, { quoted: m })
}


handler.help = ['addowner']
handler.tags = ['owner']
handler.command = ['addowner']
handler.menu = true

export default handler
