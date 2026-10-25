
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'

import pino from 'pino'
import chalk from 'chalk'
import readline from 'readline'
import qrcode from 'qrcode-terminal'

const question = (rl, text) =>
    new Promise(resolve => rl.question(text, resolve))

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

export async function connect() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    const logger = pino({ level: 'silent' })

    console.clear()
    console.log(chalk.greenBright.bold(`
██████╗ ███████╗██████╗ ███████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝
██████╔╝█████╗  ██████╔╝█████╗
██╔═══╝ ██╔══╝  ██╔═══╝ ██╔══╝
██║     ███████╗██║     ███████╗
╚═╝     ╚══════╝╚═╝     ╚══════╝
`))
    console.log(chalk.cyanBright('\n🐸 CONEXIÓN PEPE BOT\n'))

    const { state, saveCreds } =
        await useMultiFileAuthState('./session')

    let option = ''

    // Solo pedir vinculación si aún no hay credenciales registradas.
    if (!state.creds.registered) {
        console.log(chalk.magenta('\n¿CÓMO QUIERES VINCULAR WHATSAPP?\n'))
        console.log('1. Código de vinculación')
        console.log('2. Código QR\n')

        option = (await question(rl, 'Selecciona (1 o 2): ')).trim()

        if (option !== '1' && option !== '2') {
            rl.close()
            throw new Error('Opción inválida')
        }
    }

    let number = ''

    if (!state.creds.registered && option === '1') {
        number = (await question(
            rl,
            '\n📱 Número con código de país, sin + ni espacios: '
        )).replace(/\D/g, '')

        if (!/^\d{8,15}$/.test(number)) {
            rl.close()
            throw new Error('El número ingresado no es válido')
        }
    }

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: false
    })

    // Guardar credenciales antes y durante la vinculación.
    sock.ev.on('creds.update', saveCreds)

    if (!state.creds.registered && option === '2') {
        sock.ev.on('connection.update', ({ qr }) => {
            if (qr) {
                console.log(chalk.green('\n📲 Escanea el QR desde WhatsApp:\n'))
                qrcode.generate(qr, { small: true })
            }
        })
    }

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            console.log(chalk.greenBright('\n✅ PEPE BOT CONECTADO\n'))
            rl.close()
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode

            console.log(chalk.red(
                `\n❌ Conexión cerrada. Código: ${reason ?? 'desconocido'}`
            ))

            if (reason === 515) {
                console.log(chalk.yellow(
                    'WhatsApp solicita reiniciar la conexión. El socket debe crearse de nuevo.'
                ))
            } else if (reason === DisconnectReason.loggedOut ||
                       reason === 401) {
                console.log(chalk.red(
                    'Sesión rechazada. Revisa el estado de la vinculación antes de volver a intentarlo.'
                ))
            }
        }
    })

    if (!state.creds.registered && option === '1') {
        try {
            // Dar tiempo al socket para iniciar.
            await sleep(3000)

            const code = await sock.requestPairingCode(number)

            console.log(chalk.greenBright(
                `\n🔑 Código de vinculación: ${code}\n`
            ))
            console.log(chalk.cyan(
                'WhatsApp → Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono.'
            ))
        } catch (error) {
            console.error(
                chalk.red('❌ No se pudo generar el código:'),
                error?.message || error
            )
            rl.close()
            throw error
        }
    } else if (state.creds.registered) {
        console.log(chalk.green('\n🔐 Sesión guardada; intentando conectar...\n'))
        rl.close()
    }

    return sock
}
