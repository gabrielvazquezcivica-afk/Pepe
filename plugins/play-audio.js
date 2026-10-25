
const handler = {
    command: ['playaudio'],

    run: async (sock, m) => {
        await m.reply(
            '🎵 Seleccionaste *Audio*.\n\n✅ ¡El botón funciona correctamente!'
        )
    }
}

export default handler
