# Wordle-Online

Una versión en línea multijugador del clásico juego Wordle, construida con Node.js y tecnologías web modernas. Este juego permite a varios jugadores adivinar una palabra de 5 letras, ver sus intentos anteriores y competir por quién la adivina primero.


## 🛠️ Tecnologías Utilizadas

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WebSocket](https://img.shields.io/badge/WebSockets-010101?style=for-the-badge&logo=websocket&logoColor=white)

## 🎮 Características

- Juego clásico Wordle de 5 letras  
- Interfaz web moderna  
- Lógica de validación de palabras  
- Modo multijugador con WebSockets  
- Panel lateral con historial de intentos por jugador  
- Servidor backend con Node.js y Express  

## 📁 Estructura del Proyecto

```
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
```

## 🚀 Instalación

1. Clona o descarga este repositorio.  
2. Instala las dependencias usando:

   ```bash
   npm install
   ```

3. Inicia el servidor:

   ```bash
   node server.js
   ```

4. Abre tu navegador y visita:

   ```
   http://localhost:3000
   ```

## 📦 Dependencias

Las dependencias se especifican en `package.json`. Algunas importantes:

- express  
- socket.io  

