
import {
    downloadMediaMessage,
    prepareWAMessageMedia,
    proto
} from '@whiskeysockets/baileys'

import { toSticker } from '../lib/sticker.js'

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const MAX_SECONDS = 10
const AUDIO_MIMETYPE = 'audio/ogg; codecs=opus'

// ======================================
// PARCHE PROTOBUF PARA STICKERS CON AUDIO
// ======================================

function patchSoundSticker() {
    const Msg = proto.Message

    if (!Msg || Msg.__soundStickerPatched) return

    const Sticker = Msg.StickerMessage

    if (!Sticker?.encode || !Msg.encode || !Msg.FutureProofMessage) {
        throw new Error('Protobuf de Baileys incompatible con stickers de sonido.')
    }

    // Campo 26: audioMessage dentro de StickerMessage
    const originalStickerEncode = Sticker.encode

    Sticker.encode = function (message, writer) {
        const audio = message?.audioMessage

        if (audio) delete message.audioMessage

        const result = originalStickerEncode.call(
            this,
            message,
            writer
        )

        if (audio) {
            message.audioMessage = audio

            Msg.AudioMessage.encode(
                audio,
                result.uint32(210).fork()
            ).ldelim()
        }

        return result
    }

    const originalStickerFromObject = Sticker.fromObject

    if (originalStickerFromObject) {
        Sticker.fromObject = function (object) {
            const result = originalStickerFromObject.call(
                this,
                object
            )

            if (object?.audioMessage) {
                result.audioMessage = Msg.AudioMessage.fromObject(
                    object.audioMessage
                )
            }

            return result
        }
    }

    // Campo 134: audioStickerMessage dentro de Message
    const originalMessageEncode = Msg.encode

    Msg.encode = function (message, writer) {
        const wrapper = message?.audioStickerMessage

        if (wrapper) {
            delete message.stickerMessage
            delete message.audioStickerMessage
        }

        const result = originalMessageEncode.call(
            this,
            message,
            writer
        )

        if (wrapper) {
            message.audioStickerMessage = wrapper

            Msg.FutureProofMessage.encode(
                wrapper,
                result.uint32(1074).fork()
            ).ldelim()
        }

        return result
    }

    const originalMessageFromObject = Msg.fromObject

    if (originalMessageFromObject) {
        Msg.fromObject = function (object) {
            const result = originalMessageFromObject.call(
                this,
                object
            )

            if (object?.audioStickerMessage) {
                const wrapper = object.audioStickerMessage
                const inner = wrapper.message || wrapper

                const audio =
                    inner?.stickerMessage?.audioMessage

                if (audio && inner.stickerMessage) {
                    inner.stickerMessage.audioMessage = audio
                }

                result.audioStickerMessage = {
                    message: inner
                }

                delete result.stickerMessage

                if (inner) {
                    Object.setPrototypeOf(result, inner)
                }
            }

            return result
        }
    }

    Msg.__soundStickerPatched = true
}

patchSoundSticker()

// ======================================
// DESENVOLVER MENSAJES
// ======================================

function unwrapMessage(message) {
    let msg = message

    while (msg) {
        if (msg.ephemeralMessage) {
            msg = msg.ephemeralMessage.message
        } else if (msg.viewOnceMessage) {
            msg = msg.viewOnceMessage.message
        } else if (msg.viewOnceMessageV2) {
            msg = msg.viewOnceMessageV2.message
        } else if (msg.documentWithCaptionMessage) {
            msg = msg.documentWithCaptionMessage.message
        } else {
            break
        }
    }

    return msg || {}
}

// ======================================
// DETECTAR VIDEO DIRECTO O CITADO
// ======================================

function getMediaMessage(m) {
    const current = unwrapMessage(m.message || {})

    const context =
        m.msg?.contextInfo ||
        current.extendedTextMessage?.contextInfo ||
        m.message?.extendedTextMessage?.contextInfo ||
        {}

    const quoted = unwrapMessage(
        context.quotedMessage || {}
    )

    if (current.videoMessage) {
        return {
            message: m,
            video: current.videoMessage
        }
    }

    if (quoted.videoMessage) {
        return {
            message: {
                key: {
                    remoteJid: m.chat,
                    id: context.stanzaId,
                    participant: context.participant
                },
                message: quoted
            },
            video: quoted.videoMessage
        }
    }

    return null
}

// ======================================
// DURACIÓN REAL DEL VIDEO
// ======================================

async function getVideoDuration(input) {
    const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        input
    ], {
        timeout: 15000
    })

    const duration = Number(stdout.trim())

    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('No se pudo determinar la duración del video.')
    }

    return Math.min(duration, MAX_SECONDS)
}

// ======================================
// EXTRAER AUDIO OPUS
// ======================================

async function extractAudio(input, output, seconds) {
    await execFileAsync('ffmpeg', [
        '-y',
        '-i', input,
        '-map', '0:a:0',
        '-vn',
        '-t', String(seconds),
        '-af', 'aresample=48000:async=1:first_pts=0',
        '-ac', '1',
        '-ar', '48000',
        '-c:a', 'libopus',
        '-b:a', '48k',
        '-vbr', 'on',
        '-compression_level', '10',
        '-application', 'audio',
        '-avoid_negative_ts', 'make_zero',
        '-map_metadata', '-1',
        '-f', 'ogg',
        output
    ], {
        timeout: 90000,
        maxBuffer: 10 * 1024 * 1024
    })

    const stat = await fs.stat(output)

    if (stat.size < 200) {
        throw new Error('El audio generado está vacío o incompleto.')
    }
}

// ======================================
// GENERAR WAVEFORM
// ======================================

async function getWaveform(audioPath, tempDir) {
    const pcmPath = path.join(tempDir, 'waveform.pcm')

    await execFileAsync('ffmpeg', [
        '-y',
        '-i', audioPath,
        '-vn',
        '-f', 's16le',
        '-ac', '1',
        '-ar', '8000',
        pcmPath
    ], {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
    })

    const pcm = await fs.readFile(pcmPath)
    const samples = Math.floor(pcm.length / 2)

    if (!samples) {
        throw new Error('No se pudo generar la forma de onda.')
    }

    const bars = 64
    const levels = new Array(bars).fill(0)
    const perBar = Math.max(1, Math.floor(samples / bars))

    for (let bar = 0; bar < bars; bar++) {
        const from = bar * perBar
        const to = Math.min(samples, from + perBar)

        let sum = 0

        for (let i = from; i < to; i++) {
            sum += Math.abs(pcm.readInt16LE(i * 2))
        }

        levels[bar] = to > from
            ? sum / (to - from)
            : 0
    }

    const peak = Math.max(...levels) || 1

    return Buffer.from(
        levels.map(value =>
            Math.round((value / peak) * 100)
        )
    )
}

// ======================================
// PREPARAR AUDIO PARA WHATSAPP
// ======================================

async function prepareSound(sock, audioPath, tempDir, duration) {
    const audioBuffer = await fs.readFile(audioPath)
    const waveform = await getWaveform(audioPath, tempDir)

    const prepared = await prepareWAMessageMedia(
        {
            audio: audioBuffer,
            mimetype: AUDIO_MIMETYPE,
            ptt: true
        },
        {
            upload: sock.waUploadToServer
        }
    )

    const audio = prepared.audioMessage

    if (!audio?.url || !audio?.mediaKey || !audio?.fileSha256) {
        throw new Error('WhatsApp no preparó correctamente el audio.')
    }

    audio.mimetype = AUDIO_MIMETYPE
    audio.ptt = true
    audio.seconds = Math.max(
        1,
        Math.min(MAX_SECONDS, Math.round(duration))
    )
    audio.waveform = waveform

    return audio
}

// ======================================
// ENVIAR STICKER CON SONIDO
// ======================================

async function sendSoundSticker(sock, chat, webp, audio, quoted) {
    const prepared = await prepareWAMessageMedia(
        {
            sticker: webp,
            isAnimated: true
        },
        {
            upload: sock.waUploadToServer
        }
    )

    const sticker = prepared.stickerMessage

    if (!sticker?.fileSha256 || !sticker?.url) {
        throw new Error('No se pudo preparar el sticker.')
    }

    sticker.isAnimated = true
    sticker.mimetype = 'image/webp'
    sticker.audioMessage = audio

    if (quoted?.key?.id) {
        sticker.contextInfo = {
            stanzaId: quoted.key.id,
            participant: quoted.key.participant,
            remoteJid: chat
        }
    }

    const message = {
        __proto__: prepared,
        audioStickerMessage: {
            message: prepared
        },
        messageContextInfo: {
            messageSecret: crypto.randomBytes(32)
        }
    }

    await sock.relayMessage(
        chat,
        message,
        {
            messageId: crypto.randomBytes(10).toString('hex')
        }
    )
}

// ======================================
// COMANDO .SA
// ======================================

const handler = {}

handler.run = async (sock, m) => {
    let tempDir

    try {
        const media = getMediaMessage(m)

        if (!media) {
            return m.reply(
                '🐸 Envía un video con *.sa* o responde a un video con *.sa*.'
            )
        }

        await sock.sendMessage(m.chat, {
            react: {
                text: '⏳',
                key: m.key
            }
        })

        tempDir = await fs.mkdtemp(
            path.join(os.tmpdir(), 'pepe-sa-')
        )

        const input = path.join(tempDir, 'input.mp4')
        const audioPath = path.join(tempDir, 'audio.ogg')

        const buffer = await downloadMediaMessage(
            media.message,
            'buffer',
            {},
            {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            }
        )

        if (!Buffer.isBuffer(buffer) || !buffer.length) {
            throw new Error('No se pudo descargar el video.')
        }

        await fs.writeFile(input, buffer)

        // Medir duración real
        const duration = await getVideoDuration(input)

        if (duration > MAX_SECONDS) {
            throw new Error('El video supera los 10 segundos.')
        }

        // Extraer audio y validar que exista
        await extractAudio(input, audioPath, duration)

        // Convertir el video a sticker animado
        const webp = await toSticker(buffer, true)

        if (!Buffer.isBuffer(webp) || !webp.length) {
            throw new Error('No se pudo generar el WebP.')
        }

        // Preparar audio compatible
        const audio = await prepareSound(
            sock,
            audioPath,
            tempDir,
            duration
        )

        // Enviar un único sticker con sonido
        await sendSoundSticker(
            sock,
            m.chat,
            webp,
            audio,
            m
        )

        await sock.sendMessage(m.chat, {
            react: {
                text: '✅',
                key: m.key
            }
        })

    } catch (error) {
        console.error('Error en .sa:', error)

        await sock.sendMessage(m.chat, {
            react: {
                text: '❌',
                key: m.key
            }
        }).catch(() => {})

        await m.reply(
            '❌ No se pudo crear el sticker con sonido.\n\n' +
            'Verifica que el video tenga audio y que FFmpeg y FFprobe estén instalados.'
        )

    } finally {
        if (tempDir) {
            await fs.rm(tempDir, {
                recursive: true,
                force: true
            }).catch(() => {})
        }
    }
}

handler.command = ['sa']
handler.help = ['sa']
handler.tags = ['stickers']
handler.menu = true

export default handler
