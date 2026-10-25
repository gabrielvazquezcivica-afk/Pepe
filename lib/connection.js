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

// 📲 CONSOLA
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = (text) =>
    new Promise(resolve => rl.question(text, resolve))

const logger = pino({ level: 'silent' })

export async function connect() {

    console.clear()

    // 🐸 LOGO PEPE BOT
    console.log(
        chalk.greenBright.bold(`
██████╗ ███████╗██████╗ ███████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝
██████╔╝█████╗  ██████╔╝█████╗
██╔═══╝ ██╔══╝  ██╔═══╝ ██╔══╝
██║     ███████╗██║     ███████╗
╚═╝     ╚══════╝╚═╝     ╚══════╝
        `)
    )

    console.log(
        chalk.cyanBright.bold('       🐸 PEPE BOT 🐸')
    )

    console.log(
        chalk.yellowBright('  ⚡ SISTEMA DE CONEXIÓN ⚡')
    )

    console.log(
        chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    )

    console.log(
        chalk.greenBright('  📡 WhatsApp Multi-Device')
    )

    console.log(
        chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    )

    const sessionExists = fs.existsSync('./session')

    const { state, saveCreds } =
        await useMultiFileAuthState('./session')

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                logger
            )
        },
        printQRInTerminal: false
    })

    // 🔐 MÉTODO DE INICIO DE SESIÓN
    if (!sessionExists) {

        console.log(
            chalk.magentaBright.bold('  🔐 INICIAR SESIÓN\n')
        )

        console.log(
            chalk.cyan('  [1]') +
            chalk.white(' Código de vinculación')
        )

        console.log(
            chalk.cyan('  [2]') +
            chalk.white(' Código QR\n')
        )

        const option = (
            await question(
                chalk.yellowBright('  Selecciona (1 o 2): ')
            )
        ).trim()

        // 🔑 CÓDIGO DE VINCULACIÓN
        if (option === '1') {

            const number = (
                await question(
                    chalk.cyan(
                        '\n  📱 Número con código de país: '
                    )
                )
            ).replace(/\D/g, '')

            if (!/^\d{10,15}$/.test(number)) {
                console.log(
                    chalk.redBright(
                        '\n  ❌ Número no válido.\n'
                    )
                )

                rl.close()
                return sock
            }

            try {
                const code = await sock.requestPairingCode(number)

                console.log(
                    chalk.gray('\n  ━━━━━━━━━━━━━━━━━━━━━━━')
                )

                console.log(
                    chalk.greenBright.bold(
                        `  🔑 CÓDIGO: ${code}\n`
                    )
                )

                console.log(
                    chalk.yellow(
                        '  Ingresa el código en WhatsApp.'
                    )
                )

                console.log(
                    chalk.gray('  ━━━━━━━━━━━━━━━━━━━━━━━\n')
                )

            } catch (err) {
                console.log(
                    chalk.redBright(
                        '  ❌ Error generando el código:'
                    ),
                    err.message
                )
            }
        }

        // 📲 CÓDIGO QR
        else if (option === '2') {

            sock.ev.on(
                'connection.update',
                ({ qr }) => {
                    if (qr) {
                        console.log(
                            chalk.greenBright(
                                '\n  📲 ESCANEA EL QR CON WHATSAPP\n'
                            )
                        )

                        qrcode.generate(qr, { small: true })
                    }
                }
            )

        } else {
            console.log(
                chalk.redBright(
                    '\n  ❌ Opción no válida. Reinicia PEPE BOT.\n'
                )
            )

            rl.close()
            return sock
        }

    } else {

        console.log(
            chalk.greenBright(
                '  🔐 Sesión detectada.'
            )
        )

        console.log(
            chalk.yellow(
                '  ⚡ Conectando automáticamente...\n'
            )
        )
    }

    // 📡 ESTADO DE CONEXIÓN
    sock.ev.on(
        'connection.update',
        ({ connection, lastDisconnect }) => {

            if (connection === 'connecting') {
                console.log(
                    chalk.yellowBright(
                        '  ⏳ Conectando a WhatsApp...\n'
                    )
                )
            }

            if (connection === 'open') {

                console.log(
                    chalk.gray(
                        '\n  ━━━━━━━━━━━━━━━━━━━━━━━'
                    )
                )

                console.log(
                    chalk.greenBright.bold(
                        '  ✅ PEPE BOT CONECTADO'
                    )
                )

                console.log(
                    chalk.cyan(
                        '  🐸 Todo listo para trabajar.'
                    )
                )

                console.log(
                    chalk.gray(
                        '  ━━━━━━━━━━━━━━━━━━━━━━━\n'
                    )
                )

                if (!rl.closed) rl.close()
            }

            if (connection === 'close') {

                const reason =
                    lastDisconnect?.error?.output?.statusCode

                console.log(
                    chalk.redBright(
                        `\n  ❌ Conexión cerrada (${reason ?? 'desconocido'})`
                    )
                )

                if (reason === DisconnectReason.loggedOut) {
                    console.log(
                        chalk.yellow(
                            '  ⚠️ La sesión fue cerrada. Elimina la sesión anterior y vuelve a vincular.'
                        )
                    )
                } else {
                    console.log(
                        chalk.yellow(
                            '  ⚠️ Revisa tu conexión e inicia nuevamente si es necesario.'
                        )
                    )
                }
            }
        }
    )

    // 💾 GUARDAR CREDENCIALES
    sock.ev.on('creds.update', saveCreds)

    return sock
      }
