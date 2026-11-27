
const handler = {}

const partidas = new Map()

const palabras = [
    // Animales
    ['MURCIELAGO', 'Animal que duerme de cabeza'],
    ['ELEFANTE', 'Animal con una trompa larga'],
    ['COCODRILO', 'Reptil que vive cerca del agua'],
    ['MARIPOSA', 'Insecto con alas coloridas'],
    ['PINGUINO', 'Ave que no puede volar'],
    ['JIRAFA', 'Animal con el cuello muy largo'],
    ['CANGURO', 'Animal que lleva a su cría en una bolsa'],
    ['TIBURON', 'Depredador del océano'],
    ['DELFIN', 'Mamífero marino muy inteligente'],
    ['HIPOPOTAMO', 'Animal enorme que vive en el agua'],
    ['RINOCERONTE', 'Animal con uno o dos cuernos'],
    ['ARDILLA', 'Animal que guarda nueces'],
    ['TORTUGA', 'Animal que lleva un caparazón'],
    ['PULPO', 'Animal marino con ocho brazos'],
    ['FLAMENCO', 'Ave de color rosado'],
    ['LEOPARDO', 'Felino con manchas'],
    ['CAMELLO', 'Animal que puede vivir en el desierto'],
    ['GALLINA', 'Ave que pone huevos'],
    ['MAPACHE', 'Animal que parece llevar un antifaz'],
    ['SALAMANDRA', 'Anfibio parecido a un lagarto'],

    // Comida
    ['CHOCOLATE', 'Dulce hecho con cacao'],
    ['HAMBURGUESA', 'Comida con pan y carne'],
    ['ESPAGUETI', 'Pasta larga y delgada'],
    ['GUACAMOLE', 'Preparación hecha con aguacate'],
    ['ENCHILADAS', 'Platillo mexicano con tortillas y salsa'],
    ['TACOS', 'Comida mexicana muy popular'],
    ['PIZZA', 'Comida italiana redonda'],
    ['SANDIA', 'Fruta verde por fuera y roja por dentro'],
    ['FRESA', 'Fruta roja con pequeñas semillas'],
    ['PALOMITAS', 'Botana típica del cine'],
    ['HOTCAKES', 'Desayuno redondo y esponjoso'],
    ['GELATINA', 'Postre tembloroso'],
    ['AGUACATE', 'Fruta verde usada en el guacamole'],
    ['CROQUETAS', 'Comida pequeña para mascotas'],
    ['CHILAQUILES', 'Platillo mexicano con totopos y salsa'],

    // Objetos
    ['TELEFONO', 'Dispositivo para comunicarse'],
    ['COMPUTADORA', 'Máquina para trabajar y jugar'],
    ['AUDIFONOS', 'Se utilizan para escuchar música'],
    ['TECLADO', 'Tiene letras y números'],
    ['MOCHILA', 'Sirve para llevar útiles escolares'],
    ['REFRIGERADOR', 'Mantiene fríos los alimentos'],
    ['PARAGUAS', 'Te protege de la lluvia'],
    ['LINTERNA', 'Sirve para iluminar lugares oscuros'],
    ['ESPEJO', 'Puedes ver tu reflejo'],
    ['CANDADO', 'Sirve para cerrar algo con llave'],
    ['RELOJ', 'Indica la hora'],
    ['VENTILADOR', 'Mueve el aire'],
    ['MICROFONO', 'Sirve para amplificar la voz'],
    ['TELESCOPIO', 'Sirve para observar el espacio'],
    ['IMPRESORA', 'Pasa documentos a papel'],

    // Lugares
    ['BIBLIOTECA', 'Lugar lleno de libros'],
    ['AEROPUERTO', 'Lugar donde salen los aviones'],
    ['RESTAURANTE', 'Lugar donde puedes comer'],
    ['HOSPITAL', 'Lugar donde atienden a los enfermos'],
    ['ESCUELA', 'Lugar donde se aprende'],
    ['MUSEO', 'Lugar donde se exhiben objetos históricos'],
    ['ACUARIO', 'Lugar donde puedes ver animales marinos'],
    ['DESIERTO', 'Lugar con muy poca lluvia'],
    ['MONTAÑA', 'Elevación natural del terreno'],
    ['VOLCAN', 'Montaña que puede expulsar lava'],
    ['PLANETARIO', 'Lugar para aprender sobre el universo'],
    ['ESTADIO', 'Lugar donde se realizan eventos deportivos'],

    // Tecnología
    ['INTERNET', 'Red mundial de información'],
    ['WHATSAPP', 'Aplicación de mensajería'],
    ['BLUETOOTH', 'Tecnología de conexión inalámbrica'],
    ['YOUTUBE', 'Plataforma para ver videos'],
    ['INSTAGRAM', 'Red social de fotografías y videos'],
    ['CONTRASENA', 'Clave para entrar a una cuenta'],
    ['VIDEOJUEGO', 'Entretenimiento electrónico'],
    ['PROGRAMADOR', 'Persona que escribe código'],
    ['ALGORITMO', 'Conjunto de instrucciones para resolver algo'],
    ['ROBOTICA', 'Área relacionada con los robots'],

    // Naturaleza
    ['ARCOIRIS', 'Aparece en el cielo después de la lluvia'],
    ['RELAMPAGO', 'Destello durante una tormenta'],
    ['CASCADA', 'Caída natural de agua'],
    ['BOSQUE', 'Lugar lleno de árboles'],
    ['ESTRELLA', 'Brilla en el cielo nocturno'],
    ['PLANETA', 'Cuerpo celeste que gira alrededor de una estrella'],
    ['UNIVERSO', 'Todo lo que existe'],
    ['TORNADO', 'Columna de aire que gira rápidamente'],
    ['GLACIAR', 'Gran masa de hielo'],
    ['ATARDECER', 'Momento en que se oculta el sol'],

    // Otros
    ['DINOSAURIO', 'Animal prehistórico'],
    ['GUITARRA', 'Instrumento musical de cuerdas'],
    ['MARATON', 'Carrera de larga distancia'],
    ['ASTRONAUTA', 'Persona que viaja al espacio'],
    ['CUMPLEANOS', 'Se celebra una vez al año'],
    ['ESMERALDA', 'Piedra preciosa de color verde'],
    ['LABERINTO', 'Camino lleno de vueltas y salidas'],
    ['ROMPECABEZAS', 'Juego que consiste en unir piezas'],
    ['BIBLIOGRAFIA', 'Lista de fuentes consultadas'],
    ['HIPNOTIZAR', 'Inducir un estado de concentración'],
    ['ESCALOFRIO', 'Sensación repentina de frío'],
    ['PARALELOGRAMO', 'Figura geométrica de cuatro lados'],
    ['HELICOPTERO', 'Aeronave con hélices'],
    ['TERMOMETRO', 'Instrumento para medir temperatura'],
    ['CALEIDOSCOPIO', 'Instrumento que crea figuras de colores'],
    ['LABORATORIO', 'Lugar donde se realizan experimentos'],
    ['INVISIBLE', 'Algo que no se puede ver'],
    ['AVENTURA', 'Experiencia emocionante'],
    ['TESORO', 'Conjunto de objetos valiosos'],
    ['DRAGON', 'Criatura fantástica que lanza fuego']
]

const dibujos = [
`  +---+
  |   |
      |
      |
      |
      |
=========`,
`  +---+
  |   |
  O   |
      |
      |
      |
=========`,
`  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
`  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`
]

function mostrarPartida(p) {
    const letras = [...p.palabra]
        .map(letra => p.usadas.includes(letra) ? letra : '＿')
        .join(' ')

    return (
        `🎮 *PEPE BOT | AHORCADO*\n\n` +
        `${dibujos[p.errores]}\n\n` +
        `🔤 Palabra: ${letras}\n` +
        `❌ Errores: ${p.errores}/6\n` +
        `📝 Letras usadas: ${p.usadas.join(', ') || 'Ninguna'}\n` +
        `💡 Pista: ${p.pista}\n\n` +
        `> Usa *.letra a* para probar una letra.\n` +
        `> Usa *.resolver palabra* para responder.\n` +
        `> Usa *.abandonar* para terminar.`
    )
}

handler.run = async (sock, m, args = []) => {
    const chat = m.chat || m.key?.remoteJid
    const comando = (m.command || '').toLowerCase()
    const texto = args.join(' ').trim().toUpperCase()

    if (!chat) return

    if (comando === 'ahorcado') {
        if (partidas.has(chat)) {
            return m.reply('> ⚠️ Ya hay una partida en curso en este chat.')
        }

        const elegida = palabras[Math.floor(Math.random() * palabras.length)]

        const partida = {
            palabra: elegida[0],
            pista: elegida[1],
            usadas: [],
            errores: 0
        }

        partidas.set(chat, partida)
        return m.reply(mostrarPartida(partida))
    }

    const p = partidas.get(chat)

    if (!p) {
        return m.reply('> ❌ No hay partida activa. Usa *.ahorcado* para comenzar.')
    }

    if (comando === 'abandonar') {
        partidas.delete(chat)
        return m.reply(`> 🏳️ Partida terminada. La palabra era *${p.palabra}*.`)
    }

    if (comando === 'letra') {
        if (!/^[A-ZÑ]$/.test(texto)) {
            return m.reply('> ⚠️ Escribe una sola letra. Ejemplo: *.letra a*')
        }

        if (p.usadas.includes(texto)) {
            return m.reply('> ⚠️ Ya habías probado esa letra.')
        }

        p.usadas.push(texto)

        if (!p.palabra.includes(texto)) {
            p.errores++
        }

        const ganaste = [...p.palabra].every(letra => p.usadas.includes(letra))

        if (ganaste) {
            partidas.delete(chat)
            return m.reply(
                `🎉 *¡GANASTE!*\n\n` +
                `La palabra era *${p.palabra}*.\n` +
                `Errores: ${p.errores}/6\n\n🏆 ¡Bien jugado!`
            )
        }

        if (p.errores >= 6) {
            partidas.delete(chat)
            return m.reply(
                `${dibujos[6]}\n\n💀 *¡PERDISTE!*\n` +
                `La palabra era *${p.palabra}*.\n` +
                `¡Inténtalo otra vez con *.ahorcado*!`
            )
        }

        return m.reply(mostrarPartida(p))
    }

    if (comando === 'resolver') {
        if (!texto) {
            return m.reply('> ⚠️ Escribe tu respuesta. Ejemplo: *.resolver elefante*')
        }

        if (texto === p.palabra) {
            partidas.delete(chat)
            return m.reply(
                `🎉 *¡PALABRA CORRECTA!*\n\n` +
                `La respuesta era *${p.palabra}*.\n🏆 ¡Ganaste!`
            )
        }

        p.errores++

        if (p.errores >= 6) {
            partidas.delete(chat)
            return m.reply(
                `${dibujos[6]}\n\n💀 *¡PERDISTE!*\n` +
                `La palabra era *${p.palabra}*.`
            )
        }

        return m.reply(`❌ Esa no es la palabra.\n\n${mostrarPartida(p)}`)
    }
}

handler.command = [
    'ahorcado',
    'letra',
    'resolver',
    'abandonar'
]

// Solo aparece ahorcado en el menú
handler.help = ['ahorcado']
handler.tags = ['juegos']
handler.menu = true

export default handler
