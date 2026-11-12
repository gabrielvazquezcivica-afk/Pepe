
import fs from 'node:fs'
import path from 'node:path'

function tieneDatos(contenido) {
    try {
        const datos = JSON.parse(contenido)

        if (datos === null) return false
        if (Array.isArray(datos)) return datos.length > 0
        if (typeof datos === 'object') {
            return Object.keys(datos).length > 0
        }

        return true
    } catch {
        return false
    }
}

function buscarJSON(directorio, base, encontrados = []) {
    if (!fs.existsSync(directorio)) return encontrados

    for (const entrada of fs.readdirSync(directorio, {
        withFileTypes: true
    })) {
        const ruta = path.join(directorio, entrada.name)

        if (entrada.isDirectory()) {
            buscarJSON(ruta, base, encontrados)
        } else if (entrada.isFile() && entrada.name.endsWith('.json')) {
            encontrados.push(path.relative(base, ruta))
        }
    }

    return encontrados
}

function escribirSeguro(ruta, contenido) {
    fs.mkdirSync(path.dirname(ruta), { recursive: true })

    const temporal = `${ruta}.tmp`
    fs.writeFileSync(temporal, contenido)
    fs.renameSync(temporal, ruta)
}

export function iniciarProtectorDB(BASE_DIR) {
    const RESPALDO = path.join(BASE_DIR, 'database_backup')
    const carpetas = ['database', 'data']

    function proteger() {
        const archivos = new Set()

        for (const carpeta of carpetas) {
            const origen = path.join(BASE_DIR, carpeta)

            for (const archivo of buscarJSON(origen, BASE_DIR)) {
                archivos.add(archivo)
            }
        }

        // También detecta archivos originales que hayan desaparecido.
        for (const carpeta of carpetas) {
            const respaldo = path.join(RESPALDO, carpeta)

            for (const archivo of buscarJSON(respaldo, RESPALDO)) {
                archivos.add(archivo)
            }
        }

        for (const archivo of archivos) {
            const original = path.join(BASE_DIR, archivo)
            const copia = path.join(RESPALDO, archivo)

            try {
                const existe = fs.existsSync(original)
                const contenido = existe
                    ? fs.readFileSync(original, 'utf8')
                    : ''

                if (existe && tieneDatos(contenido)) {
                    // Nunca reemplaza un respaldo válido con uno vacío.
                    escribirSeguro(copia, contenido)
                    continue
                }

                if (fs.existsSync(copia)) {
                    const respaldo = fs.readFileSync(copia, 'utf8')

                    if (tieneDatos(respaldo)) {
                        escribirSeguro(original, respaldo)
                        console.log(`[DB PROTECTOR] Recuperado: ${archivo}`)
                    }
                }
            } catch (error) {
                console.error(
                    `[DB PROTECTOR] Error en ${archivo}:`,
                    error.message
                )
            }
        }
    }

    fs.mkdirSync(RESPALDO, { recursive: true })

    // Recuperación antes de que arranquen los plugins.
    proteger()

    // Respaldo automático periódico.
    const intervalo = setInterval(proteger, 5000)
    intervalo.unref?.()

    console.log('🛡️ Protección de bases de datos activada')
}
