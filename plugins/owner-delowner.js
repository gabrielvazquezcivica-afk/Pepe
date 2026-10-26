
import fs from 'fs'
import path from 'path'
import config from '../config.js'

const file = path.resolve(process.cwd(), 'database.json')
const handler = {}

const clean = value =>
  String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '')

function readDB() {
  try {
    const db = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!db || Array.isArray(db) || typeof db !== 'object') {
      throw new Error('Formato inválido en database.json')
    }
    return db
  } catch (e) {
    if (e.code === 'ENOENT') return {}
    throw e
  }
}

function saveDB(db) {
  const temp = `${file}.tmp`
  fs.writeFileSync(temp, JSON.stringify(db, null, 2))
  fs.renameSync(temp, file)
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
  const ctx =
    m.message?.extendedTextMessage?.contextInfo ||
    m.message?.imageMessage?.contextInfo ||
    m.message?.videoMessage?.contextInfo ||
    {}

  const jid = ctx.mentionedJid?.[0] || ctx.participant

  if (jid) {
    const lid = jid.endsWith('@lid')
    return { id: clean(jid), jid, lid }
  }

  const number = clean(args[0])
  if (!number) return null

  return {
    id: number,
    jid: `${number}@s.whatsapp.net`,
    lid: false
  }
}

handler.run = async (sock, m, args = []) => {
  const chat = m.key.remoteJid
  const sender = getSender(m)

  if (!isMainOwner(sender)) {
    return m.reply('> SOLO EL OWNER PRINCIPAL PUEDE QUITAR OWNER')
  }

  const target = getTarget(m, args)

  if (!target?.id) {
    return m.reply(
      '> MENCIONA O RESPONDE A UN USUARIO PARA QUITAR OWNER\n' +
      '> USO: .delowner 521234567890'
    )
  }

  const mainNumbers = (config.owner || []).map(clean).filter(Boolean)
  const mainLids = (config.ownerLid || []).map(clean).filter(Boolean)

  if (
    (!target.lid && mainNumbers.includes(target.id)) ||
    (target.lid && mainLids.includes(target.id))
  ) {
    return m.reply('> NO PUEDES ELIMINAR AL OWNER PRINCIPAL')
  }

  try {
    const db = readDB()
    if (!Array.isArray(db.pepeOwners)) db.pepeOwners = []

    const before = db.pepeOwners.length

    db.pepeOwners = db.pepeOwners.filter(o => {
      const id = clean(typeof o === 'string' ? o : o.id)
      const lid = typeof o === 'object' && Boolean(o.lid)
      return !(id === target.id && lid === target.lid)
    })

    if (db.pepeOwners.length === before) {
      return m.reply('> ESTE USUARIO NO ES OWNER')
    }

    saveDB(db)

    const senderTag = sender.number || sender.lid || 'Owner'

    return sock.sendMessage(chat, {
      text:
        '`¡ OWNER ELIMINADO !`\n' +
        `> @${target.id}\n` +
        '`RETIRADO POR:`\n' +
        `> @${senderTag}`,
      mentions: [...new Set([target.jid, sender.jid])]
    }, { quoted: m })
  } catch (e) {
    console.error('[DELOWNER]', e)
    return m.reply('> ERROR AL ACTUALIZAR DATABASE.JSON')
  }
}

handler.help = ['delowner']
handler.tags = ['owner']
handler.command = ['delowner', 'removeowner']
handler.menu = true

export default handler
