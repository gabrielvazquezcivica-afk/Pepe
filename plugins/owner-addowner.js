
import fs from 'fs'
import path from 'path'
import config from '../config.js'

const handler = {}

const file = path.resolve(process.cwd(), 'database/owners.json')

function normalize(value = '') {
    return String(value).replace(/\D/g, '')
}

function readDB() {
    fs.mkdirSync(path.dirname(file), { recursive: true })

    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify({ owners: [] }, null, 2))
    }

    const db = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!Array.isArray(db.owners)) db.owners = []
    return db
}

function saveDB(db) {
    fs.writeFileSync(file, JSON.stringify(db, null, 2))
}

function getSender(m) {
    return m.key?.participant || m.participant || m.key?.remoteJid || ''
}

function isMainOwner(m) {
    const sender = getSender(m)
    const senderNumber = normalize(sender.split('@')[0])
    const senderLid = normalize(
        m.key?.participantAlt?.split('@')[0] || ''
    )

    const numbers = (config.owner || []).filter(Boolean).map(normalize)
    const lids = (config.ownerLid || []).filter(Boolean).map(normalize)

    return numbers.includes(senderNumber) ||
        lids.includes(senderNumber) ||
        numbers.includes(senderLid) ||
        lids.includes(senderLid)
}

function getTarget(m, args) {
    const context =
        m.message?.extendedTextMessage?.contextInfo ||
        m.msg?.contextInfo ||
        {}

    const mentioned =
        m.mentionedJid?.[0] ||
        context.mentionedJid?.[0]

    const quoted = context.participant

    const jid = mentioned || quoted

    if (jid) {
        return {
            id: normalize(jid.split('@')[0]),
            jid,
            lid: jid.endsWith('@lid') ? normalize(jid.split('@')[0]) : ''
        }
    }

    const number = normalize(args[0] || '')
    if (!number) return null

    return {
        id: number,
        jid: `${number}@s.whatsapp.net`,
        lid: ''
    }
}

handler.run = async (sock, m, args = []) => {
    const from = m.key?.remoteJid

    if (!isMainOwner(m)) {
        return sock.sendMessage(from, {
            text: '> ❌ Solo el dueño principal puede usar este comando.'
        }, { quoted: m })
    }

    const target = getTarget(m, args)

    if (!target?.id) {
        return sock.sendMessage(from, {
            text: '> ⚠️ Menciona a un usuario, responde a su mensaje o escribe su número.\n> Ejemplo: .addowner @usuario'
        }, { quoted: m })
    }

    const db = readDB()

    const exists = db.owners.some(owner => {
        const id = typeof owner === 'string' ? owner : owner.id
        const jid = typeof owner === 'string' ? '' : owner.jid
        const lid = typeof owner === 'string' ? '' : owner.lid

        return normalize(id) === target.id ||
            (target.jid && jid === target.jid) ||
            (target.lid && lid === target.lid)
    })

    if (exists) {
        return sock.sendMessage(from, {
            text: '> ⚠️ Ese usuario ya es owner.'
        }, { quoted: m })
    }

    db.owners.push(target)
    saveDB(db)

    return sock.sendMessage(from, {
        text: `\`¡ NUEVO OWNER AGREGADO !\`\n> @${target.id}\n\n\`OTORGADO POR:\`\n> @${normalize(getSender(m).split('@')[0])}`,
        mentions: [target.jid, getSender(m)].filter(jid => jid?.includes('@'))
    }, { quoted: m })
}

handler.help = ['addowner']
handler.tags = ['owner']
handler.command = ['addowner']
handler.menu = true

export default handler
