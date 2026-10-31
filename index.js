
import { connect } from './lib/connection.js'
import config from './config.js'
import { DisconnectReason } from '@whiskeysockets/baileys'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import chalk from 'chalk'
import pino from 'pino'
import { isBanned } from './lib/banlist.js'

// Configuración
const BASE_DIR = path.dirname(fileURLToPath(import.meta.url))
const PLUGINS_DIR = path.join(BASE_DIR, 'plugins')
const logger = pino({ level: 'silent' })

const plugins = new Map()
const processedMessages = new Set()

let activeSock = null
let reconnecting = false

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Sistema AFK
const afkPath = path.join(BASE_DIR, 'database', 'afk.json')

function leerAFK() {
    try {
        if (!fs.existsSync(afkPath)) return {}

        const contenido = fs.readFileSync(afkPath, 'utf8')
        return contenido.trim() ? JSON.parse(contenido) : {}
    } catch (error) {
        console.error(chalk.red('❌ Error leyendo afk.json:'), error.message)
        return {}
    }
}

function guardarAFK(db) {
    fs.mkdirSync(path.dirname(afkPath), { recursive: true })
    fs.writeFileSync(afkPath, JSON.stringify(db, null, 2))
}

// Sistema MUTE
const mutePath = path.join(BASE_DIR, 'database', 'muteados.json')

function leerMuteados() {
    try {
        if (!fs.existsSync(mutePath)) return {}

        const contenido = fs.readFileSync(mutePath, 'utf8')
        return contenido.trim() ? JSON.parse(contenido) : {}
    } catch (error) {
        console.error(chalk.red('❌ Error leyendo muteados.json:'), error.message)
        return {}
    }
}

async function revisarMuteado(sock, message) {
    const chat = message.key.remoteJid

    if (!chat?.endsWith('@g.us')) return false
    if (message.key.fromMe) return false

    const identificadores = [
        message.key.participant,
        message.key.participantAlt,
        message.participant,
        message.sender,
        message.senderLid
    ].filter(Boolean).map(limpiarJid)

    if (!identificadores.length) return false

    const db = leerMuteados()
    const muteados = (db[chat] || []).map(limpiarJid)

    if (!identificadores.some(id => muteados.includes(id))) {
        return false
    }

    try {
        await sock.sendMessage(chat, {
            delete: message.key
        })
    } catch (error) {
        console.error(chalk.red('❌ No se pudo borrar mensaje de usuario muteado:'), error.message)
    }

    return true
}

function limpiarJid(jid = '') {
    return String(jid).replace(/:\d+@/, '@').trim()
}

function numeroDeJid(jid = '') {
    const limpio = limpiarJid(jid)

    if (limpio.endsWith('@lid')) return ''

    return limpio
        .replace(/@.+$/, '')
        .replace(/\D/g, '')
}

function obtenerIdsParticipante(participante) {
    if (!participante) return []

    return [
        participante.id,
        participante.jid,
        participante.lid
    ].filter(Boolean).map(limpiarJid)
}

function buscarAFK(grupoAFK, identificadores = []) {
    const ids = [...new Set(
        identificadores.filter(Boolean).map(limpiarJid)
    )]

    for (const id of ids) {
        if (grupoAFK[id]) return id
    }

    const numeros = ids
        .map(numeroDeJid)
        .filter(numero => numero.length >= 8)

    return Object.keys(grupoAFK).find(clave => {
        const registro = grupoAFK[clave]
        const numeroGuardado = String(registro?.numero || '')
            .replace(/\D/g, '')

        if (!numeroGuardado) return false

        return numeros.includes(numeroGuardado)
    })
}

async function obtenerParticipante(sock, from, identificadores) {
    try {
        const metadata = await sock.groupMetadata(from)

        const idsBuscados = new Set(
            identificadores.filter(Boolean).map(limpiarJid)
        )

        const numerosBuscados = new Set(
            identificadores.map(numeroDeJid).filter(n => n.length >= 8)
        )

        return metadata.participants.find(participante => {
            const ids = obtenerIdsParticipante(participante)

            if (ids.some(id => idsBuscados.has(id))) return true

            return ids.some(id => {
                const numero = numeroDeJid(id)
                return numero && numerosBuscados.has(numero)
            })
        }) || null
    } catch (error) {
        console.error(chalk.red('❌ Error obteniendo participante:'), error.message)
        return null
    }
}

// Detectar menciones AFK
async function detectarMencionesAFK(sock, message) {
    const from = message.key.remoteJid

    if (!from?.endsWith('@g.us')) return

    const msg = unwrapMessage(message.message)

    const tipos = [
        msg.extendedTextMessage,
        msg.imageMessage,
        msg.videoMessage,
        msg.documentMessage
    ].filter(Boolean)

    const mencionados = [
        ...new Set(
            tipos.flatMap(tipo => tipo.contextInfo?.mentionedJid || [])
                .map(limpiarJid)
                .filter(Boolean)
        )
    ]

    if (!mencionados.length) return

    const db = leerAFK()
    const grupoAFK = db[from] || {}

    if (!Object.keys(grupoAFK).length) return

    const avisos = []
    const vistos = new Set()

    for (const mencionado of mencionados) {
        const participante = await obtenerParticipante(
            sock,
            from,
            [mencionado]
        )

        const ids = [
            mencionado,
            ...obtenerIdsParticipante(participante)
        ]

        const clave = buscarAFK(grupoAFK, ids)

        if (!clave || vistos.has(clave)) continue

        vistos.add(clave)

        const registro = grupoAFK[clave]
        const jidReal = participante?.id || mencionado

        avisos.push({
            jid: jidReal,
            numero: registro.numero || numeroDeJid(jidReal) || 'Usuario',
            razon: registro.razon || 'Sin razón especificada'
        })
    }

    if (!avisos.length) return

    const texto = avisos.map(usuario =>
`╭─── ⋆⋅☆⋅⋆ ───╮
       💤 𝐔𝐒𝐔𝐀𝐑𝐈𝐎 𝐀𝐅𝐊
╰─── ⋆⋅☆⋅⋆ ───╯

> 🐸 @${usuario.numero}
> 💬 Se encuentra ausente.
> 📝 Razón: ${usuario.razon}`
    ).join('\n\n')

    await sock.sendMessage(from, {
        text: texto,
        mentions: avisos.map(usuario => usuario.jid)
    }, { quoted: message })
}

// Detectar regreso AFK
async function detectarRegresoAFK(sock, message) {
    const from = message.key.remoteJid

    if (!from?.endsWith('@g.us')) return
    if (message.key.fromMe) return

    const identificadores = [
        message.key.participant,
        message.key.participantAlt,
        message.participant,
        message.sender,
        message.senderLid
    ].filter(Boolean).map(limpiarJid)

    if (!identificadores.length) return

    const db = leerAFK()
    const grupoAFK = db[from] || {}

    if (!Object.keys(grupoAFK).length) return

    const participante = await obtenerParticipante(
        sock,
        from,
        identificadores
    )

    if (participante) {
        identificadores.push(...obtenerIdsParticipante(participante))
    }

    const clave = buscarAFK(grupoAFK, identificadores)

    if (!clave) return

    const registro = grupoAFK[clave]
    const numero = registro.numero || numeroDeJid(clave) || 'Usuario'

    delete grupoAFK[clave]

    if (Object.keys(grupoAFK).length) {
        db[from] = grupoAFK
    } else {
        delete db[from]
    }

    guardarAFK(db)

    const jidReal =
        participante?.id ||
        identificadores.find(id => id.endsWith('@s.whatsapp.net')) ||
        identificadores.find(id => id.endsWith('@lid')) ||
        clave

    await sock.sendMessage(from, {
        text:
`╭─── ⋆⋅☆⋅⋆ ───╮
       🌿 𝐀𝐅𝐊 𝐅𝐈𝐍𝐀𝐋𝐈𝐙𝐀𝐃𝐎
╰─── ⋆⋅☆⋅⋆ ───╯

> 🐸 @${numero}
> ✅ Ha regresado y ya no está AFK.`,
        mentions: [jidReal]
    }, { quoted: message })
}

// Cargar plugins
async function loadPlugins() {
    plugins.clear()

    if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true })
    }

    async function scan(directory) {
        const files = fs.readdirSync(directory, {
            withFileTypes: true
        }).sort((a, b) => a.name.localeCompare(b.name))

        for (const file of files) {
            const fullPath = path.join(directory, file.name)

            if (file.isDirectory()) {
                await scan(fullPath)
                continue
            }

            if (
                !file.isFile() ||
                !/\.(js|mjs)$/i.test(file.name) ||
                file.name.endsWith('.disabled.js') ||
                file.name.endsWith('.disabled.mjs')
            ) {
                continue
            }

            try {
                const mod = await import(
                    `${pathToFileURL(fullPath).href}?update=${Date.now()}`
                )

                const handler =
                    mod.default ||
                    mod.Handler ||
                    mod.handler

                if (!handler) {
                    console.log(chalk.yellow(`⚠ Sin handler: ${file.name}`))
                    continue
                }

                const commands =
                    handler.command ??
                    handler.help ??
                    mod.command ??
                    mod.help ??
                    []

                const commandList = Array.isArray(commands)
                    ? commands
                    : [commands]

                let count = 0

                for (const command of commandList) {
                    if (typeof command !== 'string') continue

                    const name = command
                        .trim()
                        .toLowerCase()
                        .split(/\s+/)[0]

                    if (!name) continue

                    if (!plugins.has(name)) {
                        plugins.set(name, [])
                    }

                    plugins.get(name).push({
                        handler,
                        module: mod,
                        file: fullPath
                    })

                    count++
                }

                console.log(
                    chalk.green('✔ ') +
                    chalk.white(path.relative(PLUGINS_DIR, fullPath)) +
                    chalk.gray(` (${count} comandos)`)
                )
            } catch (error) {
                console.error(
                    chalk.red(`❌ Plugin ${file.name}:`),
                    error.stack || error.message
                )
            }
        }
    }

    await scan(PLUGINS_DIR)

    mostrarDiagnostico()
}

// Mostrar diagnóstico
function mostrarDiagnostico() {
    const categorias = new Set()
    const archivosMenu = new Set()

    for (const entradas of plugins.values()) {
        for (const entrada of entradas) {
            const handler = entrada.handler

            if (handler.menu === false) continue

            archivosMenu.add(entrada.file)

            const tags = Array.isArray(handler.tags)
                ? handler.tags
                : ['otros']

            for (const tag of tags) {
                categorias.add(String(tag))
            }
        }
    }

    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.greenBright.bold('🐸 PEPE BOT | DIAGNÓSTICO'))
    console.log(chalk.cyan('📂 Directorio del index: ') + BASE_DIR)
    console.log(chalk.cyan('📂 Directorio de plugins: ') + PLUGINS_DIR)
    console.log(chalk.cyan('⚡ Comandos registrados: ') + plugins.size)
    console.log(chalk.cyan('📦 Archivos en el menú: ') + archivosMenu.size)
    console.log(
        chalk.cyan('📁 Categorías detectadas: ') +
        ([...categorias].join(', ') || 'Ninguna')
    )
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
}

// Desenvolver mensajes
function unwrapMessage(message) {
    let current = message

    for (let i = 0; i < 5; i++) {
        const next =
            current?.ephemeralMessage?.message ||
            current?.viewOnceMessage?.message ||
            current?.viewOnceMessageV2?.message ||
            current?.documentWithCaptionMessage?.message

        if (!next) break
        current = next
    }

    return current || {}
}

// Obtener texto del mensaje
function getMessageText(message) {
    const msg = unwrapMessage(message.message)

    if (msg.conversation) return msg.conversation

    if (msg.extendedTextMessage?.text) {
        return msg.extendedTextMessage.text
    }

    if (msg.imageMessage?.caption) return msg.imageMessage.caption
    if (msg.videoMessage?.caption) return msg.videoMessage.caption
    if (msg.documentMessage?.caption) return msg.documentMessage.caption

    if (msg.buttonsResponseMessage?.selectedButtonId) {
        return msg.buttonsResponseMessage.selectedButtonId
    }

    if (msg.templateButtonReplyMessage?.selectedId) {
        return msg.templateButtonReplyMessage.selectedId
    }

    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return msg.listResponseMessage.singleSelectReply.selectedRowId
    }

    const native =
        msg.interactiveResponseMessage?.nativeFlowResponseMessage

    if (native?.paramsJson) {
        try {
            const params = JSON.parse(native.paramsJson)

            return (
                params.id ||
                params.row_id ||
                params.selected_id ||
                params.selectedRowId ||
                params.button_id ||
                ''
            )
        } catch {
            return ''
        }
    }

    return ''
}

// Identificar owners
function normalizeId(value) {
    return String(value || '')
        .trim()
        .split('@')[0]
        .split(':')[0]
}

function isOwnerMessage(sender) {
    const senderId = normalizeId(sender)
    const senderDigits = senderId.replace(/\D/g, '')

    const owners = Array.isArray(config.owner)
        ? config.owner
        : []

    const ownerLids = Array.isArray(config.ownerLid)
        ? config.ownerLid
        : []

    const matchesNumber = owners.some(number => {
        const normalized = String(number || '').replace(/\D/g, '')

        return normalized.length > 0 &&
            normalized === senderDigits
    })

    const matchesLid = ownerLids.some(lid => {
        const normalized = normalizeId(lid)

        return normalized.length > 0 &&
            normalized === senderId
    })

    return matchesNumber || matchesLid
}

// Normalizar mensajes
function normalizeMessage(message, sock) {
    const chat = message.key.remoteJid
    const sender = message.key.participant || chat

    return {
        ...message,
        chat,
        sender,
        senderNumber: normalizeId(sender),
        fromMe: Boolean(message.key.fromMe),
        isGroup: chat.endsWith('@g.us'),
        isOwner: isOwnerMessage(sender),
        pushName: message.pushName || 'Usuario',
        botName: config.BOT_NAME,
        ownerName: config.OWNER_NAME,
        text: getMessageText(message),

        reply: (text, options = {}) =>
            sock.sendMessage(
                chat,
                { text: String(text), ...options },
                { quoted: message }
            )
    }
}

// Detectar comandos
function parseCommand(text) {
    if (!text || typeof text !== 'string') return null

    const input = text.trim()
    const prefix = config.PREFIX

    if (typeof prefix !== 'string' || !prefix.length) {
        console.error('❌ Revisa PREFIX en config.js')
        return null
    }

    if (!input.startsWith(prefix)) return null

    const body = input.slice(prefix.length).trim()
    if (!body) return null

    const parts = body.split(/\s+/)
    const command = parts.shift().toLowerCase()

    return {
        prefix,
        command,
        args: parts,
        text: parts.join(' ')
    }
}

// Registrar comandos
async function logCommand(m, parsed, sock) {
    let groupName = 'Chat privado'

    if (m.isGroup) {
        try {
            const metadata = await sock.groupMetadata(m.chat)
            groupName = metadata.subject || 'Grupo sin nombre'
        } catch {
            groupName = 'Grupo desconocido'
        }
    }

    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.greenBright.bold('🐸 PEPE BOT | COMANDO'))
    console.log(chalk.yellow('👤 Usuario: ') + chalk.white(m.pushName))
    console.log(chalk.cyan('🆔 Remitente: ') + chalk.white(m.sender))
    console.log(chalk.magenta('👥 Chat: ') + chalk.white(groupName))
    console.log(
        chalk.blueBright('⚡ Comando: ') +
        chalk.white(`${parsed.prefix}${parsed.command}`)
    )
    console.log(
        chalk.yellowBright('📝 Argumentos: ') +
        chalk.white(parsed.text || 'Ninguno')
    )
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
}

// Ejecutar plugins
async function executePlugin(plugin, m, parsed, sock) {
    const { handler, module } = plugin

    m.command = parsed.command
    m.args = parsed.args
    m.textCommand = parsed.text
    m.commandMap = plugins

    const context = {
        conn: sock,
        sock,
        m,
        args: parsed.args,
        text: parsed.text,
        usedPrefix: parsed.prefix,
        prefix: parsed.prefix,
        command: parsed.command,
        isOwner: m.isOwner,
        owner: m.isOwner,
        logger
    }

    // Ejecutar la función especial para seleccionar una voz TTS
    if (
        parsed.command === 'ttsvoice' &&
        typeof handler.voice === 'function'
    ) {
        return await handler.voice(sock, m, parsed.args, context)
    }

    // Ejecutar plugins normalmente
    if (typeof handler.run === 'function') {
        return await handler.run(sock, m, parsed.args, context)
    }

    // Ejecutar handlers que sean funciones
    if (typeof handler === 'function') {
        return await handler(m, context)
    }

    // Ejecutar handler alternativo del módulo
    if (typeof module?.handler === 'function') {
        return await module.handler(m, context)
    }
}

// Procesar mensajes
async function processMessage(message, sock) {
    if (!message?.key?.remoteJid || !message.message) return
    if (message.key.fromMe) return

    const chat = message.key.remoteJid
    if (chat === 'status@broadcast') return

    try {
        await detectarRegresoAFK(sock, message)
        await detectarMencionesAFK(sock, message)
    } catch (error) {
        console.error(chalk.red('❌ Error en sistema AFK:'), error)
    }

    const m = normalizeMessage(message, sock)

    if (!m.text || typeof m.text !== 'string') return

    const parsed = parseCommand(m.text)
    if (!parsed) return

    const matches = plugins.get(parsed.command)
    if (!matches?.length) return

    const isBanCommand = ['ban', 'unban'].includes(parsed.command)

    if (!m.isOwner && !isBanCommand && isBanned(m.sender)) {
        return
    }

    await logCommand(m, parsed, sock)

    for (const plugin of matches) {
        try {
            await executePlugin(plugin, m, parsed, sock)
        } catch (error) {
            console.error(
                chalk.red(`❌ Error en ${parsed.prefix}${parsed.command}:`),
                error
            )

            try {
                await m.reply(
                    `❌ Ocurrió un error al ejecutar ${parsed.prefix}${parsed.command}.`
                )
            } catch {}
        }
    }
}

// Conectar socket
async function attachSocket(sock) {
    activeSock = sock

    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (sock !== activeSock || type !== 'notify') return

        for (const message of messages) {
            if (!message?.key?.id || message.key.fromMe) continue

            const chat = message.key.remoteJid
            if (!chat || chat === 'status@broadcast') continue

            const id = `${chat}:${message.key.id}`

            if (processedMessages.has(id)) continue

            processedMessages.add(id)

            if (processedMessages.size > 5000) {
                const oldest = processedMessages.values().next().value
                processedMessages.delete(oldest)
            }

            processMessage(message, sock).catch(error => {
                console.error(
                    chalk.red('❌ Error procesando comando:'),
                    error
                )
            })
        }
    })

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (sock !== activeSock || connection !== 'close') return
        if (reconnecting) return

        const reason = lastDisconnect?.error?.output?.statusCode

        console.log(
            chalk.yellow(
                `⚠️ Conexión cerrada. Código: ${reason ?? 'desconocido'}`
            )
        )

        if (
            reason === 401 ||
            reason === DisconnectReason.loggedOut
        ) {
            console.log(chalk.red(
                '❌ La sesión se cerró. Revisa la vinculación de WhatsApp.'
            ))
            return
        }

        reconnecting = true

        try {
            await sleep(reason === 515 ? 1500 : 3000)

            if (sock !== activeSock) return

            console.log(chalk.cyan('🔄 Reconectando...'))

            const newSock = await connect()
            await attachSocket(newSock)

            console.log(chalk.green('✅ Nueva conexión registrada.'))
        } catch (error) {
            console.error(
                chalk.red('❌ Error al reconectar:'),
                error?.message || error
            )
        } finally {
            reconnecting = false
        }
    })
}

// Iniciar bot
async function start() {
    if (typeof config.PREFIX !== 'string' || !config.PREFIX) {
        throw new Error('Define PREFIX como texto en config.js')
    }

    console.log(chalk.cyan('📂 Directorio actual:'), process.cwd())
    console.log(chalk.cyan('📂 Directorio del index:'), BASE_DIR)

    await loadPlugins()

    const sock = await connect()
    await attachSocket(sock)

    console.log(chalk.green('✅ PEPE BOT está listo.'))

    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.greenBright.bold('🐸 RESUMEN FINAL DE PEPE BOT'))
    console.log(chalk.cyan('📂 Plugins: ') + PLUGINS_DIR)
    console.log(chalk.cyan('⚡ Comandos registrados: ') + plugins.size)

    const categorias = new Set()

    for (const entradas of plugins.values()) {
        for (const entrada of entradas) {
            const handler = entrada.handler

            if (handler.menu === false) continue

            const tags = Array.isArray(handler.tags)
                ? handler.tags
                : ['otros']

            for (const tag of tags) {
                categorias.add(String(tag))
            }
        }
    }

    console.log(
        chalk.cyan('📁 Categorías: ') +
        ([...categorias].join(', ') || 'Ninguna')
    )
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
}

start().catch(error => {
    console.error(chalk.red('❌ Error iniciando el bot:'), error)
    process.exitCode = 1
})
