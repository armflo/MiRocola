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
- **Tiempo Real (WebSockets):** `Socket.IO` con eventos fuertemente tipados (`room:sync`, `playback:sync`, `queue:update`, `chat:message`, `reaction:new`, `skip:update`).
- **Base de Datos & ORM:** **MySQL** (`mirocola_db`) gestionado mediante **Prisma ORM**. Persiste salas y el historial de canciones reproducidas.
- **Sincronización:** Motor de estado en memoria que compensa la latencia de red mediante marcas de tiempo de servidor y cálculo de deriva (*drift correction*).
- **Extracción Multimedia:** Servicio de metadatos de YouTube sin requerir API key obligatoria (mediante oEmbed), con soporte opcional para la YouTube Data API v3.

### Frontend (React + Vite + TypeScript)
- **Vite + React 19** con soporte para componentes modernos.
- **Tailwind CSS v4** con diseño *Dark Neon Rocola*, animaciones de vinilo giratorio y efectos de brillo.
- **YouTube Iframe Player API:** Reproductor sincronizado que maneja reproducción, pausa, salto a tiempo específico (*seek*) y volumen local.
- **Modos de Visualización:** Alterna entre ver el video oficial de YouTube o el **Modo Fiesta / Vinilo**, donde se muestra un disco de acetato con la portada del tema.
- **Sistema de Cola & Votación:** Los participantes pueden pedir canciones y votar con 🔥 para que sus temas favoritos suban en la lista.
- **Voto para Saltar (Vote Skip):** Si a la mayoría no le gusta la canción actual (> 50% de votos), se pasa a la siguiente automáticamente.
- **Chat & Reacciones en Vivo:** Mensajes de chat y emojis flotantes con lluvia de confeti (🎉, 🔥, 🍻).

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

---

## 🎮 Modos de Sala

1. **Modo Colaborativo (Por defecto):**
   - Cualquier persona conectada a la sala puede reproducir, pausar, adelantar o cambiar de canción. Ideal para grupos pequeños de amigos de confianza.
2. **Modo DJ (Anfitrión):**
   - Solo el creador de la sala (o quien tenga la corona de anfitrión) tiene el control de los botones de reproducción. Los invitados pueden pedir canciones a la cola, votarlas y votar para saltar temas.

---

## 📦 Scripts Disponibles

- `npm run dev`: Inicia el servidor y el cliente en modo desarrollo con recarga en vivo.
- `npm run build`: Compila `shared`, `server` y `client` para producción.
- `npm run prisma:push --workspace=server`: Sincroniza el esquema de Prisma con la base de datos MySQL.
- `npm run prisma:generate --workspace=server`: Regenera el cliente de Prisma.
