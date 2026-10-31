
import fs from 'fs'
import path from 'path'
import os from 'os'
import webp from 'node-webpmux'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const handler = {}

handler.run = async (sock, m, args) => {
    const from = m.key.remoteJid

    const quoted =
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        m.msg?.contextInfo?.quotedMessage

    if (!quoted?.stickerMessage) {
        return sock.sendMessage(from, {
            text: '🐸 Responde a un sticker con *.wm*'
        }, { quoted: m })
    }

    const sticker = quoted.stickerMessage

    const esAnimado =
        sticker.isAnimated === true ||
        sticker.isAnimated === 'true'

    const reaccionTipo = esAnimado ? '🔥' : '❤️'

    let texto = args.join(' ').trim()

    if (!texto) {
        texto = m.pushName || 'WhatsApp'
    }

    let input
    let output

    try {
        await sock.sendMessage(from, {
            react: {
                text: reaccionTipo,
                key: m.key
            }
        })

        const stream = await downloadContentFromMessage(
            sticker,
            'sticker'
        )

        const chunks = []

        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)

        if (!buffer.length) {
            throw new Error('No se pudo descargar el sticker.')
        }

        const tmp = os.tmpdir()
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`

        input = path.join(tmp, `pepe_wm_in_${id}.webp`)
        output = path.join(tmp, `pepe_wm_out_${id}.webp`)

        fs.writeFileSync(input, buffer)

        const img = new webp.Image()
        await img.load(input)

        const exifData = {
            'sticker-pack-id': `pepe-${id}`,
            'sticker-pack-name': texto,
            'sticker-pack-publisher': m.pushName || 'WhatsApp',
            emojis: [reaccionTipo]
        }

        const json = Buffer.from(
            JSON.stringify(exifData),
            'utf-8'
        )

        const exif = Buffer.concat([
            Buffer.from([
                0x49, 0x49, 0x2A, 0x00,
                0x08, 0x00, 0x00, 0x00
            ]),
            Buffer.from([0x01, 0x00]),
            Buffer.from([0x41, 0x57, 0x07, 0x00]),
            Buffer.from([
                json.length & 0xff,
                (json.length >> 8) & 0xff,
                (json.length >> 16) & 0xff,
                (json.length >> 24) & 0xff
            ]),
            Buffer.from([0x16, 0x00, 0x00, 0x00]),
            json
        ])

        img.exif = exif

        await img.save(output)

        const resultado = fs.readFileSync(output)

        await sock.sendMessage(from, {
            sticker: resultado
        }, { quoted: m })

        await sock.sendMessage(from, {
            react: {
                text: '✅',
                key: m.key
            }
        })

    } catch (error) {
        console.error('Error en .wm:', error)

        await sock.sendMessage(from, {
            text: '❌ No se pudo cambiar la marca del sticker.'
        }, { quoted: m })

    } finally {
        for (const file of [input, output]) {
            if (file) {
                try {
                    fs.unlinkSync(file)
                } catch {}
            }
        }
    }
}

handler.command = ['wm']
handler.help = ['wm', 'wm <nombre>']
handler.tags = ['stickers']
handler.menu = true

export default handler
