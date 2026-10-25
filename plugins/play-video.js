
const handler = {
    command: ['playvideo'],

    run: async (sock, m) => {
        await m.reply(
            '🎬 Seleccionaste *Video*.\n\n✅ ¡El botón funciona correctamente!'
        )
    }
}

export default handler
