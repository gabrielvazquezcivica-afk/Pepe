
const gifs = [
  'https://telegra.ph/file/8e60a6379c1b72e4fbe0f.mp4',
  'https://telegra.ph/file/8ac9ca359cac4c8786194.mp4',
  'https://telegra.ph/file/cc20935de6993dd391af1.mp4',
  'https://telegra.ph/file/9c0bba4c6b71979e56f55.mp4',
  'https://telegra.ph/file/5d22649b472e539f27df9.mp4',
  'https://telegra.ph/file/804eada656f96a04ebae8.mp4',
  'https://telegra.ph/file/3a2ef7a12eecbb6d6df53.mp4',
  'https://telegra.ph/file/c4c27701496fec28d6f8a.mp4',
  'https://telegra.ph/file/c8e5a210a3a34e23391ee.mp4',
  'https://telegra.ph/file/70bac5a760539efad5aad.mp4',
  'https://qu.ax/iPDiG.mp4'
]

const handler = {}

handler.run = async (sock, m) => {
    const chat = m.chat || m.key?.remoteJid
    const remitente = m.sender || m.key?.participant || chat

    const context =
        m.message?.extendedTextMessage?.contextInfo ||
        m.message?.imageMessage?.contextInfo ||
        m.message?.videoMessage?.contextInfo ||
        {}

    const mencionados = [
        ...(m.mentionedJid || []),
        ...(context.mentionedJid || [])
    ]

    let usuario = mencionados.find(jid => jid && jid !== remitente)

    if (!usuario) {
        usuario =
            m.quoted?.sender ||
            m.quoted?.participant ||
            context.participant
    }

    if (!usuario) {
        return sock.sendMessage(chat, {
            text: '> 👊 Menciona o responde a alguien para golpearlo.'
        }, { quoted: m })
    }

    if (usuario === remitente) {
        return sock.sendMessage(chat, {
            text: '> 😂 No puedes golpearte a ti mismo.'
        }, { quoted: m })
    }

    await sock.sendMessage(chat, {
        react: {
            text: '👊',
            key: m.key
        }
    })

    const gif = gifs[Math.floor(Math.random() * gifs.length)]

    await sock.sendMessage(chat, {
        video: { url: gif },
        gifPlayback: true,
        caption: `👊 @${remitente.split('@')[0]} golpeó a @${usuario.split('@')[0]} 💥`,
        mentions: [remitente, usuario]
    }, { quoted: m })
}

handler.command = ['golpear', 'hit', 'slap']
handler.help = ['golpear @usuario']
handler.tags = ['anime']
handler.menu = true

export default handler
