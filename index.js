import { connect } from './lib/connection.js'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import chalk from 'chalk'
import pino from 'pino'

// ═══════════════════════════════════
// 🐸 PEPE BOT - CONFIGURACIÓN
// ═══════════════════════════════════

const PREFIXES = ['.', '!', '/', '#']
const PLUGINS_DIR = path.resolve('./plugins')
const logger = pino({ level: 'silent' })

const plugins = new Map()
const processedMessages = new Set()

// ═══════════════════════════════════
// 🎨 CONSOLA
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

    console.log(chalk.cyanBright.bold('       🐸 PEPE BOT'))
    console.log(chalk.yellowBright('   ⚡ MULTI-COMMAND SYSTEM'))
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.greenBright('   📡 Sistema de WhatsApp'))
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
}

// ═══════════════════════════════════
// 📂 CARGAR TODOS LOS PLUGINS
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
                    console.log(
                        chalk.yellow(`⚠ Sin handler: ${file.name}`)
                    )
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
                console.log(
                    chalk.red(`✖ Error en ${file.name}: ${error.message}`)
                )
            }
        }
    }

    await scan(PLUGINS_DIR)

    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(
        chalk.cyanBright(` 🧩 Comandos registrados: ${plugins.size}`)
    )
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
}

// ═══════════════════════════════════
// 🔘 LEER MENSAJES Y BOTONES
// ═══════════════════════════════════

function unwrapMessage(message) {
    let current = message

    // Desenvolver mensajes temporales o de una sola vista
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

    // Mensajes normales
    if (msg.conversation) {
        return msg.conversation
    }

    if (msg.extendedTextMessage?.text) {
        return msg.extendedTextMessage.text
    }

    // Botones clásicos
    if (msg.buttonsResponseMessage?.selectedButtonId) {
        return msg.buttonsResponseMessage.selectedButtonId
    }

    // Botones de plantilla
    if (msg.templateButtonReplyMessage?.selectedId) {
        return msg.templateButtonReplyMessage.selectedId
    }

    // Listas interactivas
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return msg.listResponseMessage.singleSelectReply.selectedRowId
    }

    // Respuestas de botones nativos
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

    const sender =
        message.key.participant ||
        message.key.remoteJid

    return {
        ...message,
        chat,
        sender,
        fromMe: Boolean(message.key.fromMe),
        isGroup: chat.endsWith('@g.us'),
        pushName: message.pushName || 'Usuario',
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
    const prefix = PREFIXES.find(p => input.startsWith(p))

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
// 🖥️ MOSTRAR DATOS EN CONSOLA
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
    console.log(chalk.greenBright.bold(' 🐸 PEPE BOT | COMANDO'))
    console.log(
        chalk.yellow(' 👤 Usuario: ') +
        chalk.white(m.pushName)
    )
    console.log(
        chalk.cyan(' 🆔 Remitente: ') +
        chalk.white(m.sender)
    )
    console.log(
        chalk.magenta(' 👥 Grupo: ') +
        chalk.white(groupName)
    )
    console.log(
        chalk.blueBright(' ⚡ Comando: ') +
        chalk.white(`${parsed.prefix}${parsed.command}`)
    )
    console.log(
        chalk.yellowBright(' 📝 Argumentos: ') +
        chalk.white(parsed.text || 'Ninguno')
    )
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
}

// ═══════════════════════════════════
// ⚙️ EJECUTAR COMANDOS
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
        logger
    }

    // Formato: handler.run(sock, m, args, context)
    if (typeof handler.run === 'function') {
        return await handler.run(
            sock,
            m,
            parsed.args,
            context
        )
    }

    // Formato: export default async function (m, context)
    if (typeof handler === 'function') {
        return await handler(m, context)
    }

    // Formato: export const handler = async (m, context) => {}
    if (typeof module.handler === 'function') {
        return await module.handler(m, context)
    }

    throw new Error('El plugin no exporta una función ejecutable')
}

// ═══════════════════════════════════
// 📩 PROCESAR MENSAJE
// ═══════════════════════════════════

async function processMessage(message, sock) {
    if (!message?.key?.remoteJid) return
    if (!message.message) return
    if (message.key.fromMe) return

    const chat = message.key.remoteJid

    // Ignorar estados
    if (chat === 'status@broadcast') return

    const m = normalizeMessage(message, sock)
    const parsed = parseCommand(m.text)

    // Solo procesar mensajes que sean comandos
    if (!parsed) return

    const matches = plugins.get(parsed.command)

    if (!matches?.length) return

    await logCommand(m, parsed, sock)

    // Ejecutar en el orden de los plugins registrados.
    // No bloquea los mensajes siguientes.
    for (const plugin of matches) {
        try {
            await executePlugin(plugin, m, parsed, sock)
        } catch (error) {
            console.error(
                chalk.redBright(
                    `❌ Error en ${parsed.prefix}${parsed.command}: ${error.message}`
                )
            )

            try {
                await m.reply(
                    `❌ Error al ejecutar ${parsed.prefix}${parsed.command}.`
                )
            } catch {}
        }
    }
}

// ═══════════════════════════════════
// 🚀 INICIAR BOT
// ═══════════════════════════════════

async function start() {
    banner()

    await loadPlugins()

    const sock = await connect()

    // Solo mensajes nuevos notificados por WhatsApp.
    // Cada mensaje se procesa de manera independiente.
    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'notify') return

        for (const message of messages) {
            if (!message?.key?.id) continue
            if (message.key.fromMe) continue

            const chat = message.key.remoteJid

            if (!chat || chat === 'status@broadcast') continue

            // Evitar duplicados dentro de esta ejecución
            const id = `${chat}:${message.key.id}`

            if (processedMessages.has(id)) continue

            processedMessages.add(id)

            if (processedMessages.size > 5000) {
                const oldest = processedMessages.values().next().value
                processedMessages.delete(oldest)
            }

            // No usar await aquí:
            // permite que otros comandos comiencen sin esperar este.
            processMessage(message, sock).catch(error => {
                console.error(
                    chalk.redBright(
                        `❌ Error procesando mensaje: ${error.message}`
                    )
                )
            })
        }
    })

    console.log(
        chalk.greenBright.bold(
            '\n✅ PEPE BOT está escuchando mensajes nuevos.\n'
        )
    )
}

start().catch(error => {
    console.error(
        chalk.redBright('❌ Error iniciando PEPE BOT:'),
        error
    )
    process.exitCode = 1
})