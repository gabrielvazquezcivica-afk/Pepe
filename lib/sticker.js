import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function toSticker(buffer, isVideo = false) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) {
        throw new Error('Archivo inválido o vacío.')
    }

    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'pepe-sticker-')
    )

    const input = path.join(
        tempDir,
        isVideo ? 'input.mp4' : 'input.jpg'
    )

    const output = path.join(tempDir, 'output.webp')

    try {
        await fs.writeFile(input, buffer)

        const args = isVideo
            ? [
                '-y',
                '-i', input,
                '-t', '10',
                '-vf',
                'fps=10,scale=320:320:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=yuva420p',
                '-c:v', 'libwebp_anim',
                '-loop', '0',
                '-an',
                '-vsync', '0',
                '-q:v', '65',
                '-compression_level', '3',
                output
            ]
            : [
                '-y',
                '-i', input,
                '-frames:v', '1',
                '-vf',
                'scale=512:512:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba',
                '-c:v', 'libwebp',
                '-lossless', '0',
                '-q:v', '80',
                '-compression_level', '3',
                output
            ]

        await execFileAsync('ffmpeg', args, {
            timeout: 90000,
            maxBuffer: 10 * 1024 * 1024
        })

        const result = await fs.readFile(output)

        if (!result.length) {
            throw new Error('No se generó el sticker.')
        }

        return result
    } catch (error) {
        console.error('Error FFmpeg:', error.stderr || error.message)
        throw error
    } finally {
        await fs.rm(tempDir, {
            recursive: true,
            force: true
        })
    }
}