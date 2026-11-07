
import fs from 'fs'
import config from '../config.js'

let handler = {}

handler.run = async (sock, m) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    if (!from.endsWith('@g.us')) {
        return sock.sendMessage(from, {
            text: '> Este comando solo funciona en grupos.'
        }, { quoted: m })
    }

    // 🔞 BLOQUEO NSFW
    let nsfw = {}

    try {
        nsfw = JSON.parse(
            fs.readFileSync('./database/nsfw.json', 'utf8')
        )
    } catch {}

    if (nsfw[from]?.bloqueado !== false) {
        return sock.sendMessage(from, {
            text: `> 🔒 Los comandos +18 están bloqueados en este grupo.

> Un administrador puede cambiarlo con .nsfw`
        }, { quoted: m })
    }

    let target =
        m.message?.extendedTextMessage?.contextInfo?.participant ||
        m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!target) {
        return sock.sendMessage(from, {
            text:
`> 😏 ETIQUETA O RESPONDE A ALGUIEN.

> Ejemplo:
> .69 @usuario`
        }, { quoted: m })
    }

    if (target === sender) {
        return sock.sendMessage(from, {
            text:
`> AH DONDE TAN RAPIDO AMIGO, COMO PENSABAS HACER UN 69 CONTIGO MISMO 😂`
        }, { quoted: m })
    }

    const videos = [
        'https://telegra.ph/file/bb4341187c893748f912b.mp4',
        'https://telegra.ph/file/c7f154b0ce694449a53cc.mp4',
        'https://telegra.ph/file/1101c595689f638881327.mp4',
        'https://telegra.ph/file/f7f2a23e9c45a5d6bf2a1.mp4',
        'https://telegra.ph/file/a2098292896fb05675250.mp4',
        'https://telegra.ph/file/16f43effd7357e82c94d3.mp4',
        'https://telegra.ph/file/55cb31314b168edd732f8.mp4',
        'https://telegra.ph/file/1cbaa4a7a61f1ad18af01.mp4',
        'https://telegra.ph/file/1083c19087f6997ec8095.mp4'
    ]

    const video =
        videos[Math.floor(Math.random() * videos.length)]

    const name1 = sender.split('@')[0]
    const name2 = target.split('@')[0]

    await sock.sendMessage(from, {
        react: {
            text: '🍆',
            key: m.key
        }
    })

    await sock.sendMessage(from, {
        video: {
            url: video
        },
        gifPlayback: true,
        caption:
` 🔥 *69* 🔥

> 🔥 @${name1} está haciendo el 69 con @${name2} 🔥`,
        mentions: [sender, target]
    }, {
        quoted: m
    })
}

handler.command = ['69']
handler.help = ['69 @usuario']
handler.tags = ['nsfw']
handler.group = true
handler.menu = true

export default handler
