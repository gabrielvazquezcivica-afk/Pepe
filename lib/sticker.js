import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function toSticker(buffer, isVideo = false) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) {
        throw new Error('No se recibió un archivo válido.')
    }

    const tmp = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'pepe-sticker-')
    )

    const input = path.join(
        tmp,
        `input.${isVideo ? 'mp4' : 'jpg'}`
    )

    const output = path.join(tmp, 'output.webp')

    try {
        await fs.promises.writeFile(input, buffer)

        const args = isVideo
            ? [
                '-i', input,
                '-t', '6',
                '-vcodec', 'libwebp_anim',
                '-vf', 'fps=10,scale=320:320:force_original_aspect_ratio=increase,crop=320:320',
                '-loop', '0',
                '-an',
                '-vsync', '0',
                '-q:v', '75',
                '-y', output
            ]
            : [
                '-i', input,
                '-vcodec', 'libwebp',
                '-lossless', '1',
                '-q:v', '80',
                '-preset', 'picture',
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba',
                '-y', output
            ]

        await execFileAsync('ffmpeg', args)

        if (!fs.existsSync(output)) {
            throw new Error('No se generó el sticker.')
        }

        return await fs.promises.readFile(output)
    } catch (error) {
        console.error('Error al convertir sticker:', error)
        throw error
    } finally {
        await fs.promises.rm(tmp, {
            recursive: true,
            force: true
        })
    }
}