const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuración
const PORT = process.env.PORT || 3000;
const palabras = [
  "arbol", "balsa", "canto", "dulce", "estar", "fuego", "grano", "hueso", 
  "igual", "jugar", "lapiz", "monte", "nuevo", "oscar", "piano", "queso",
  "raton", "saber", "tener", "volar", "yogur", "zorro", "acido", "bello",
  "cable", "danza", "etapa", "fumar", "girar", "hielo"
];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Almacenamiento de partidas
const partidas = {};

// Clase para manejar el estado del juego
class EstadoJuego {
  constructor(palabraObjetivo) {
    this.palabraObjetivo = palabraObjetivo;
    this.jugadores = [];
    this.intentos = {};
    this.estado = 'esperando';
    this.creadaEn = new Date();
    this.ganador = null;
    this.estadisticas = {};
  }

  agregarJugador(nombre, socketId) {
    const jugador = { id: socketId, nombre, lista: 0 };
    this.jugadores.push(jugador);
    this.intentos[nombre] = Array(6).fill('');
    this.estadisticas[nombre] = {
      letrasCorrectas: 0,
      letrasPresentes: 0,
      intentosUsados: 0
    };
    return jugador;
  }

  registrarIntento(nombre, palabra, intentoIndex) {
    this.intentos[nombre][intentoIndex] = palabra;
    this.estadisticas[nombre].intentosUsados = intentoIndex + 1;
    
    const feedback = this.analizarPalabra(palabra);
    this.actualizarEstadisticas(nombre, feedback);
    
    if (palabra === this.palabraObjetivo) {
      this.estado = 'terminada';
      this.ganador = nombre;
      return { feedback, ganador: nombre };
    }
    
    return { feedback };
  }

  analizarPalabra(palabra) {
    const resultado = [];
    const objetivoArray = this.palabraObjetivo.split('');
    const palabraArray = palabra.split('');

    for (let i = 0; i < 5; i++) {
      if (palabraArray[i] === objetivoArray[i]) {
        resultado.push({ letra: palabraArray[i], estado: 'correcta', posicion: i });
      } else if (objetivoArray.includes(palabraArray[i])) {
        resultado.push({ letra: palabraArray[i], estado: 'presente', posicion: i });
      } else {
        resultado.push({ letra: palabraArray[i], estado: 'incorrecta', posicion: i });
      }
    }

    return resultado;
  }

  actualizarEstadisticas(nombre, feedback) {
    this.estadisticas[nombre].letrasCorrectas = feedback.filter(
      f => f.estado === 'correcta'
    ).length;
    this.estadisticas[nombre].letrasPresentes = feedback.filter(
      f => f.estado === 'presente'
    ).length;
  }

  obtenerEstadisticas() {
    return Object.entries(this.estadisticas).map(([nombre, stats]) => ({
      nombre,
      ...stats,
      porcentaje: Math.round(
        ((stats.letrasCorrectas * 2) + stats.letrasPresentes) / 10 * 100
      )
    })).sort((a, b) => b.porcentaje - a.porcentaje);
  }
}

// Rutas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.post('/crear-partida', (req, res) => {
  const { nombreJugador } = req.body;
  if (!nombreJugador || nombreJugador.trim() === '') {
    return res.status(400).json({ error: 'El nombre del jugador es requerido' });
  }

  let codigoPartida;
  do {
    codigoPartida = generarCodigoPartida();
  } while (partidas[codigoPartida]);

  const palabraObjetivo = palabras[Math.floor(Math.random() * palabras.length)];
  partidas[codigoPartida] = new EstadoJuego(palabraObjetivo);
  partidas[codigoPartida].agregarJugador(nombreJugador.trim());

  console.log(`Partida creada: ${codigoPartida} por ${nombreJugador}`);
  res.json({ codigoPartida, palabraObjetivo: palabraObjetivo });
});

app.post('/unirse-partida', (req, res) => {
  const { codigoPartida, nombreJugador } = req.body;
  if (!nombreJugador || nombreJugador.trim() === '') {
    return res.status(400).json({ error: 'El nombre del jugador es requerido' });
  }

  const partida = partidas[codigoPartida];
  if (!partida) return res.status(404).json({ error: 'Partida no encontrada' });

  if (partida.jugadores.length >= 3) {
    return res.status(400).json({ error: 'La partida está llena (máximo 3 jugadores)' });
  }

  if (partida.jugadores.some(j => j.nombre === nombreJugador.trim())) {
    return res.status(400).json({ error: 'Ya hay un jugador con ese nombre en la partida' });
  }

  partida.agregarJugador(nombreJugador.trim());

  console.log(`Jugador ${nombreJugador} se unió a partida ${codigoPartida}`);
  res.json({ 
    exito: true, 
    jugadores: partida.jugadores.map(j => j.nombre),
    palabraObjetivo: partida.palabraObjetivo
  });
});

app.get('/estado-partida/:codigo', (req, res) => {
  const partida = partidas[req.params.codigo];
  if (!partida) {
    return res.status(404).json({ error: 'Partida no encontrada' });
  }

  res.json({
    jugadores: partida.jugadores.map(j => j.nombre),
    estado: partida.estado,
    creadaEn: partida.creadaEn,
    estadisticas: partida.obtenerEstadisticas()
  });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);
  
  socket.on('unirse', ({ codigoPartida, nombreJugador }) => {
    const partida = partidas[codigoPartida];
    if (!partida) return socket.emit('error', 'Partida no encontrada');

    const jugador = partida.jugadores.find(j => j.nombre === nombreJugador);
    if (!jugador) return socket.emit('error', 'Jugador no registrado en esta partida');

    jugador.id = socket.id;
    socket.join(codigoPartida);

    console.log(`Jugador ${nombreJugador} (${socket.id}) se unió a ${codigoPartida}`);

    io.to(codigoPartida).emit('actualizar-jugadores', {
      jugadores: partida.jugadores.map(j => j.nombre),
      estado: partida.estado,
      estadisticas: partida.obtenerEstadisticas()
    });

    if (partida.jugadores.every(j => j.id !== null)) {
      if (partida.jugadores.length > 1 && partida.estado === 'esperando') {
        partida.estado = 'en-progreso';
        console.log(`Iniciando juego en partida ${codigoPartida}`);
        io.to(codigoPartida).emit('comenzar-juego', {
          jugadores: partida.jugadores.map(j => j.nombre),
          turno: 0,
          palabraObjetivo: partida.palabraObjetivo
        });
      }
    }
  });

  socket.on('intento', ({ codigoPartida, nombreJugador, palabra }) => {
    const partida = partidas[codigoPartida];
    if (!partida || partida.estado !== 'en-progreso') {
      return socket.emit('error', 'La partida no está en progreso');
    }

    const palabraLower = palabra.toLowerCase();
    if (palabra.length !== 5 || !palabras.includes(palabraLower)) {
      return socket.emit('error', 'Palabra no válida');
    }

    const intentos = partida.intentos[nombreJugador];
    const intentoActual = intentos.findIndex(intento => intento === '');
    if (intentoActual === -1) {
      return socket.emit('error', 'No quedan intentos disponibles');
    }

    const resultado = partida.registrarIntento(nombreJugador, palabraLower, intentoActual);
    
    console.log(`Intento de ${nombreJugador} en ${codigoPartida}: ${palabraLower}`);

    if (resultado.ganador) {
      console.log(`¡${nombreJugador} ganó la partida ${codigoPartida}!`);
      
      io.to(codigoPartida).emit('juego-terminado', {
        ganador: nombreJugador,
        palabraObjetivo: partida.palabraObjetivo,
        intentos: partida.intentos,
        estadisticas: partida.obtenerEstadisticas(),
        feedback: resultado.feedback
      });
      return;
    }

    const jugadorActual = partida.jugadores.findIndex(j => j.nombre === nombreJugador);
    const siguienteJugador = (jugadorActual + 1) % partida.jugadores.length;

    io.to(codigoPartida).emit('actualizar-turno', {
      jugadorActual: siguienteJugador,
      intentos: partida.intentos,
      estadisticas: partida.obtenerEstadisticas(),
      feedback: {
        [nombreJugador]: resultado.feedback
      }
    });
  });

  socket.on('solicitar-estadisticas', (codigoPartida) => {
    const partida = partidas[codigoPartida];
    if (partida) {
      socket.emit('actualizar-estadisticas', partida.obtenerEstadisticas());
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);

    for (const codigo in partidas) {
      const partida = partidas[codigo];
      const jugador = partida.jugadores.find(j => j.id === socket.id);
      if (jugador) {
        jugador.id = null;
        partida.estado = 'esperando';
        io.to(codigo).emit('actualizar-jugadores', {
          jugadores: partida.jugadores.map(j => j.nombre),
          estado: partida.estado,
          estadisticas: partida.obtenerEstadisticas()
        });
        break;
      }
    }
  });
});

// Función para generar el código único
function generarCodigoPartida() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});