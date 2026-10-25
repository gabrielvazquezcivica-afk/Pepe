
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'

import pino from 'pino'
import chalk from 'chalk'
import readline from 'readline'
import fs from 'fs'
import qrcode from 'qrcode-terminal'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = (text) =>
    new Promise(resolve => rl.question(text, resolve))

const delay = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

export async function connect() {
    console.clear()

    console.log(chalk.greenBright.bold(`
██████╗ ███████╗██████╗ ███████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝
██████╔╝█████╗  ██████╔╝█████╗
██╔═══╝ ██╔══╝  ██╔═══╝ ██╔══╝
██║     ███████╗██║     ███████╗
╚═╝     ╚══════╝╚═╝     ╚══════╝
`))

    console.log(chalk.cyanBright('🐸 PEPE BOT — CONEXIÓN\n'))

    const { state, saveCreds } =
        await useMultiFileAuthState('./session')

    let option = ''
    let number = ''

    // Comprueba si la sesión ya está registrada
    if (!state.creds.registered) {
        console.log(chalk.yellow('1. Código de vinculación'))
        console.log(chalk.yellow('2. Código QR\n'))

        option = (await question('Selecciona (1 o 2): ')).trim()

        if (option === '1') {
            number = (await question(
                '\nIngresa tu número con código de país, sin + ni espacios: '
            )).replace(/\D/g, '')

            if (!/^\d{8,15}$/.test(number)) {
                console.log(chalk.red('\nNúmero inválido.'))
                rl.close()
                throw new Error('Número de teléfono inválido')
            }
        } else if (option !== '2') {
            rl.close()
            throw new Error('Opción inválida')
        }
    }

    let version

    try {
        const latest = await fetchLatestBaileysVersion()
        version = latest.version
    } catch (err) {
        console.log(chalk.red('No se pudo consultar la versión de WhatsApp.'))
        rl.close()
        throw err
    }

    const logger = pino({ level: 'silent' })

    const sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: false,
        browser: ['PEPE BOT', 'Chrome', '1.0.0']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr && (!state.creds.registered) && option === '2') {
            console.log(chalk.green('\nEscanea este QR desde WhatsApp:\n'))
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
            console.log(chalk.greenBright('\n✅ PEPE BOT CONECTADO\n'))
            if (rl) rl.close()
        }

        if (connection === 'close') {
            const reason =
                lastDisconnect?.error?.output?.statusCode

            console.log(chalk.red(
                `\n❌ Conexión cerrada. Código: ${reason ?? 'desconocido'}`
            ))

            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.yellow(
                    'La sesión se cerró. Tendrás que vincular WhatsApp de nuevo.'
                ))
            }
        }
    })

    // Solicita el código después de crear el socket
    if (!state.creds.registered && option === '1') {
        try {
            await delay(2000)

            const code = await sock.requestPairingCode(number)

            console.log(chalk.greenBright(
                `\n🔑 Código de vinculación: ${code}\n`
            ))
            console.log(chalk.cyan(
                'En WhatsApp: Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono.'
            ))
        } catch (err) {
            console.log(chalk.red('\n❌ No se pudo generar el código.'))
            console.log(chalk.yellow(
                err?.message || String(err)
            ))
            rl.close()
            throw err
        }
    } else if (state.creds.registered) {
        console.log(chalk.green('🔐 Sesión existente; intentando conectar...'))
    }

    return sock
}
