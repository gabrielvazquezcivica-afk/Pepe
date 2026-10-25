
import { connect } from './lib/connection.js'
import config from './config.js'
import { DisconnectReason } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import chalk from 'chalk'
import pino from 'pino'

const PLUGINS_DIR = path.resolve('./plugins')
const logger = pino({ level: 'silent' })

const plugins = new Map()
const processedMessages = new Set()

let activeSock = null
let reconnecting = false

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

// ═══════════════════════════════════
// 🎨 BANNER
// ═══════════════════════════════════

function banner() {
    console.clear()

    console.log(chalk.greenBright.bold(`
██████╗ ███████╗██████╗ ███████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝
██████╔╝█████╗  ██████╔╝█████╗
██╔═══╝ ██╔══╝  ██╔═══╝ ██╔══╝
██║     ███████╗██║     ███████╗
╚═╝     ╚══════╝╚═╝     ╚══════╝
`))

    console.log(chalk.cyanBright.bold(`🐸 ${config.botName}`))
    console.log(chalk.yellowBright(`👑 Owner: ${config.ownerName}`))
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.greenBright('📡 Sistema de WhatsApp'))
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
}

// ═══════════════════════════════════
// 📂 CARGAR PLUGINS
// ═══════════════════════════════════

async function loadPlugins() {
    plugins.clear()

    if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true })
    }

    async function scan(directory) {
        const files = fs.readdirSync(directory, {
            withFileTypes: true
        })

        for (const file of files) {
            const fullPath = path.join(directory, file.name)

            if (file.isDirectory()) {
                await scan(fullPath)
                continue
            }

            if (
                !file.isFile() ||
                !/\.(js|mjs)$/.test(file.name) ||
                file.name.endsWith('.disabled.js')
            ) continue

            try {
                const url = pathToFileURL(fullPath).href
                const mod = await import(url)

                const handler =
                    mod.default ||
                    mod.Handler ||
                    mod.handler

                if (!handler) {
                    console.log(chalk.yellow(
                        `⚠ Sin handler: ${file.name}`
                    ))
                    continue
                }

                const commands =
                    handler.command ??
                    handler.help ??
                    mod.command ??
                    mod.help ??
                    []

                const list = Array.isArray(commands)
                    ? commands
                    : [commands]

                let registered = 0

                for (const command of list) {
                    if (typeof command !== 'string') continue

                    const key = command.toLowerCase()

                    if (!plugins.has(key)) {
                        plugins.set(key, [])
                    }

                    plugins.get(key).push({
                        handler,
                        module: mod,
                        file: fullPath
                    })

                    registered++
                }

                console.log(
                    chalk.green(' ✔ ') +
                    chalk.white(path.relative(PLUGINS_DIR, fullPath)) +
                    chalk.gray(` (${registered} comandos)`)
                )
            } catch (error) {
                console.log(chalk.red(
                    `✖ Error en ${file.name}: ${error.message}`
                ))
            }
        }
    }

    await scan(PLUGINS_DIR)

    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.cyanBright(
        `🧩 Comandos registrados: ${plugins.size}`
    ))
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
}

// ═══════════════════════════════════
// 🔘 LEER MENSAJES Y BOTONES
// ═══════════════════════════════════

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

function getMessageText(message) {
    const msg = unwrapMessage(message.message)

    if (msg.conversation) return msg.conversation

    if (msg.extendedTextMessage?.text) {
        return msg.extendedTextMessage.text
    }

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

// ═══════════════════════════════════
// 📨 NORMALIZAR MENSAJE
// ═══════════════════════════════════

function normalizeMessage(message, sock) {
    const chat = message.key.remoteJid
    const sender = message.key.participant || chat
    const senderNumber = sender.split('@')[0].split(':')[0]
    const ownerNumber = String(config.ownerNumber)
        .replace(/\D/g, '')

    return {
        ...message,
        chat,
        sender,
        senderNumber,
        fromMe: Boolean(message.key.fromMe),
        isGroup: chat.endsWith('@g.us'),
        isOwner: senderNumber === ownerNumber,
        pushName: message.pushName || 'Usuario',
        botName: config.botName,
        ownerName: config.ownerName,
        text: getMessageText(message),

        reply: (text, options = {}) =>
            sock.sendMessage(
                chat,
                { text: String(text), ...options },
                { quoted: message }
            )
    }
}

// ═══════════════════════════════════
// ⚡ DETECTAR COMANDOS
// ═══════════════════════════════════

function parseCommand(text) {
    if (!text || typeof text !== 'string') return null

    const input = text.trim()
    const prefix = config.prefixes.find(p =>
        input.startsWith(p)
    )

    if (!prefix) return null

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

// ═══════════════════════════════════
// 🖥️ REGISTRO EN CONSOLA
// ═══════════════════════════════════

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
    console.log(chalk.greenBright.bold(`🐸 ${config.botName} | COMANDO`))
    console.log(chalk.yellow('👤 Usuario: ') + chalk.white(m.pushName))
    console.log(chalk.cyan('🆔 Remitente: ') + chalk.white(m.sender))
    console.log(chalk.magenta('👥 Grupo: ') + chalk.white(groupName))
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

// ═══════════════════════════════════
// ⚙️ EJECUTAR PLUGINS
// ═══════════════════════════════════

async function executePlugin(plugin, m, parsed, sock) {
    const { handler, module } = plugin

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
        logger
    }

    if (typeof handler.run === 'function') {
        return handler.run(sock, m, parsed.args, context)
    }

    if (typeof handler === 'function') {
        return handler(m, context)
    }

    if (typeof module.handler === 'function') {
        return module.handler(m, context)
    }

    throw new Error('El plugin no exporta una función ejecutable')
}

// ═══════════════════════════════════
// 📩 PROCESAR MENSAJES
// ═══════════════════════════════════

async function processMessage(message, sock) {
    if (!message?.key?.remoteJid || !message.message) return
    if (message.key.fromMe) return

    const chat = message.key.remoteJid
    if (chat === 'status@broadcast') return

    const m = normalizeMessage(message, sock)
    const parsed = parseCommand(m.text)

    if (!parsed) return

    const matches = plugins.get(parsed.command)
    if (!matches?.length) return

    await logCommand(m, parsed, sock)

    // Los comandos de mensajes distintos pueden ejecutarse simultáneamente.
    for (const plugin of matches) {
        try {
            await executePlugin(plugin, m, parsed, sock)
        } catch (error) {
            console.error(chalk.redBright(
                `❌ Error en ${parsed.prefix}${parsed.command}: ${error.message}`
            ))

            try {
                await m.reply(
                    `❌ Error al ejecutar ${parsed.prefix}${parsed.command}.`
                )
            } catch {}
        }
    }
}

// ═══════════════════════════════════
// 🔌 SOCKET Y RECONEXIÓN
// ═══════════════════════════════════

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
                console.error(chalk.red(
                    `❌ Error procesando mensaje: ${error.message}`
                ))
            })
        }
    })

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (sock !== activeSock || connection !== 'close') return
        if (reconnecting) return

        const reason = lastDisconnect?.error?.output?.statusCode

        console.log(chalk.yellow(
            `⚠️ Conexión cerrada. Código: ${reason ?? 'desconocido'}`
        ))

        if (
            reason === 401 ||
            reason === DisconnectReason.loggedOut
        ) {
            console.log(chalk.red(
                '❌ Sesión rechazada. Revisa la vinculación antes de volver a intentarlo.'
            ))
            return
        }

        reconnecting = true

        try {
            await sleep(reason === 515 ? 1500 : 3000)

            if (sock !== activeSock) return

            console.log(chalk.cyan('🔄 Intentando reconectar...'))

            const newSock = await connect()
            await attachSocket(newSock)

            console.log(chalk.green('✅ Socket nuevo registrado.'))
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

// ═══════════════════════════════════
// 🚀 INICIO
// ═══════════════════════════════════

async function start() {
    banner()
    await loadPlugins()

    const sock = await connect()
    await attachSocket(sock)

    console.log(chalk.greenBright.bold(
        `\n✅ ${config.botName} está escuchando mensajes nuevos.\n`
    ))
}

start().catch(error => {
    console.error(chalk.redBright('❌ Error iniciando el bot:'), error)
    process.exitCode = 1
})
