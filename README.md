Wordle-Online

Una versión en línea multijugador del clásico juego Wordle, construida con Node.js y tecnologías web modernas. Este juego permite a varios jugadores adivinar una palabra de 5 letras, ver sus intentos anteriores y competir por quién la adivina primero.

🎮 Características

- Juego clásico Wordle de 5 letras
- Interfaz web
- Lógica de validación de palabras
- Modo multijugador con WebSockets
- Panel lateral con historial de intentos por jugador
- Servidor backend con Node.js y Express

📁 Estructura del Proyecto

Wordle-Online-main/
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
└── public/
    ├── index.html
    ├── game.html
    ├── scripts.js
    └── styles.css

🚀 Instalación

1. Clona o descarga este repositorio.

2. Instala las dependencias con npm:

   npm install

3. Inicia el servidor:

   node server.js

4. Abre tu navegador y visita:

   http://localhost:3000

🛠️ Tecnologías Utilizadas

- Node.js
- Express
- HTML5 + CSS3
- JavaScript
- WebSockets (para comunicación en tiempo real, si se habilita)

📦 Dependencias

Las dependencias se especifican en package.json. Algunas comunes podrían incluir:

- express
- socket.io 
