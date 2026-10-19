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
- **Tiempo Real (WebSockets):** `Socket.IO` con eventos fuertemente tipados (`room:sync`, `playback:sync`, `queue:update`, `chat:message`, `reaction:new`, `skip:update`, `room:settingsUpdated`).
- **Base de Datos & ORM:** **MySQL** (`mirocola_db`) gestionado mediante **Prisma ORM**. Persiste salas y el historial de canciones reproducidas.
- **Sincronización:** Motor de estado en memoria que compensa la latencia de red mediante marcas de tiempo de servidor y cálculo de deriva (*drift correction*).
- **Extracción Multimedia:** Servicio de metadatos de YouTube con extracción precisa de duración sin requerir API key obligatoria (vía scraping inicial + oEmbed).
- **Reglas Anti-Spam y Moderación en Tiempo Real:** Validación estricta de duración, turnos no consecutivos, límites por usuario y bloqueo de listas enteras.

### Frontend (React + Vite + TypeScript)
- **Vite + React 19** con soporte para componentes modernos.
- **Tailwind CSS v4** con diseño *Dark Neon Rocola*, animaciones de vinilo giratorio y efectos de brillo.
- **YouTube Iframe Player API:** Reproductor sincronizado que maneja reproducción, pausa, salto a tiempo específico (*seek*) y volumen local.
- **Modos de Visualización:** Alterna entre ver el video oficial de YouTube o el **Modo Fiesta / Vinilo**, donde se muestra un disco de acetato con la portada del tema.
- **Sistema de Cola & Votación:** Los participantes pueden pedir canciones y votar con 🔥 para que sus temas favoritos suban en la lista.
- **Voto para Saltar (Vote Skip):** Si a la mayoría no le gusta la canción actual (> 50% de votos), se pasa a la siguiente automáticamente.
- **Chat & Reacciones en Vivo:** Mensajes de chat y emojis flotantes con lluvia de confeti (🎉, 🔥, 🍻).
- **Panel de Ajustes para el Anfitrión (⚙️):** Modal exclusivo para el creador de la sala para configurar reglas en vivo.

---

## ⚙️ Panel de Configuraciones del Anfitrión

El creador de la sala (o quien reciba la corona de DJ) tiene acceso a un botón de ajustes (**⚙️**) en la barra de navegación para controlar las siguientes reglas:

1. **⏱️ Límite de Duración de Cada Canción:**
   - Opciones: 3 min, 5 min, 8 min, 10 min, 15 min, 20 min o Sin límite.
   - Si alguien intenta encolar un mix de 1 hora o un video que exceda el límite, el servidor lo rechaza informando la duración exacta y el límite permitido.
2. **🚫 Prohibición de Listas de Reproducción Completas:**
   - Se rechazan enlaces a playlists enteras (`youtube.com/playlist?list=...`) exigiendo canciones individuales para no saturar la rocola.
3. **🔀 Evitar Canciones Consecutivas del Mismo Usuario:**
   - Si está activo, una persona no puede encolar dos canciones seguidas si hay más amigos en la sala, garantizando que todos tengan turno.
4. **🎯 Límite de Canciones por Usuario en la Cola:**
   - Opciones: 1, 2, 3, 5 o Sin límite de canciones activas por persona en espera.
5. **🔂 Bloqueo de Canciones Duplicadas:**
   - Evita que se encole una canción que ya esté sonando o que ya se encuentre esperando en la cola.
6. **🔒 Cerrar / Bloquear Pedidos (Pausar Rocola):**
   - El anfitrión puede congelar la cola de pedidos temporalmente cuando no desee que se agreguen más temas.
7. **📊 Porcentaje para Saltar Canción:**
   - Modifica el porcentaje requerido de votos para saltar un tema (30%, 50%, 66% o 75%).
8. **👑 Modo de Control:**
   - Cambiar en cualquier momento entre **Colaborativo** (todos pueden pausar/reproducir) y **Modo DJ** (solo el anfitrión manipula el reproductor).

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
