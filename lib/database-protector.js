
import fs from 'node:fs'
import path from 'node:path'

function tieneDatos(contenido) {
    try {
        const valor = JSON.parse(contenido)
        return valorTieneDatos(valor)
    } catch {
        return false
    }
}

function valorTieneDatos(valor) {
    if (valor === null || valor === undefined) return false

    if (typeof valor === 'string') {
        return valor.trim().length > 0
    }

    if (typeof valor === 'number' || typeof valor === 'boolean') {
        return true
    }

    if (Array.isArray(valor)) {
        return valor.length > 0 && valor.some(valorTieneDatos)
    }

    if (typeof valor === 'object') {
        return Object.values(valor).some(valorTieneDatos)
    }

    return false
}

function buscarJSON(directorio, base, encontrados = []) {
    if (!fs.existsSync(directorio)) return encontrados

    for (const entrada of fs.readdirSync(directorio, {
        withFileTypes: true
    })) {
        const ruta = path.join(directorio, entrada.name)

        if (entrada.isDirectory()) {
            buscarJSON(ruta, base, encontrados)
        } else if (
            entrada.isFile() &&
            entrada.name.endsWith('.json')
        ) {
            encontrados.push(path.relative(base, ruta))
        }
    }

    return encontrados
}

function escribirSeguro(ruta, contenido) {
    fs.mkdirSync(path.dirname(ruta), {
        recursive: true
    })

    const temporal = `${ruta}.${process.pid}.${Date.now()}.tmp`

    try {
        fs.writeFileSync(temporal, contenido, 'utf8')
        fs.renameSync(temporal, ruta)
    } catch (error) {
        try {
            if (fs.existsSync(temporal)) fs.unlinkSync(temporal)
        } catch {}

        throw error
    }
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
                const existeOriginal = fs.existsSync(original)

                const contenidoOriginal = existeOriginal
                    ? fs.readFileSync(original, 'utf8')
                    : ''

                let originalValido = false

                if (existeOriginal) {
                    try {
                        const valorOriginal = JSON.parse(contenidoOriginal)
                        const nombre = path.basename(archivo).toLowerCase()

                        // Estos archivos aceptan {} como estado válido.
                        if (
                            nombre === 'modoadmin.json' ||
                            nombre === 'muteados.json'
                        ) {
                            originalValido =
                                valorOriginal !== null &&
                                typeof valorOriginal === 'object' &&
                                !Array.isArray(valorOriginal)
                        } else {
                            originalValido = tieneDatos(contenidoOriginal)
                        }
                    } catch {
                        originalValido = false
                    }
                }

                const existeRespaldo = fs.existsSync(copia)

                const contenidoRespaldo = existeRespaldo
                    ? fs.readFileSync(copia, 'utf8')
                    : ''

                const respaldoValido = existeRespaldo &&
                    tieneDatos(contenidoRespaldo)

                if (originalValido) {
                    escribirSeguro(copia, contenidoOriginal)
                    continue
                }

                if (respaldoValido) {
                    escribirSeguro(original, contenidoRespaldo)

                    console.log(
                        `[DB PROTECTOR] Recuperado: ${archivo}`
                    )
                }

            } catch (error) {
                console.error(
                    `[DB PROTECTOR] Error en ${archivo}:`,
                    error.message
                )
            }
        }
    }

    fs.mkdirSync(RESPALDO, {
        recursive: true
    })

    proteger()

    const intervalo = setInterval(proteger, 5000)
    intervalo.unref?.()

    console.log('🛡️ Protección de bases de datos activada')
}
