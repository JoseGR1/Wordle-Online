let socket;
let codigoPartidaActual;
let nombreJugadorActual;
let esAnfitrion = false;
let palabraObjetivo = '';
let miTurno = false;

// Elementos del DOM
const elementos = {
    crearPartida: {
        nombre: document.getElementById('nombre-creador'),
        codigoContainer: document.getElementById('codigo-container'),
        codigo: document.getElementById('codigo-partida'),
        btnCrear: document.getElementById('btn-crear'),
        btnJugar: document.getElementById('btn-jugar'),
        jugadoresEspera: document.getElementById('jugadores-espera'),
        estadisticasContainer: document.getElementById('estadisticas-creador'),
        jugadorNombre: document.getElementById('jugador-nombre'),
        jugadorProgreso: document.getElementById('jugador-progreso'),
        jugadorPorcentaje: document.getElementById('jugador-porcentaje')
    },
    unirsePartida: {
        nombre: document.getElementById('nombre-jugador'),
        codigo: document.getElementById('codigo-input'),
        esperando: document.getElementById('esperando'),
        btnUnirse: document.getElementById('btn-unirse'),
        jugadoresUnidos: document.getElementById('jugadores-unidos'),
        estadisticasContainer: document.getElementById('estadisticas-invitado'),
        jugadoresProgreso: document.getElementById('jugadores-progreso')
    },
    juego: {
        codigoPartida: document.getElementById('codigo-partida'),
        jugadoresLista: document.getElementById('jugadores-lista'),
        turnoActual: document.getElementById('turno-actual'),
        wordGrid: document.getElementById('word-grid'),
        inputPalabra: document.getElementById('input-palabra'),
        btnIntento: document.getElementById('btn-intento'),
        mensajeJugador: document.getElementById('mensaje-jugador'),
        resultadoFinal: document.getElementById('resultado-final'),
        mensajeFinal: document.getElementById('mensaje-final'),
        palabraFinal: document.getElementById('palabra-final'),
        tablaPosiciones: document.getElementById('tabla-posiciones'),
        estadisticasJuego: document.getElementById('estadisticas-juego'),
        jugadoresProgreso: document.getElementById('jugadores-progreso')
    }
};

// --------------------------------------------
// INICIALIZACIÓN
// --------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/' || window.location.pathname.includes('index')) {
        initEventosInicio();
    } else if (window.location.pathname === '/game.html') {
        initJuego();
    }
});

// --------------------------------------------
// FUNCIONES DE INICIO
// --------------------------------------------
function initEventosInicio() {
    if (elementos.crearPartida.btnCrear) {
        elementos.crearPartida.btnCrear.addEventListener('click', crearPartida);
    }
    if (elementos.crearPartida.btnJugar) {
        elementos.crearPartida.btnJugar.addEventListener('click', comenzarJuego);
    }
    if (elementos.unirsePartida.btnUnirse) {
        elementos.unirsePartida.btnUnirse.addEventListener('click', unirsePartida);
    }
}

async function crearPartida() {
    const nombre = elementos.crearPartida.nombre.value.trim();
    if (!nombre) return mostrarError('Ingresa tu nombre');

    try {
        const res = await fetch('/crear-partida', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreJugador: nombre })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        guardarDatos(nombre, data.codigoPartida, true);
        palabraObjetivo = data.palabraObjetivo;
        
        elementos.crearPartida.codigo.textContent = data.codigoPartida;
        elementos.crearPartida.codigoContainer.classList.remove('hidden');
        
        // Mostrar estadísticas del creador
        elementos.crearPartida.estadisticasContainer.classList.remove('hidden');
        elementos.crearPartida.jugadorNombre.textContent = nombre;
        
        // Conectar socket para actualizaciones en tiempo real
        conectarSocketInicio();

    } catch (err) {
        mostrarError(err.message);
    }
}

async function unirsePartida() {
    const nombre = elementos.unirsePartida.nombre.value.trim();
    const codigo = elementos.unirsePartida.codigo.value.trim().toUpperCase();

    if (!nombre || !codigo) return mostrarError('Nombre y código son requeridos');

    try {
        const res = await fetch('/unirse-partida', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreJugador: nombre, codigoPartida: codigo })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        guardarDatos(nombre, codigo, false);
        palabraObjetivo = data.palabraObjetivo;
        
        elementos.unirsePartida.esperando.classList.remove('hidden');
        elementos.unirsePartida.estadisticasContainer.classList.remove('hidden');
        
        // Conectar socket para actualizaciones en tiempo real
        conectarSocketInicio();

    } catch (err) {
        mostrarError(err.message);
    }
}

function conectarSocketInicio() {
    socket = io();

    socket.on('connect', () => {
        socket.emit('unirse', {
            codigoPartida: codigoPartidaActual,
            nombreJugador: nombreJugadorActual
        });
    });

    socket.on('actualizar-jugadores', ({ jugadores, estado, estadisticas }) => {
        actualizarListaJugadores(jugadores);
        actualizarEstadisticas(estadisticas);
    });

    socket.on('comenzar-juego', () => {
        window.location.href = '/game.html';
    });

    socket.on('error', (msg) => {
        mostrarError(msg);
    });
}

function comenzarJuego() {
    if (!codigoPartidaActual || !nombreJugadorActual) {
        mostrarError('No se pudo iniciar el juego');
        return;
    }
    window.location.href = '/game.html';
}

// --------------------------------------------
// FUNCIONES DE JUEGO
// --------------------------------------------
function initJuego() {
    cargarDatosGuardados();
    if (!codigoPartidaActual || !nombreJugadorActual) {
        window.location.href = '/';
        return;
    }

    // Configurar eventos del juego
    if (elementos.juego.btnIntento) {
        elementos.juego.btnIntento.addEventListener('click', enviarIntento);
    }
    
    if (elementos.juego.inputPalabra) {
        elementos.juego.inputPalabra.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') enviarIntento();
        });
    }

    conectarSocketJuego();
}

function conectarSocketJuego() {
    socket = io();

    socket.on('connect', () => {
        socket.emit('unirse', {
            codigoPartida: codigoPartidaActual,
            nombreJugador: nombreJugadorActual
        });
    });

    socket.on('comenzar-juego', ({ jugadores, turno, palabraObjetivo: objetivo }) => {
        palabraObjetivo = objetivo;
        actualizarCabecera(jugadores, turno);
        miTurno = jugadores[turno] === nombreJugadorActual;
        actualizarInput(miTurno);
        inicializarTablero();
    });

    socket.on('actualizar-turno', ({ jugadorActual, intentos, estadisticas, feedback }) => {
        const nombres = Object.keys(intentos);
        actualizarCabecera(nombres, jugadorActual);
        miTurno = nombres[jugadorActual] === nombreJugadorActual;
        actualizarInput(miTurno);
        actualizarTablero(intentos);
        actualizarEstadisticas(estadisticas);
        actualizarProgresoJugadores(intentos); // ← Añade esta línea
        
        if (feedback && feedback[nombreJugadorActual]) {
            mostrarFeedback(feedback[nombreJugadorActual]);
        }
    });

    socket.on('juego-terminado', ({ ganador, palabraObjetivo: objetivo, intentos, estadisticas }) => {
        palabraObjetivo = objetivo;
        actualizarTablero(intentos);
        mostrarResultadoFinal(ganador, objetivo, estadisticas);
    });

    socket.on('actualizar-estadisticas', (estadisticas) => {
        actualizarEstadisticas(estadisticas);
    });

    socket.on('error', (msg) => {
        mostrarError(msg);
    });
}

function enviarIntento() {
    if (!miTurno) return;
    
    const input = elementos.juego.inputPalabra;
    const palabra = input.value.trim().toLowerCase();
    
    if (palabra.length !== 5) {
        mostrarMensaje('La palabra debe tener 5 letras');
        return;
    }

    socket.emit('intento', {
        codigoPartida: codigoPartidaActual,
        nombreJugador: nombreJugadorActual,
        palabra
    });

    input.value = '';
}

// --------------------------------------------
// FUNCIONES DE INTERFAZ
// --------------------------------------------
function actualizarListaJugadores(jugadores) {
    if (elementos.crearPartida.jugadoresEspera) {
        elementos.crearPartida.jugadoresEspera.innerHTML = jugadores
            .map(j => `<div class="jugador">${j}</div>`)
            .join('');
    }
    
    if (elementos.unirsePartida.jugadoresUnidos) {
        elementos.unirsePartida.jugadoresUnidos.innerHTML = jugadores
            .map(j => `<div class="jugador">${j}</div>`)
            .join('');
    }
}

function actualizarCabecera(jugadores, turnoActual) {
    if (elementos.juego.codigoPartida) {
        elementos.juego.codigoPartida.textContent = codigoPartidaActual;
    }

    if (elementos.juego.jugadoresLista) {
        elementos.juego.jugadoresLista.innerHTML = jugadores
            .map((j, i) => 
                `<span class="${i === turnoActual ? 'jugador-activo' : ''}">${j}</span>`
            )
            .join(', ');
    }

    if (elementos.juego.turnoActual) {
        elementos.juego.turnoActual.textContent = jugadores[turnoActual];
        elementos.juego.turnoActual.className = 'jugador-activo';
    }
}

function actualizarInput(habilitado) {
    if (elementos.juego.inputPalabra && elementos.juego.btnIntento) {
        elementos.juego.inputPalabra.disabled = !habilitado;
        elementos.juego.btnIntento.disabled = !habilitado;
        
        if (habilitado) {
            elementos.juego.inputPalabra.focus();
            mostrarMensaje('Es tu turno! Adivina la palabra');
        } else {
            mostrarMensaje(`Turno de ${elementos.juego.turnoActual?.textContent || 'otro jugador'}`);
        }
    }
}

function inicializarTablero() {
    if (!elementos.juego.wordGrid) return;
    
    elementos.juego.wordGrid.innerHTML = '';
    
    for (let row = 0; row < 6; row++) {
        const fila = document.createElement('div');
        fila.className = 'fila';
        
        for (let col = 0; col < 5; col++) {
            const celda = document.createElement('div');
            celda.className = 'celda';
            celda.id = `celda-${row}-${col}`;
            fila.appendChild(celda);
        }
        
        elementos.juego.wordGrid.appendChild(fila);
    }
}

function actualizarTablero(intentosPorJugador) {
    if (!elementos.juego.wordGrid) return;
    
    const misIntentos = intentosPorJugador[nombreJugadorActual] || [];
    
    for (let row = 0; row < 6; row++) {
        const palabra = misIntentos[row] || '';
        
        for (let col = 0; col < 5; col++) {
            const celda = document.getElementById(`celda-${row}-${col}`);
            if (!celda) continue;
            
            celda.textContent = palabra[col]?.toUpperCase() || '';
            
            // Limpiar clases anteriores
            celda.className = 'celda';
            
            if (palabra[col]) {
                if (palabra[col] === palabraObjetivo[col]) {
                    celda.classList.add('correcta');
                } else if (palabraObjetivo.includes(palabra[col])) {
                    celda.classList.add('presente');
                } else {
                    celda.classList.add('incorrecta');
                }
            }
        }
    }
    renderizarHistorialJugadores(intentosPorJugador);

}

function mostrarFeedback(feedback) {
    feedback.forEach(({ letra, estado, posicion }) => {
        // Podríamos usar esta información para animaciones o efectos especiales
        console.log(`Letra ${letra} en posición ${posicion} está ${estado}`);
    });
}

function actualizarEstadisticas(estadisticas) {
    if (!estadisticas) return;
    
    const actualizarUI = (container, elemento) => {
        if (!container || !elemento) return;
        
        container.innerHTML = estadisticas
            .map(({ nombre, porcentaje, letrasCorrectas, letrasPresentes }) => `
                <div class="jugador-estado">
                    <span>${nombre}</span>
                    <div class="jugador-progreso">
                        <div class="progreso-barra" style="width: ${porcentaje}%"></div>
                    </div>
                    <span>${porcentaje}% (${letrasCorrectas}C ${letrasPresentes}P)</span>
                </div>
            `)
            .join('');
    };
    
    // Actualizar todas las posibles ubicaciones de estadísticas
    actualizarUI(elementos.crearPartida.estadisticasContainer, elementos.crearPartida.jugadorProgreso);
    actualizarUI(elementos.unirsePartida.jugadoresProgreso, null);
    actualizarUI(elementos.juego.jugadoresProgreso, null);
}

function mostrarResultadoFinal(ganador, palabra, estadisticas) {
    if (!elementos.juego.resultadoFinal) return;
    
    elementos.juego.resultadoFinal.classList.remove('hidden');
    elementos.juego.mensajeFinal.textContent = ganador 
        ? ganador === nombreJugadorActual 
            ? '¡Ganaste! 🎉' 
            : `¡${ganador} ha ganado!`
        : 'Nadie adivinó la palabra 😕';
    
    elementos.juego.palabraFinal.textContent = palabra.toUpperCase();
    
    if (elementos.juego.tablaPosiciones && estadisticas) {
        elementos.juego.tablaPosiciones.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Jugador</th>
                        <th>Aciertos</th>
                        <th>Progreso</th>
                    </tr>
                </thead>
                <tbody>
                    ${estadisticas.map(({ nombre, porcentaje, letrasCorrectas, letrasPresentes }) => `
                        <tr class="${nombre === ganador ? 'ganador' : ''}">
                            <td>${nombre}</td>
                            <td>${letrasCorrectas} correctas, ${letrasPresentes} presentes</td>
                            <td>
                                <div class="progreso-barra" style="width: ${porcentaje}%"></div>
                                ${porcentaje}%
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

function actualizarProgresoJugadores(intentosPorJugador) {
    const tbody = document.querySelector('#tabla-progreso tbody');
    if (!tbody) return;

    tbody.innerHTML = Object.entries(intentosPorJugador)
        .map(([nombre, intentos]) => {
            // Crear celdas de colores para cada intento
            const celdas = intentos.map((intento, index) => {
                if (!intento) {
                    return `<div class="celda-progreso celda-vacia" title="Intento ${index + 1} vacío"></div>`;
                }

                const feedback = analizarPalabra(intento, palabraObjetivo);
                const clases = feedback.map(f => `celda-${f.estado}`).join(' ');
                
                return `<div class="celda-progreso ${clases}" title="Intento ${index + 1}: ${intento}"></div>`;
            }).join('');

            return `
                <tr>
                    <td>${nombre}</td>
                    <td><div class="celdas-progreso">${celdas}</div></td>
                </tr>
            `;
        })
        .join('');
}

function renderizarHistorialJugadores(intentosPorJugador) {
    const container = document.getElementById("historial-jugadores");
    if (!container) return;

    container.innerHTML = '';

    for (const jugador in intentosPorJugador) {
        if (jugador === nombreJugadorActual) continue;

        const intentos = intentosPorJugador[jugador];
        const card = document.createElement("div");
        card.className = "historial-jugador";

        const titulo = document.createElement("h4");
        titulo.textContent = jugador;
        card.appendChild(titulo);

        const tablero = document.createElement("div");
        tablero.className = "tablero-mini";

        for (let row = 0; row < 6; row++) {
            const palabra = intentos[row] || "";

            for (let col = 0; col < 5; col++) {
                const letra = palabra[col] || '';
                const celda = document.createElement("div");
                celda.className = "celda-mini";

                if (letra) {
                    if (letra === palabraObjetivo[col]) {
                        celda.classList.add("green");
                    } else if (palabraObjetivo.includes(letra)) {
                        celda.classList.add("yellow");
                    } else {
                        celda.classList.add("gray");
                    }
                } else {
                    celda.classList.add("gray"); // celda vacía → gris
                }

                tablero.appendChild(celda);
            }
        }

        card.appendChild(tablero);
        container.appendChild(card);
    }
}


// Función auxiliar para analizar palabra (similar a la del servidor)
function analizarPalabra(palabra, objetivo) {
    const resultado = [];
    const objetivoArray = objetivo.split('');
    const palabraArray = palabra.split('');

    for (let i = 0; i < 5; i++) {
        if (palabraArray[i] === objetivoArray[i]) {
            resultado.push({ estado: 'correcta' });
        } else if (objetivoArray.includes(palabraArray[i])) {
            resultado.push({ estado: 'presente' });
        } else {
            resultado.push({ estado: 'incorrecta' });
        }
    }

    return resultado;
}

// --------------------------------------------
// UTILIDADES
// --------------------------------------------
function guardarDatos(nombre, codigo, anfitrion) {
    nombreJugadorActual = nombre;
    codigoPartidaActual = codigo;
    esAnfitrion = anfitrion;
    sessionStorage.setItem('nombreJugador', nombre);
    sessionStorage.setItem('codigoPartida', codigo);
    sessionStorage.setItem('esAnfitrion', anfitrion.toString());
}

function cargarDatosGuardados() {
    nombreJugadorActual = sessionStorage.getItem('nombreJugador');
    codigoPartidaActual = sessionStorage.getItem('codigoPartida');
    esAnfitrion = sessionStorage.getItem('esAnfitrion') === 'true';
}

function mostrarMensaje(msg) {
    if (elementos.juego.mensajeJugador) {
        elementos.juego.mensajeJugador.textContent = msg;
    }
}

function mostrarError(msg) {
    console.error(msg);
    const errorElement = document.getElementById('mensaje-error');
    if (errorElement) {
        errorElement.textContent = msg;
        errorElement.classList.remove('hidden');
        setTimeout(() => errorElement.classList.add('hidden'), 5000);
    } else {
        alert(msg);
    }
}

function volverAlInicio() {
    sessionStorage.removeItem('nombreJugador');
    sessionStorage.removeItem('codigoPartida');
    sessionStorage.removeItem('esAnfitrion');
    window.location.href = '/';
}