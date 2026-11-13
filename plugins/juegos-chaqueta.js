
const handler = {}

handler.run = async (sock, m) => {
    const remitente = m.sender

    const contexto =
        m.message?.extendedTextMessage?.contextInfo

    const mencionados = contexto?.mentionedJid || []

    let usuario = null

    if (mencionados.length >= 1) {
        usuario = mencionados[0]
    } else if (m.quoted) {
        usuario =
            m.quoted.sender ||
            m.quoted.key?.participant ||
            m.quoted.key?.participantAlt
    } else if (contexto?.participant) {
        usuario = contexto.participant
    }

    if (!usuario) {
        return m.reply('> 😂 Menciona o responde a alguien.')
    }

    const limpiarJid = jid =>
        jid?.replace(/:\d+@/, '@')

    if (limpiarJid(usuario) === limpiarJid(remitente)) {
        return m.reply('> 🤨 Hazlo con alguien más.')
    }

    await sock.sendMessage(m.chat, {
        react: {
            text: '💦',
            key: m.key
        }
    })

    const name1 = remitente.split('@')[0].split(':')[0]
    const name2 = usuario.split('@')[0].split(':')[0]

    const frames = [
        '_Iniciando chaqueta..._',

        `╭━━╮╭╭╭╮
┃▔╲┣╈╈╈╈━━━╮
┃┈┈▏.╰╯╯╯╭╮━┫
┃┈--.╭━━━━╈╈━╯
╰━━╯-.                ╰╯`,

        `╭━━╮.    ╭╭╭╮
┃▔╲┣━━╈╈╈╈━━╮
┃┈┈▏.    .╰╯╯╯╭╮┫
┃┈--.╭━━━━━━╈╈╯
╰━━╯-.           . ╰╯`,

        `              .               .   ╭
╭━━╮╭╭╭╮.           ╭ ╯
┃▔╲┣╈╈╈╈━━━╮╭╯╭
┃┈┈▏.╰╯╯╯╭╮━┫
┃┈--.╭━━━━╈╈━╯╰╮╰
╰━━╯-.        ╰╯...-    ╰ ╮
   .         . .  .  .. . . .  . .. .  ╰

*[ 💦 ] @${name1} SE AH CORRIDO GRACIAS A @${name2}.*`
    ]

    const msg = await sock.sendMessage(m.chat, {
        text: frames[0]
    }, { quoted: m })

    for (let i = 1; i < frames.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 900))

        await sock.sendMessage(m.chat, {
            text: frames[i],
            edit: msg.key,
            mentions: [remitente, usuario]
        })
    }
}

handler.command = ['chaqueta']
handler.help = ['chaqueta @usuario']
handler.tags = ['juegos']
handler.menu = true

export default handler
