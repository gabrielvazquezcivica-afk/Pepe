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

function buscar(participantes, identificadores = []) {
    const ids = identificadores
        .filter(Boolean)
        .map(normalizar)

    return participantes.find(p => {
        const idsParticipante = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizar)

        return idsParticipante.some(id => ids.includes(id))
    })
}

function esAdmin(participante) {
    return ['admin', 'superadmin'].includes(participante?.admin)
}

async function comprobarPermisos(sock, m, metadata) {
    const participantes = metadata.participants || []

    const usuario = buscar(participantes, [
        m.key?.participant,
        m.key?.participantAlt,
        m.participant,
        m.sender,
        m.senderLid
    ])

    if (!esAdmin(usuario)) {
        return {
            error: '> ✖️ Este comando solo puede ser utilizado por administradores.'
        }
    }

    const botId = sock.user?.id || ''
    const botNumero = botId.split(':')[0].split('@')[0]

    const bot = buscar(participantes, [
        botId,
        sock.user?.lid,
        `${botNumero}@s.whatsapp.net`
    ])

    if (!esAdmin(bot)) {
        return {
            error: '> ✖️ Necesito ser administrador para expulsar integrantes.'
        }
    }

    return { participantes }
}

function obtenerFantasmas(chat, participantes) {
    const db = cargarDB()
    const actividad = db[chat] || {}
    const ahora = Date.now()

    return participantes
        .filter(p => !esAdmin(p))
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
            const inactivo =
                !ultimaActividad ||
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

handler.run = async (sock, m, args, context) => {
    const comando = m.command
    const chat = m.chat

    if (!m.isGroup) {
        return m.reply('> ✖️ Este comando solo funciona en grupos.')
    }

    try {
        const metadata = await sock.groupMetadata(chat)
        const permisos = await comprobarPermisos(sock, m, metadata)

        if (permisos.error) return m.reply(permisos.error)

        const fantasmas = obtenerFantasmas(
            chat,
            permisos.participantes
        )

        if (comando === 'fantasmas') {
            if (!fantasmas.length) {
                return m.reply(
                    '> 👻 No se encontraron integrantes inactivos o con menos de 10 mensajes.'
                )
            }

            const lista = fantasmas.slice(0, 40)

            const texto = lista.map((p, i) => {
                const numero = p.jid.split('@')[0]

                const estado = p.inactivo
                    ? 'Inactivo'
                    : 'Poca actividad'

                return `${i + 1}. @${numero}\n   Mensajes: ${p.mensajes}\n   Estado: ${estado}`
            }).join('\n\n')

            await sock.sendMessage(chat, {
                text:
                    `👻 *FANTASMAS DETECTADOS*\n\n` +
                    `${texto}\n\n` +
                    `Total encontrados: ${fantasmas.length}`,
                mentions: lista.map(p => p.jid)
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
            if (!fantasmas.length) {
                return m.reply(
                    '> 👻 No hay fantasmas que expulsar.'
                )
            }

            const idsExpulsar = [
                ...new Set(
                    fantasmas
                        .map(p => p.jid)
                        .filter(Boolean)
                )
            ]

            if (!idsExpulsar.length) {
                return m.reply(
                    '> ✖️ No se encontraron identificadores válidos.'
                )
            }

            await m.reply(
                `> 👻 Se enviará una solicitud para expulsar a ${idsExpulsar.length} integrantes.`
            )

            // Una sola llamada con todos los identificadores.
            const resultado = await sock.groupParticipantsUpdate(
                chat,
                idsExpulsar,
                'remove'
            )

            const exitosos = Array.isArray(resultado)
                ? resultado.filter(r =>
                    r.status === '200' ||
                    r.status === 200
                ).length
                : 0

            return m.reply(
                `> 👻 *KICKFAN FINALIZADO*\n\n` +
                `> Solicitudes enviadas: ${idsExpulsar.length}\n` +
                `> Confirmadas por WhatsApp: ${exitosos}\n\n` +
                `> Algunos integrantes podrían no haber sido expulsados si WhatsApp rechazó la solicitud.`
            )
        }

    } catch (error) {
        console.error('[FANTASMAS]', error)
        return m.reply(
            '> ✖️ Ocurrió un error al procesar el comando.'
        )
    }
}

handler.command = ['fantasmas', 'kickfan']
handler.help = ['fantasmas']
handler.tags = ['grupo']
handler.menu = true

export default handler