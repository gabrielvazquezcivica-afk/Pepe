
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
// DIAGNÓSTICO DE MENSAJES
// ========================================

function safeStructure(value, depth = 0, seen = new WeakSet()) {
    if (value === null || value === undefined) return value

    if (Buffer.isBuffer(value)) {
        return `[BUFFER: ${value.length} bytes]`
    }

    if (value instanceof Uint8Array) {
        return `[UINT8ARRAY: ${value.length} bytes]`
    }

    if (typeof value !== 'object') {
        return value
    }

    if (depth > 12) return '[MAX DEPTH]'
    if (seen.has(value)) return '[CIRCULAR]'

    seen.add(value)

    if (Array.isArray(value)) {
        return value.slice(0, 20).map(item =>
            safeStructure(item, depth + 1, seen)
        )
    }

    const result = {}

    for (const key of Object.keys(value)) {
        if (
            key === 'mediaKey' ||
            key === 'fileSha256' ||
            key === 'fileEncSha256' ||
            key === 'messageSecret'
        ) {
            result[key] = '[OCULTO]'
            continue
        }

        result[key] = safeStructure(
            value[key],
            depth + 1,
            seen
        )
    }

    return result
}

function debugMessage(quoted) {
    console.log('\n========== DEBUG WM2 ==========')

    console.log(
        'CLAVES:',
        Object.keys(quoted || {})
    )

    console.log(
        'ESTRUCTURA:',
        JSON.stringify(
            safeStructure(quoted),
            null,
            2
        )
    )

    console.log('======== FIN DEBUG WM2 ========\n')
}

// ========================================
// PARCHE PROTOBUF PARA ENVÍO
// ========================================

function patchSoundSticker() {
    if (PATCHED) return

    const Sticker = proto.Message.StickerMessage
    const Message = proto.Message
    const AudioMessage = proto.Message.AudioMessage
    const FutureProofMessage = proto.Message.FutureProofMessage

    if (!Sticker || !Message || !AudioMessage || !FutureProofMessage) {
        throw new Error('No se encontró el esquema protobuf necesario.')
    }

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
// DETECTAR STICKER CON AUDIO
// ========================================

function findSoundSticker(message) {
    const visited = new Set()
    const stickers = []
    const audios = []

    let hasAudioStickerWrapper = false

    function scan(value, depth = 0) {
        if (!value || typeof value !== 'object') return
        if (depth > 20 || visited.has(value)) return

        visited.add(value)

        if (Array.isArray(value)) {
            for (const item of value) {
                scan(item, depth + 1)
            }
            return
        }

        if (value.audioStickerMessage) {
            hasAudioStickerWrapper = true
            scan(value.audioStickerMessage, depth + 1)
        }

        if (value.stickerMessage) {
            stickers.push(value.stickerMessage)

            if (value.stickerMessage.audioMessage) {
                audios.push({
                    sticker: value.stickerMessage,
                    audio: value.stickerMessage.audioMessage
                })
            }
        }

        if (value.audioMessage) {
            audios.push({
                audio: value.audioMessage
            })
        }

        const wrappers = [
            'ephemeralMessage',
            'viewOnceMessage',
            'viewOnceMessageV2',
            'documentWithCaptionMessage',
            'message',
            'content'
        ]

        for (const key of wrappers) {
            if (value[key]) {
                scan(value[key], depth + 1)
            }
        }
    }

    scan(message)

    const direct = audios.find(
        item => item.sticker && item.audio
    )

    if (direct) return direct

    if (hasAudioStickerWrapper && stickers.length === 1) {
        const audio = audios.find(item => item.audio)?.audio

        if (audio) {
            return {
                sticker: stickers[0],
                audio
            }
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
// CREAR EXIF
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

    // Mostrar estructura real recibida por Baileys
    debugMessage(quoted)

    const sound = findSoundSticker(quoted)

    if (!sound) {
        return sock.sendMessage(from, {
            text:
                '❌ No pude detectar el audio de ese sticker.\n\n' +
                'Asegúrate de responder directamente al sticker creado con *.sa*.\n\n' +
                '📋 Se guardó la estructura del mensaje en la consola de Pepe Bot.'
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

        const prepared = await prepareWAMessageMedia(
            { sticker: resultado },
            {
                upload: sock.waUploadToServer
            }
        )

        if (!prepared?.stickerMessage) {
            throw new Error('No se pudo preparar el sticker.')
        }

        prepared.stickerMessage.audioMessage = audio

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
            text:
                '❌ Error al modificar el sticker con audio.\n\n' +
                `Detalles: ${error.message}`
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
