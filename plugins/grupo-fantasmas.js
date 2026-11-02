
import fs from 'node:fs'
import path from 'node:path'
import { sendButtons } from 'baileys-buttons'

const DB_FILE = path.resolve('./database/actividad.json')

const MENSAJES_MINIMOS = 10
const DIAS_INACTIVIDAD = 30
const TIEMPO_INACTIVIDAD = DIAS_INACTIVIDAD * 24 * 60 * 60 * 1000

function cargarDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return {}
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch {
        return {}
    }
}

const normalizar = jid =>
    String(jid || '').replace(/:\d+@/, '@').trim()

const buscar = (participantes, identificadores = []) => {
    const ids = identificadores.filter(Boolean).map(normalizar)

    return participantes.find(p => {
        const idsParticipante = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizar)

        return idsParticipante.some(id => ids.includes(id))
    })
}

async function comprobarPermisos(sock, m, metadata) {
    const participantes = metadata.participants || []

    const usuario = buscar(participantes, [
        m.key?.participant,
        m.key?.participantAlt,
        m.sender,
        m.senderLid
    ])

    if (!['admin', 'superadmin'].includes(usuario?.admin)) {
        return { error: 'Solo los administradores pueden usar este comando.' }
    }

    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const bot = buscar(participantes, [
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ])

    if (!['admin', 'superadmin'].includes(bot?.admin)) {
        return { error: 'Necesito ser administrador para expulsar integrantes.' }
    }

    return { participantes, usuario }
}

function obtenerFantasmas(chat, participantes) {
    const db = cargarDB()
    const actividad = db[chat] || {}
    const ahora = Date.now()

    return participantes
        .filter(p => !['admin', 'superadmin'].includes(p.admin))
        .map(p => {
            const ids = [p.id, p.jid, p.lid]
                .filter(Boolean)
                .map(normalizar)

            let registro

            for (const id of ids) {
                if (actividad[id]) {
                    registro = actividad[id]
                    break
                }
            }

            const mensajes = registro?.mensajes || 0
            const ultimaActividad = registro?.ultimaActividad || 0

            const pocosMensajes = mensajes < MENSAJES_MINIMOS
            const inactivo = !ultimaActividad ||
                ahora - ultimaActividad >= TIEMPO_INACTIVIDAD

            return {
                jid: p.id,
                mensajes,
                ultimaActividad,
                pocosMensajes,
                inactivo
            }
        })
        .filter(p => p.pocosMensajes || p.inactivo)
}

const handler = {}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const comando = String(m.command || '').toLowerCase()

    if (!m.isGroup) {
        return m.reply('> Este comando solo funciona en grupos.')
    }

    try {
        const metadata = await sock.groupMetadata(chat)
        const permisos = await comprobarPermisos(sock, m, metadata)

        if (permisos.error) {
            return m.reply(`> ${permisos.error}`)
        }

        const fantasmas = obtenerFantasmas(chat, permisos.participantes)

        if (!fantasmas.length) {
            return m.reply('> 🐸 No encontré integrantes que cumplan los criterios.')
        }

        if (comando === 'fantasmas') {
            const listaFantasmas = fantasmas.slice(0, 40)
            const menciones = listaFantasmas.map(p => p.jid)

            const lista = listaFantasmas.map((p, i) => {
                const razones = []

                if (p.pocosMensajes) {
                    razones.push('Menos de 10 mensajes')
                }

                if (p.inactivo) {
                    razones.push('Inactivo 30 días o más')
                }

                return `${i + 1}. @${p.jid.split('@')[0]}
   Mensajes: ${p.mensajes}
   Motivo: ${razones.join(' y ')}`
            }).join('\n\n')

            await sock.sendMessage(chat, {
                text:
                    `👻 *REPORTE DE FANTASMAS*\n\n` +
                    `Detectados: ${fantasmas.length}\n\n` +
                    `${lista}\n\n` +
                    `⚠️ Registro desde la instalación del sistema.`,
                mentions: menciones
            }, { quoted: m })

            return sendButtons(sock, chat, {
                title: '🐸 PEPE BOT',
                text: '¿Qué deseas hacer con los integrantes detectados?',
                footer: 'PEPE BOT • Fantasmas',
                buttons: [
                    {
                        id: '.kickfan',
                        displayText: '👻 Ejecutar kickfan'
                    }
                ],
                quoted: m
            })
        }

        if (comando === 'kickfan') {
            const confirmacion = await m.reply(
                `> ⚠️ Se encontraron ${fantasmas.length} integrantes que cumplen los criterios.\n` +
                `> Se excluirán los administradores y el bot.\n` +
                `> Iniciando expulsiones...`
            )

            let expulsados = 0
            let errores = 0

            for (const fantasma of fantasmas) {
                const participante = buscar(
                    permisos.participantes,
                    [fantasma.jid]
                )

                if (!participante) continue

                if (['admin', 'superadmin'].includes(participante.admin)) {
                    continue
                }

                try {
                    await sock.groupParticipantsUpdate(
                        chat,
                        [fantasma.jid],
                        'remove'
                    )

                    expulsados++
                } catch {
                    errores++
                }
            }

            return m.reply(
                `> 👻 *KICKFAN FINALIZADO*\n\n` +
                `> Expulsados: ${expulsados}\n` +
                `> Errores: ${errores}`
            )
        }
    } catch (error) {
        console.error('[FANTASMAS]', error)
        return m.reply('> Ocurrió un error al revisar el grupo.')
    }
}

handler.command = ['fantasmas', 'kickfan']
handler.help = ['fantasmas']
handler.tags = ['grupo']
handler.menu = true

export default handler
