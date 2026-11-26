
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
// LEER CAMPOS PROTOBUF
// ========================================

function readVarint(buffer, state) {
    let value = 0
    let multiplier = 1

    while (state.pos < buffer.length) {
        const byte = buffer[state.pos++]

        value += (byte & 127) * multiplier

        if (!(byte & 128)) return value

        multiplier *= 128

        if (multiplier > Number.MAX_SAFE_INTEGER) {
            throw new Error('Varint demasiado grande')
        }
    }

    throw new Error('Varint incompleto')
}

function getField(buffer, wantedField) {
    const state = { pos: 0 }

    while (state.pos < buffer.length) {
        const tag = readVarint(buffer, state)
        const field = Math.floor(tag / 8)
        const wire = tag & 7

        if (wire === 0) {
            const start = state.pos

            while (state.pos < buffer.length) {
                const byte = buffer[state.pos++]
                if (!(byte & 128)) break
            }

            if (field === wantedField) {
                return {
                    wire,
                    data: buffer.subarray(start, state.pos)
                }
            }
        } else if (wire === 1) {
            const start = state.pos
            state.pos += 8

            if (field === wantedField) {
                return {
                    wire,
                    data: buffer.subarray(start, state.pos)
                }
            }
        } else if (wire === 2) {
            const length = readVarint(buffer, state)
            const start = state.pos
            const end = start + length

            if (end > buffer.length) {
                throw new Error('Campo protobuf incompleto')
            }

            state.pos = end

            if (field === wantedField) {
                return {
                    wire,
                    data: buffer.subarray(start, end)
                }
            }
        } else if (wire === 5) {
            const start = state.pos
            state.pos += 4

            if (field === wantedField) {
                return {
                    wire,
                    data: buffer.subarray(start, state.pos)
                }
            }
        } else {
            throw new Error(`Wire type no compatible: ${wire}`)
        }
    }

    return null
}

function getRawInput(input, length) {
    if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
        return Buffer.from(input)
    }

    if (input?.buf) {
        const start = input.pos || 0
        const end = length === undefined
            ? input.len
            : start + length

        return Buffer.from(input.buf.subarray(start, end))
    }

    return null
}

// ========================================
// PARCHE DE DECODIFICACIÓN Y CODIFICACIÓN
// ========================================

function patchSoundSticker() {
    if (PATCHED) return

    const Message = proto.Message
    const Sticker = Message.StickerMessage
    const AudioMessage = Message.AudioMessage
    const FutureProofMessage = Message.FutureProofMessage

    if (
        !Sticker?.decode ||
        !Sticker?.encode ||
        !Message?.decode ||
        !Message?.encode ||
        !AudioMessage?.decode ||
        !FutureProofMessage?.decode
    ) {
        throw new Error('No se encontraron las funciones protobuf necesarias.')
    }

    // ------------------------------------
    // StickerMessage: campo 26 = audio
    // ------------------------------------

    const originalStickerDecode = Sticker.decode

    Sticker.decode = function (input, length) {
        const raw = getRawInput(input, length)

        const result = originalStickerDecode.call(
            this,
            input,
            length
        )

        if (raw) {
            const field = getField(raw, 26)

            if (field?.wire === 2) {
                result.audioMessage = AudioMessage.decode(field.data)
            }
        }

        return result
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

    // ------------------------------------
    // Message: campo 134 = audioSticker
    // ------------------------------------

    const originalMessageDecode = Message.decode

    Message.decode = function (input, length) {
        const raw = getRawInput(input, length)

        const result = originalMessageDecode.call(
            this,
            input,
            length
        )

        if (raw) {
            const field = getField(raw, 134)

            if (field?.wire === 2) {
                result.audioStickerMessage =
                    FutureProofMessage.decode(field.data)
            }
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

    console.log('[WM2] Parche protobuf instalado correctamente.')
}

// IMPORTANTE: se instala al cargar el plugin,
// no cuando el usuario ejecuta el comando.
patchSoundSticker()

// ========================================
// BUSCAR STICKER CON AUDIO
// ========================================

function findSoundSticker(message) {
    const visited = new Set()
    const results = []

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

        if (value.stickerMessage?.audioMessage) {
            results.push({
                sticker: value.stickerMessage,
                audio: value.stickerMessage.audioMessage
            })
        }

        const wrapper = value.audioStickerMessage

        if (wrapper) {
            scan(wrapper.message, depth + 1)
        }

        if (value.stickerMessage) {
            scan(value.stickerMessage, depth + 1)
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

    return results[0] || null
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

    const sound = findSoundSticker(quoted)

    if (!sound) {
        console.log(
            '[WM2] Estructura recibida:',
            JSON.stringify(quoted, (key, value) => {
                if (Buffer.isBuffer(value)) return '[BUFFER]'
                if (value instanceof Uint8Array) return '[UINT8ARRAY]'
                return value
            }, 2)
        )

        return sock.sendMessage(from, {
            text:
                '❌ No pude detectar el audio de ese sticker.\n\n' +
                'Reinicia Pepe Bot para cargar el parche y vuelve a probar.'
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

        // Solo cambia los metadatos EXIF.
        // No modifica los fotogramas de la animación.
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

        // Adjuntar el AudioMessage recuperado
        prepared.stickerMessage.audioMessage = audio

        const message = {
            ...prepared,
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
        console.error('[WM2] Error:', error)

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
