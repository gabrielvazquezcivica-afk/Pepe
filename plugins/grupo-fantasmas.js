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

async function obtenerPermisos(sock, m, metadata) {
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

handler.run = async (sock, m, args) => {
    const chat = m.chat

    if (!m.isGroup) {
        return m.reply('> Este comando solo funciona en grupos.')
    }

    const comando = m.command

    try {
        const metadata = await sock.groupMetadata(chat)
        const permisos = await obtenerPermisos(sock, m, metadata)

        if (permisos.error) return m.reply(`> ${permisos.error}`)

        const fantasmas = obtenerFantasmas(chat, permisos.participantes)

        if (comando === 'fantasmas') {
            if (!fantasmas.length) {
                return m.reply('> 🐸 No encontré integrantes que cumplan los criterios.')
            }

            const lista = fantasmas.slice(0, 40).map((p, i) => {
                const razones = []

                if (p.pocosMensajes) {
                    razones.push(`Menos de ${MENSAJES_MINIMOS} mensajes`)
                }

                if (p.inactivo) {
                    razones.push(`Inactivo ${DIAS_INACTIVIDAD} días o más`)
                }

                return `${i + 1}. @${p.jid.split('@')[0]}\n   Mensajes: ${p.mensajes}\n   Motivo: ${razones.join(' y ')}`
            }).join('\n\n')

            const texto =
                `👻 *REPORTE DE FANTASMAS*\n\n` +
                `Integrantes detectados: ${fantasmas.length}\n\n` +
                `${lista}\n\n` +
                `⚠️ Las estadísticas empiezan desde que se instaló el registro.`

            return sendButtons(sock, chat, {
                title: '🐸 PEPE BOT',
                text: texto,
                footer: 'Sistema de actividad',
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Ejecutar kickfan',
                            id: '.kickfan'
                        })
                    }
                ],
                quoted: m
            })
        }

        if (comando === 'kickfan') {
            if (!fantasmas.length) {
                return m.reply('> 🐸 No hay integrantes que cumplan los criterios.')
            }

            const confirmacion = await m.reply(
                `> ⚠️ Se encontraron ${fantasmas.length} integrantes.\n` +
                `> Se expulsará a los integrantes detectados que no sean administradores.\n` +
                `> Ejecutando expulsión...`
            )

            let expulsados = 0
            let errores = 0

            for (const fantasma of fantasmas) {
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
                `> No se pudieron expulsar: ${errores}`
            )
        }
    } catch (error) {
        return m.reply('> Ocurrió un error al revisar el grupo.')
    }
}

handler.command = ['fantasmas', 'kickfan']
handler.help = ['fantasmas']
handler.tags = ['grupo']
handler.menu = true

export default handler