
import axios from 'axios'
import sharp from 'sharp'

const AUDIO_CATBOX = 'https://files.catbox.moe/yt5fu9.mp4'

const handler = {}

function obtenerSender(m) {
    return m.sender ||
        m.key?.participant ||
        m.participant ||
        m.key?.remoteJid
}

function extraerMensaje(m) {
    let msg = m?.message || m?.msg || m?.key?.message || {}

    while (msg) {
        if (msg.ephemeralMessage?.message) {
            msg = msg.ephemeralMessage.message
            continue
        }
        if (msg.viewOnceMessage?.message) {
            msg = msg.viewOnceMessage.message
            continue
        }
        if (msg.viewOnceMessageV2?.message) {
            msg = msg.viewOnceMessageV2.message
            continue
        }
        break
    }

    return msg || {}
}

function obtenerContextInfo(m) {
    const mensaje = extraerMensaje(m)

    const tipos = [
        'extendedTextMessage',
        'imageMessage',
        'videoMessage',
        'documentMessage',
        'audioMessage',
        'stickerMessage'
    ]

    for (const tipo of tipos) {
        if (mensaje[tipo]?.contextInfo) {
            return mensaje[tipo].contextInfo
        }
    }

    return null
}

function obtenerObjetivo(m) {
    const sender = obtenerSender(m)
    const contextInfo = obtenerContextInfo(m)

    const menciones = [
        ...(Array.isArray(m.mentionedJid) ? m.mentionedJid : []),
        ...(Array.isArray(contextInfo?.mentionedJid)
            ? contextInfo.mentionedJid
            : [])
    ]

    const mencionado = menciones.find(jid => jid && jid !== sender)

    if (mencionado) return mencionado

    const respondido =
        m.quoted?.sender ||
        m.quoted?.participant ||
        m.quoted?.key?.participant ||
        contextInfo?.participant

    if (respondido && respondido !== sender) {
        return respondido
    }

    return sender
}

handler.run = async (sock, m) => {
    const chat = m.chat || m.key?.remoteJid
    const objetivo = obtenerObjetivo(m)

    if (!chat || !objetivo) return

    try {
        // Obtener foto de perfil
        let foto

        try {
            const url = await sock.profilePictureUrl(objetivo, 'image')

            const respuesta = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 20000
            })

            foto = Buffer.from(respuesta.data)
        } catch (error) {
            console.error('Error obteniendo foto:', error)

            return sock.sendMessage(chat, {
                text: '❌ No pude obtener la foto de perfil. Puede que no tenga una foto visible.'
            }, { quoted: m })
        }

        // Preparar imagen
        const base = await sharp(foto)
            .rotate()
            .resize(900, 900, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .png()
            .toBuffer()

        const metadata = await sharp(base).metadata()
        const width = metadata.width
        const height = metadata.height

        // Crear filtro arcoíris
        const filtro = `
        <svg width="${width}" height="${height}"
        xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="rainbow"
                x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ff0000"/>
                    <stop offset="17%" stop-color="#ff9900"/>
                    <stop offset="34%" stop-color="#ffff00"/>
                    <stop offset="51%" stop-color="#00ff00"/>
                    <stop offset="68%" stop-color="#0099ff"/>
                    <stop offset="85%" stop-color="#6633ff"/>
                    <stop offset="100%" stop-color="#ff00cc"/>
                </linearGradient>
            </defs>
            <rect width="100%" height="100%"
            fill="url(#rainbow)" opacity="0.38"/>
        </svg>`

        // Aplicar filtro
        const imagenFinal = await sharp(base)
            .composite([{
                input: Buffer.from(filtro),
                blend: 'over'
            }])
            .jpeg({ quality: 90 })
            .toBuffer()

        const nombre = `@${objetivo.split('@')[0]}`

        // Enviar foto filtrada
        await sock.sendMessage(chat, {
            image: imagenFinal,
           caption: `Miren a este putito @${objetivo.split('@')[0]} 🏳️‍🌈, le encanta que le arrempujen los frijoles al maricon este 😂🏳️‍🌈`,
mentions: [objetivo]
        }, { quoted: m })

        // Enviar audio de Catbox
        await sock.sendMessage(chat, {
            audio: { url: AUDIO_CATBOX },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: m })

    } catch (error) {
        console.error('Error en gay2:', error)

        await sock.sendMessage(chat, {
            text: '❌ Ocurrió un error al ejecutar el comando.'
        }, { quoted: m })
    }
}

handler.command = ['gay2']
handler.help = ['gay2']
handler.tags = ['juegos']
handler.menu = true

export default handler
