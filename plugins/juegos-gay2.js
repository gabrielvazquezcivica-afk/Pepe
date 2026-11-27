
import axios from 'axios'
import sharp from 'sharp'

const AUDIO_CATBOX = 'https://files.catbox.moe/yt5fu9.mp4'

const handler = {}

handler.run = async (sock, m) => {
    try {
        const jid =
            m.mentionedJid?.[0] ||
            m.quoted?.sender ||
            m.sender

        await sock.sendMessage(m.chat, {
            react: { text: '🌈', key: m.key }
        })

        // Obtener foto de perfil
        let foto

        try {
            const url = await sock.profilePictureUrl(jid, 'image')
            const response = await axios.get(url, {
                responseType: 'arraybuffer'
            })
            foto = Buffer.from(response.data)
        } catch {
            return m.reply('> ❌ No pude obtener la foto de perfil.')
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

        // Filtro arcoíris
        const rainbow = `
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

        const imagenFinal = await sharp(base)
            .composite([{
                input: Buffer.from(rainbow),
                blend: 'over'
            }])
            .jpeg({ quality: 90 })
            .toBuffer()

        // Enviar foto con filtro
        await sock.sendMessage(m.chat, {
            image: imagenFinal,
            caption:
                '> 🌈 Miren a este fan profesional del arcoíris 😂'
        }, { quoted: m })

        // Enviar audio
        await sock.sendMessage(m.chat, {
            audio: { url: AUDIO_CATBOX },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: m })

    } catch (error) {
        console.error('Error en gay2:', error)
        m.reply('> ❌ Ocurrió un error al ejecutar el comando.')
    }
}

handler.command = ['gay2']
handler.help = ['gay2']
handler.tags = ['juegos']
handler.menu = true

export default handler
