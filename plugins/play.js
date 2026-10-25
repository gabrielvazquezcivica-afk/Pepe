
const handler = {
    command: ['play'],
    help: ['play'],

    run: async (sock, m) => {
        const text = `╭━━〔 🎵 TIBU BOT 〕━━⬣
┃
┃ 🎧 *REPRODUCIR / DESCARGAR*
┃
┃ Elige el formato que deseas:
┃
╰━━━━━━━━━━━━━━━━━━⬣`

        await sock.sendMessage(m.chat, {
            text,
            footer: 'Selecciona una opción para continuar',
            buttons: [
                {
                    buttonId: '.playaudio',
                    buttonText: { displayText: '🎵 Audio' },
                    type: 1
                },
                {
                    buttonId: '.playvideo',
                    buttonText: { displayText: '🎬 Video' },
                    type: 1
                }
            ],
            headerType: 1
        }, {
            quoted: m
        })
    }
}

export default handler
