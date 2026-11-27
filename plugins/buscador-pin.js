
import axios from 'axios'

const API_URL = 'https://api-faa.my.id/faa/pinterest?q='
const MAX_IMAGES = 10

const handler = {}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const query = args.join(' ').trim()

    if (!query) {
        return sock.sendMessage(chat, {
            text:
                '🐸 *PEPE BOT — PINTEREST*\n\n' +
                '📌 Escribe qué imágenes quieres buscar.\n\n' +
                '✨ *Ejemplo:* .pin ranitas aesthetic'
        }, { quoted: m })
    }

    await sock.sendMessage(chat, {
        react: { text: '🔎', key: m.key }
    }).catch(() => {})

    try {
        // Buscar imágenes
        const response = await axios.get(
            API_URL + encodeURIComponent(query),
            {
                timeout: 60000,
                headers: { Accept: 'application/json' }
            }
        )

        const data = response.data

        if (
            !data?.status ||
            !Array.isArray(data.result) ||
            !data.result.length
        ) {
            throw new Error('La API no encontró imágenes.')
        }

        const urls = [
            ...new Set(
                data.result.filter(url =>
                    typeof url === 'string' &&
                    /^https:\/\/i\.pinimg\.com\//i.test(url)
                )
            )
        ].slice(0, MAX_IMAGES)

        if (!urls.length) {
            throw new Error('No hay imágenes válidas.')
        }

        // Descargar las imágenes antes de crear el álbum
        const imagenes = []

        for (const url of urls) {
            try {
                const result = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                })

                const buffer = Buffer.from(result.data)

                if (!buffer.length) continue

                imagenes.push(buffer)

            } catch (error) {
                console.error(
                    '[PEPE PIN] Error descargando imagen:',
                    error.message
                )
            }
        }

        if (!imagenes.length) {
            throw new Error('No se pudieron descargar las imágenes.')
        }

        // Encabezado de búsqueda
        await sock.sendMessage(chat, {
            text:
                '💙 *MIKU · PINTEREST* 💙\n\n' +
                'Desliza y disfruta~ 🎶\n\n' +
                `🎧 *Búsqueda:* ${query}\n` +
                `🎶 *Resultados:* ${imagenes.length} imágenes\n\n` +
                'Desliza para ver todas~'
        }, { quoted: m })

        let enviadas = 0

        // Una sola imagen no necesita álbum
        if (imagenes.length === 1) {
            await sock.sendMessage(chat, {
                image: imagenes[0],
                caption:
                    '🎶 *Pinterest*\n\n' +
                    '🎤 Autor: No disponible\n' +
                    '🖼️ Imagen: 1/1\n\n' +
                    '💙 *Pepe Pinterest* 💙'
            })

            enviadas = 1

        } else {
            // Crear contenedor del álbum
            const album = await sock.sendMessage(chat, {
                album: {
                    expectedImageCount: imagenes.length,
                    expectedVideoCount: 0
                }
            })

            if (!album?.key) {
                throw new Error('Baileys no creó el contenedor del álbum.')
            }

            // Vincular cada imagen al mismo álbum
            for (let i = 0; i < imagenes.length; i++) {
                try {
                    await sock.sendMessage(chat, {
                        image: imagenes[i],

                        caption:
                            '🎶 *Pinterest*\n\n' +
                            '🎤 Autor: No disponible\n' +
                            `🖼️ Imagen: ${i + 1}/${imagenes.length}\n\n` +
                            '💙 *Pepe Pinterest* 💙',

                        albumParentKey: album.key
                    })

                    enviadas++

                } catch (error) {
                    console.error(
                        `[PEPE PIN] Error en imagen ${i + 1}:`,
                        error.message
                    )
                }
            }
        }

        await sock.sendMessage(chat, {
            text:
                '💙 *PINTEREST FINALIZADO* 💙\n\n' +
                `🖼️ Imágenes enviadas: ${enviadas}/${imagenes.length}\n\n` +
                '🐸 *PEPE BOT*'
        })

        await sock.sendMessage(chat, {
            react: {
                text: enviadas ? '✅' : '❌',
                key: m.key
            }
        }).catch(() => {})

    } catch (error) {
        console.error('[PEPE PIN]', error)

        await sock.sendMessage(chat, {
            react: { text: '❌', key: m.key }
        }).catch(() => {})

        await sock.sendMessage(chat, {
            text:
                '❌ *No se pudieron enviar los resultados.*\n\n' +
                `Detalle: ${error.message}\n\n` +
                'Comprueba que tu versión de Baileys admita álbumes.'
        }, { quoted: m }).catch(() => {})
    }
}

handler.command = ['pin', 'pinterest']
handler.help = ['pin <búsqueda>']
handler.tags = ['buscador']
handler.menu = true

export default handler
