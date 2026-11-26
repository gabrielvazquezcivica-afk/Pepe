
import {
    downloadMediaMessage,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto
} from '@whiskeysockets/baileys'

import { toSticker } from '../lib/sticker.js'

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const AUDIO_MIMETYPE = 'audio/ogg; codecs=opus'
const MAX_SECONDS = 10

const pendingAudio = new Map()
const PATCHED = Symbol.for('pepe.soundSticker.patched')

// ======================================
// PARCHE PARA ADJUNTAR AUDIO AL STICKER
// ======================================

function installStickerAudioPatch() {
    const StickerMessage = proto.Message.StickerMessage

    if (!StickerMessage?.encode) {
        throw new Error('No se encontró el codificador StickerMessage.')
    }

    if (StickerMessage.encode[PATCHED]) return

    const originalEncode = StickerMessage.encode

    const patchedEncode = function (message, writer) {
        const result = originalEncode.call(this, message, writer)

        if (message?.fileSha256) {
            const key = Buffer.from(message.fileSha256).toString('base64')
            const audio = pendingAudio.get(key)

            if (audio) {
                // Campo 26 de StickerMessage
                result.uint32(210).bytes(audio)
            }
        }

        return result
    }

    patchedEncode[PATCHED] = true
    StickerMessage.encode = patchedEncode
}

installStickerAudioPatch()

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

    return msg
}

function getMediaMessage(m) {
    const current = unwrapMessage(m.message || {})

    const context =
        m.msg?.contextInfo ||
        m.message?.extendedTextMessage?.contextInfo ||
        {}

    const quoted = unwrapMessage(context.quotedMessage || {})

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
// GENERAR AUDIO OPUS
// ======================================

async function extractAudio(input, output, seconds) {
    await execFileAsync('ffmpeg', [
        '-y',
        '-i', input,
        '-map', '0:a:0',
        '-vn',
        '-t', String(seconds),
        '-ac', '1',
        '-ar', '48000',
        '-c:a', 'libopus',
        '-b:a', '32k',
        '-application', 'voip',
        '-map_metadata', '-1',
        '-f', 'ogg',
        output
    ], {
        timeout: 90000,
        maxBuffer: 10 * 1024 * 1024
    })
}

// ======================================
// GENERAR WAVEFORM
// ======================================


async function getWaveform(audioPath) {
    const pcmPath = audioPath.replace(/\.ogg$/i, '.pcm')

    try {
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
        const bars = 64
        const levels = new Array(bars).fill(0)

        if (!samples) {
            throw new Error('No se pudo generar la forma de onda.')
        }

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

        return Uint8Array.from(
            levels.map(value =>
                Math.round(value / peak * 100)
            )
        )

    } finally {
        await fs.rm(pcmPath, { force: true }).catch(() => {})
    }
}


// ======================================
// ENVIAR STICKER CON SONIDO
// ======================================

async function sendSoundSticker(sock, chat, webp, audioPath, seconds, quoted) {
    const audioBuffer = await fs.readFile(audioPath)

    const uploadOptions = {
        upload: sock.waUploadToServer
    }

    const uploadedAudio = await prepareWAMessageMedia({
        audio: audioBuffer,
        mimetype: AUDIO_MIMETYPE,
        seconds
    }, uploadOptions)

    const uploadedSticker = await prepareWAMessageMedia({
        sticker: webp,
        isAnimated: true
    }, uploadOptions)

    const audio = uploadedAudio.audioMessage
    const sticker = uploadedSticker.stickerMessage

    const waveform = await getWaveform(audioPath)

    const audioMessageBytes = proto.Message.AudioMessage.encode(
        proto.Message.AudioMessage.create({
            url: audio.url,
            mimetype: AUDIO_MIMETYPE,
            fileSha256: audio.fileSha256,
            fileLength: audio.fileLength,
            seconds,
            ptt: true,
            mediaKey: audio.mediaKey,
            fileEncSha256: audio.fileEncSha256,
            directPath: audio.directPath,
            mediaKeyTimestamp:
                audio.mediaKeyTimestamp || Math.floor(Date.now() / 1000),
            waveform
        })
    ).finish()

    sticker.isAnimated = true
    sticker.width = 320
    sticker.height = 320

    const stickerKey = Buffer
        .from(sticker.fileSha256)
        .toString('base64')

    pendingAudio.set(stickerKey, audioMessageBytes)

    try {
        const ownJid =
            chat.endsWith('@lid') && sock.user?.lid
                ? sock.user.lid
                : sock.user?.id

        const options = { quoted }

        if (ownJid) options.userJid = ownJid

        const message = generateWAMessageFromContent(
            chat,
            { stickerMessage: sticker },
            options
        )

        // Comprobar que el audio quedó dentro del sticker
        const encoded = proto.Message.encode(message.message).finish()

        if (!encoded.length) {
            throw new Error('No se pudo codificar el sticker.')
        }

        await sock.relayMessage(
            chat,
            message.message,
            { messageId: message.key.id }
        )

    } finally {
        pendingAudio.delete(stickerKey)
    }
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

        const seconds = Number(media.video.seconds || 0)

        if (!seconds || seconds > MAX_SECONDS) {
            return m.reply(
                '❌ El video debe durar entre 1 y 10 segundos.'
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

        await fs.writeFile(input, buffer)

        // Extraer el audio original
        await extractAudio(input, audioPath, seconds)

        // Convertir el video a WebP animado
        const webp = await toSticker(buffer, true)

        // Enviar un único sticker con su audio incorporado
        await sendSoundSticker(
            sock,
            m.chat,
            webp,
            audioPath,
            seconds,
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

        await m.reply(
            '❌ No se pudo crear el sticker con sonido.\n\n' +
            'Comprueba que el video tenga audio.'
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
