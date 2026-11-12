import os from 'node:os'

const handler = {}

handler.run = async (sock, m) => {
const segundos = Math.floor(process.uptime())

const dias = Math.floor(segundos / 86400)
const horas = Math.floor((segundos % 86400) / 3600)
const minutos = Math.floor((segundos % 3600) / 60)
const secs = segundos % 60

const formato = [
    `${dias} días`,
    `${horas} horas`,
    `${minutos} minutos`,
    `${secs} segundos`
].join(', ')

await m.reply(
    `╭━━〔 🤖 PEPE BOT 〕━━⬣

┃
┃ ⏱️ Tiempo encendido:
┃ ${formato}
┃
┃ 💻 Estado: En línea
┃ 🖥️ Sistema: ${os.platform()}
┃
╰━━━━━━━━━━━━━━━━⬣`
)
}

handler.command = ['uptime', 'up']
handler.help = ['uptime']
handler.tags = ['información']
handler.menu = true

export default handler