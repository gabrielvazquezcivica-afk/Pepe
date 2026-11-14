
const handler = {}

const API = 'https://api.evogb.org/tools/clima'
const API_KEY = 'evogb-R1Mofv5G'

function obtenerIcono(codigo, descripcion = '') {
    const desc = descripcion.toLowerCase()

    if (codigo === 0) return '☀️'
    if (codigo === 1) return '🌤️'
    if (codigo === 2) return '⛅'
    if (codigo === 3) return '☁️'
    if ([45, 48].includes(codigo)) return '🌫️'
    if ([51, 53, 55, 56, 57].includes(codigo)) return '🌦️'
    if ([61, 63, 65, 66, 67].includes(codigo)) return '🌧️'
    if ([71, 73, 75, 77].includes(codigo)) return '❄️'
    if ([80, 81, 82].includes(codigo)) return '🌧️'
    if ([85, 86].includes(codigo)) return '🌨️'
    if ([95, 96, 99].includes(codigo)) return '⛈️'

    if (desc.includes('lluvia') || desc.includes('llovizna')) return '🌧️'
    if (desc.includes('nublado')) return '☁️'
    if (desc.includes('soleado') || desc.includes('despejado')) return '☀️'
    if (desc.includes('tormenta')) return '⛈️'

    return '🌤️'
}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const ciudad = args.join(' ').trim()

    if (!ciudad) {
        return m.reply(
            '`🌤️ PEPE BOT CLIMA`\n\n' +
            '> Escribe el nombre de una ciudad.\n\n' +
            '`EJEMPLOS:`\n' +
            '> .clima Guadalajara\n' +
            '> .clima Ciudad de México\n' +
            '> .clima Buenos Aires'
        )
    }

    await sock.sendMessage(chat, {
        react: {
            text: '🌤️',
            key: m.key
        }
    }).catch(() => {})

    try {
        const params = new URLSearchParams({
            key: API_KEY,
            city: ciudad,
            version: 'auto'
        })

        const response = await fetch(`${API}?${params}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            signal: AbortSignal.timeout(60000)
        })

        const data = await response.json()

        console.log('[PEPE CLIMA] Respuesta API:', data)

        if (!response.ok || data.status !== true || !data.result) {
            throw new Error(data.error || 'No se encontró la ciudad.')
        }

        const result = data.result
        const current = result.current || {}
        const summary = result.summary || {}
        const daily = result.daily || {}

        const descripcion =
            current.weather_desc ||
            summary.weather ||
            'Información no disponible'

        const icono = obtenerIcono(
            current.weathercode,
            descripcion
        )

        const temperatura =
            current.temperature !== undefined
                ? `${current.temperature}°C`
                : summary.temperature || 'No disponible'

        const viento =
            current.windspeed !== undefined
                ? `${current.windspeed} km/h`
                : summary.wind_speed || 'No disponible'

        const minima =
            daily.temperature_2m_min?.[0] !== undefined
                ? `${daily.temperature_2m_min[0]}°C`
                : summary.min_temp_today || 'No disponible'

        const maxima =
            daily.temperature_2m_max?.[0] !== undefined
                ? `${daily.temperature_2m_max[0]}°C`
                : summary.max_temp_today || 'No disponible'

        const uv =
            daily.uv_index_max?.[0] !== undefined
                ? daily.uv_index_max[0]
                : summary.uv_index_max ?? 'No disponible'

        const mensaje =
            '`🌤️ PEPE BOT CLIMA`\n\n' +
            `📍 *Ubicación:* ${result.location || ciudad}\n\n` +
            `${icono} *Clima actual:* ${descripcion}\n` +
            `🌡️ *Temperatura:* ${temperatura}\n` +
            `💨 *Viento:* ${viento}\n\n` +
            '`📊 TEMPERATURA DE HOY` \n' +
            `🥶 *Mínima:* ${minima}\n` +
            `🔥 *Máxima:* ${maxima}\n` +
            `☀️ *Índice UV:* ${uv}\n\n` +
            `> Powered By 𝒫ℯ𝓅ℯ ℬℴ𝓉 🐸`

        await sock.sendMessage(chat, {
            text: mensaje
        }, {
            quoted: m
        })

    } catch (error) {
        console.error('[PEPE CLIMA] Error:', error)

        await m.reply(
            '`🌤️ PEPE BOT CLIMA`\n\n' +
            '> ❌ No se pudo consultar el clima.\n\n' +
            '> Comprueba el nombre de la ciudad e intenta nuevamente.'
        )
    }
}

handler.command = ['clima', 'weather', 'tiempo']
handler.help = ['clima <ciudad>']
handler.tags = ['buscador']
handler.menu = true

export default handler
