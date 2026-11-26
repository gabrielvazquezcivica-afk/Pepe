
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import webp from 'node-webpmux'

import {
    downloadContentFromMessage,
    prepareWAMessageMedia,
    proto
} from '@whiskeysockets/baileys'

const handler = {}

let PATCHED = false

// ========================================
// PARCHE PARA STICKERS CON AUDIO
// ========================================

function patchSoundSticker() {
    if (PATCHED) return

    const Sticker = proto.Message.StickerMessage
    const Message = proto.Message
    const AudioMessage = proto.Message.AudioMessage
    const FutureProofMessage = proto.Message.FutureProofMessage

    if (!Sticker || !AudioMessage || !FutureProofMessage) {
        throw new Error('No se encontró el esquema protobuf necesario.')
    }

    // Campo 26: AudioMessage dentro de StickerMessage
    const originalStickerEncode = Sticker.encode

    Sticker.encode = function (message, writer) {
        const audio = message.audioMessage

        if (!audio) {
            return originalStickerEncode.call(this, message, writer)
        }

        const clean = { ...message }
        delete clean.audioMessage

        writer = originalStickerEncode.call(this, clean, writer)

        AudioMessage.encode(
            audio,
            writer.uint32(210).fork()
        ).ldelim()

        return writer
    }

    const originalStickerFromObject = Sticker.fromObject

    Sticker.fromObject = function (object) {
        const result = originalStickerFromObject.call(this, object)

        if (object?.audioMessage) {
            result.audioMessage = AudioMessage.fromObject(
                object.audioMessage
            )
        }

        return result
    }

    // Campo 134: envoltorio audioStickerMessage
    const originalMessageEncode = Message.encode

    Message.encode = function (message, writer) {
        const audioSticker = message.audioStickerMessage

        if (!audioSticker) {
            return originalMessageEncode.call(this, message, writer)
        }

        const clean = { ...message }

        delete clean.stickerMessage
        delete clean.audioStickerMessage

        writer = originalMessageEncode.call(this, clean, writer)

        FutureProofMessage.encode(
            audioSticker,
            writer.uint32(1074).fork()
        ).ldelim()

        return writer
    }

    const originalMessageFromObject = Message.fromObject

    Message.fromObject = function (object) {
        const result = originalMessageFromObject.call(this, object)

        if (object?.audioStickerMessage) {
            result.audioStickerMessage =
                FutureProofMessage.fromObject(
                    object.audioStickerMessage
                )
        }

        return result
    }

    PATCHED = true
}

// ========================================
// BUSCAR STICKER Y AUDIO
// ========================================

function unwrapMessage(message) {
    if (!message) return null

    return (
        message.ephemeralMessage?.message ||
        message.viewOnceMessage?.message ||
        message.viewOnceMessageV2?.message ||
        message.documentWithCaptionMessage?.message ||
        message
    )
}

function findSoundSticker(message) {
    const unwrapped = unwrapMessage(message)

    if (!unwrapped) return null

    // Formato especial de .sa
    const wrapper = unwrapped.audioStickerMessage

    if (wrapper) {
        const inner = unwrapMessage(wrapper.message)

        const sticker =
            inner?.stickerMessage ||
            inner?.message?.stickerMessage

        const audio = sticker?.audioMessage

        if (sticker && audio) {
            return { sticker, audio }
        }
    }

    // Formato directo
    const sticker = unwrapped.stickerMessage

    if (sticker?.audioMessage) {
        return {
            sticker,
            audio: sticker.audioMessage
        }
    }

    return null
}

// ========================================
// DESCARGAR STICKER
// ========================================

async function downloadSticker(sticker) {
    const stream = await downloadContentFromMessage(
        sticker,
        'sticker'
    )

    const chunks = []

    for await (const chunk of stream) {
        chunks.push(chunk)
    }

    return Buffer.concat(chunks)
}

// ========================================
// METADATOS WEBP
// ========================================

function createExif(text, id) {
    const data = {
        'sticker-pack-id': `pepe-audio-${id}`,
        'sticker-pack-name': text,
        'sticker-pack-publisher': 'Pepe Bot',
        emojis: ['🎵']
    }

    const json = Buffer.from(
        JSON.stringify(data),
        'utf8'
    )

    return Buffer.concat([
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
}

// ========================================
// COMANDO WM2
// ========================================

handler.run = async (sock, m, args = []) => {
    const from = m.key.remoteJid

    const quoted =
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        m.msg?.contextInfo?.quotedMessage

    if (!quoted) {
        return sock.sendMessage(from, {
            text: '🐸 Responde a un sticker con audio usando *.wm2*'
        }, { quoted: m })
    }

    const sound = findSoundSticker(quoted)

    if (!sound) {
        return sock.sendMessage(from, {
            text: '❌ Ese sticker no contiene audio compatible.\n\n🐸 Este comando solamente funciona con stickers creados con *.sa*.'
        }, { quoted: m })
    }

    const { sticker, audio } = sound

    const texto =
        args.join(' ').trim() ||
        m.pushName ||
        'Pepe Bot'

    let input
    let output

    try {
        patchSoundSticker()

        await sock.sendMessage(from, {
            react: {
                text: '🎵',
                key: m.key
            }
        })

        const buffer = await downloadSticker(sticker)

        if (!buffer?.length) {
            throw new Error('No se pudo descargar el WebP.')
        }

        const id = crypto.randomBytes(8).toString('hex')
        const tmp = os.tmpdir()

        input = path.join(tmp, `pepe_wm2_in_${id}.webp`)
        output = path.join(tmp, `pepe_wm2_out_${id}.webp`)

        fs.writeFileSync(input, buffer)

        const img = new webp.Image()
        await img.load(input)

        img.exif = createExif(texto, id)

        await img.save(output)

        const resultado = fs.readFileSync(output)

        // Preparar y subir el WebP modificado
        const prepared = await prepareWAMessageMedia(
            { sticker: resultado },
            {
                upload: sock.waUploadToServer
            }
        )

        if (!prepared?.stickerMessage) {
            throw new Error('No se pudo preparar el sticker.')
        }

        // Restaurar el AudioMessage original
        prepared.stickerMessage.audioMessage = audio

        // Enviar con el envoltorio especial de audioStickerMessage
        const message = {
            __proto__: prepared,
            audioStickerMessage: {
                message: prepared
            },
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32)
            }
        }

        await sock.relayMessage(from, message, {
            messageId: crypto.randomBytes(10).toString('hex')
        })

        await sock.sendMessage(from, {
            react: {
                text: '✅',
                key: m.key
            }
        })

    } catch (error) {
        console.error('Error en .wm2:', error)

        await sock.sendMessage(from, {
            text: '❌ No se pudieron modificar los metadatos del sticker con audio.'
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

handler.command = ['wm2']
handler.help = ['wm2']
handler.tags = ['stickers']
handler.menu = true

export default handler
