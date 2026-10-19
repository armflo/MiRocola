# 🎵 MiRocola — Salas de Música Colaborativa en Vivo

**MiRocola** es una plataforma en tiempo real donde tú y tus amigos pueden crear salas mediante códigos únicos, agregar canciones de YouTube/YouTube Music y escuchar música sincronizados al milisegundo.

---

## 🚀 Arquitectura y Tecnologías

El proyecto está organizado como un **Monorepo** con TypeScript compartido entre el cliente y el servidor:

```
MiRocola/
├── shared/         # Tipos TypeScript, interfaces de Salas, Canciones y Eventos de Socket.IO
├── server/         # Backend: Node.js + Express + TypeScript + Socket.IO + Prisma + MySQL
└── client/         # Frontend: React 19 + Vite + TypeScript + Tailwind CSS v4 + Lucide Icons
```

### Backend (Node.js + TypeScript)
- **Framework & HTTP:** Express con Node.js y TypeScript.
- **Tiempo Real (WebSockets):** `Socket.IO` con eventos fuertemente tipados (`room:sync`, `playback:sync`, `queue:update`, `chat:message`, `reaction:new`, `soundboard:played`, `room:settingsUpdated`).
- **Base de Datos & ORM:** **MySQL** (`mirocola_db`) gestionado mediante **Prisma ORM**. Persiste salas y el historial de canciones reproducidas.
- **Sincronización:** Motor de estado en memoria que compensa la latencia de red mediante marcas de tiempo de servidor y cálculo de deriva (*drift correction*).
- **Extracción & Búsqueda Multimedia:** Búsqueda integrada de YouTube ultrarrápida sin requerir API keys obligatorias (con fallback a YouTube Data API v3).
- **Reglas Anti-Spam y Moderación en Tiempo Real:** Validación estricta de duración, turnos no consecutivos, límites por usuario y bloqueo de listas enteras.

### Frontend (React + Vite + TypeScript)
- **Vite + React 19** con soporte para componentes modernos.
- **Tailwind CSS v4** con selector de 5 temas dinámicos (Cyber Neon, Rocola 80s Gold, Club Esmeralda, Medianoche Océano, Atardecer Fiesta).
- **YouTube Iframe Player API:** Reproductor sincronizado que maneja reproducción, pausa, salto a tiempo específico (*seek*) y volumen local.
- **Buscador Integrado de YouTube:** Búsqueda por palabras clave con resultados instantáneos (carátulas, duración y canal) para agregar canciones con 1 clic.
- **Botonera DJ (Soundboard) en Tiempo Real:** Sonidos sintetizados con Web Audio API (Airhorn 🎺, Aplausos 👏, Scratch de vinilo 🎚️, Sirena 🚨, Ba-Dum-Tss 🥁) que suenan en los teléfonos de todos sincronizados.
- **Diseño Responsivo Completo para Móviles:** Barra inferior estilo app móvil (Rocola, Cola, Chat), mini-reproductor persistente y botón flotante (+).
- **Invitación Rápida con Código QR:** Escaneo directo desde la cámara del celular para unirse al instante con el código precargado.

---

## 🔍 Buscador de YouTube Integrado

En el modal de **Pedir Tema**, los usuarios ya no necesitan salir de la aplicación:
1. Escribe el nombre de la canción o artista (ej. *"Soda Stereo De Musica Ligera"*).
2. Presiona **Buscar** o Enter.
3. Se despliegan los resultados con carátula, duración y canal.
4. Presiona **Pedir** para enviarla inmediatamente a la cola de reproducción.
*(Si pegas un enlace directo `https://youtube.com/watch?v=...`, también lo detecta y lo agrega al instante).*

---

## 📢 Soundboard DJ & Efectos en Vivo

Panel con efectos de sonido de alta fidelidad que suenan instantáneamente en los dispositivos de todos los amigos conectados en la sala:
- 🎺 **Bocina DJ (Airhorn):** El clásico toque jamaiquino de discoteca.
- 👏 **Aplausos:** Ovación del público.
- 🎚️ **Scratch de Vinilo:** Efecto de retroceso de tocadiscos hip-hop.
- 🚨 **Sirena de Fiesta:** Alarma festiva para momentos cumbre.
- 🥁 **Ba-Dum-Tss:** Redoble de comedia tras un comentario en el chat.
*(Incluye botón de Mute local para silenciar solo los efectos si así lo deseas).*

---

## ⚙️ Panel de Configuraciones del Anfitrión

El creador de la sala (o quien reciba la corona de DJ) tiene acceso a un botón de ajustes (**⚙️**) en la barra de navegación para controlar:

1. **🎨 Estilos y Colores de la Sala:** 5 paletas de color que se aplican a todos los integrantes en vivo.
2. **⏱️ Límite de Duración de Cada Canción:** 3, 5, 8, 10, 15, 20 min o Sin límite.
3. **🚫 Prohibición de Listas de Reproducción Completas:** Rechazo de playlists completas para cuidar la cola.
4. **🔀 Evitar Canciones Consecutivas del Mismo Usuario:** Garantiza turnos alternados entre amigos.
5. **🎯 Límite de Canciones por Usuario en Cola:** 1, 2, 3, 5 o Sin límite.
6. **🔂 Bloqueo de Canciones Duplicadas:** Evita repetir temas activos.
7. **🔒 Cerrar / Bloquear Pedidos (Pausar Rocola):** Congelar la cola temporalmente.
8. **📊 Porcentaje para Saltar Canción:** 30%, 50%, 66% o 75%.
9. **👑 Modo de Control:** Alternar entre Colaborativo y Modo DJ.

---

## 🛠️ Requisitos Previos

1. **Node.js**: v18 o superior (v24 recomendado).
2. **MySQL**: Servidor MySQL activo en `localhost:3306` (por ejemplo con XAMPP, WampServer o MySQL Server).

---

## ⚙️ Configuración Inicial

### 1. Clonar e Instalar Dependencias
Desde la raíz del proyecto:
```bash
npm install
```

### 2. Base de Datos MySQL
Asegúrate de que tu servicio de MySQL esté corriendo. La base de datos `mirocola_db` se creará y sincronizará con:
```bash
npm run prisma:push --workspace=server
```

*(Si necesitas cambiar el usuario o contraseña de MySQL, edita el archivo `server/.env`).*

---

## 🏃 Cómo Ejecutar el Proyecto

Puedes iniciar tanto el backend como el frontend de forma simultánea con un solo comando:

```bash
npm run dev
```

O si prefieres ejecutarlos en terminales separadas:
```bash
# Terminal 1 - Backend (http://localhost:3001)
npm run dev:server

# Terminal 2 - Frontend (http://localhost:5173)
npm run dev:client
```

Abre tu navegador en: **`http://localhost:5173`**
