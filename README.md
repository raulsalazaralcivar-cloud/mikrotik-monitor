# MikroMon — Monitor de tráfico MikroTik

App PWA para monitorear el consumo de red de tu MikroTik en tiempo real desde el iPhone.

---

## Estructura del proyecto

```
mikrotik-monitor/
├── server.js          ← Backend (proxy a la API de MikroTik)
├── package.json
├── render.yaml        ← Config para Render.com
└── public/
    └── index.html     ← Frontend PWA (la app que usas en el iPhone)
```

---

## Paso 1 — Subir a GitHub

1. Ve a https://github.com y crea una cuenta si no tienes
2. Click en "New repository" → nombre: `mikrotik-monitor` → Public → Create
3. En tu Mac/PC instala Git y sube los archivos:
   ```bash
   cd mikrotik-monitor
   git init
   git add .
   git commit -m "primera version"
   git remote add origin https://github.com/TU_USUARIO/mikrotik-monitor.git
   git push -u origin main
   ```
   O simplemente arrastra los archivos desde la interfaz web de GitHub.

---

## Paso 2 — Desplegar en Render (gratis)

1. Ve a https://render.com y regístrate con tu cuenta de GitHub
2. Click "New +" → "Web Service"
3. Conecta tu repositorio `mikrotik-monitor`
4. Render detecta automáticamente el `render.yaml`
5. Click "Create Web Service"
6. Espera 2-3 minutos → te da una URL así: `https://mikrotik-monitor.onrender.com`

---

## Paso 3 — Abrir en iPhone como app

1. Abre **Safari** en tu iPhone (debe ser Safari, no Chrome)
2. Ve a la URL de Render: `https://mikrotik-monitor.onrender.com`
3. Toca el botón de compartir (cuadrado con flecha ↑)
4. Selecciona **"Añadir a pantalla de inicio"**
5. Nombra la app "MikroMon" → Añadir
6. ¡Listo! Aparece en tu home como una app nativa

---

## Paso 4 — Configurar la app

1. Abre MikroMon desde tu pantalla de inicio
2. En el campo **Backend URL**: pega `https://tu-app.onrender.com`
3. En **IP Pública**: ingresa la IP pública de tu MikroTik
4. **Puerto API**: 8728 (por defecto)
5. **Usuario / Contraseña**: tus credenciales de MikroTik
6. Toca **CONECTAR**

---

## Requisito en MikroTik

Asegúrate de que el puerto 8728 esté abierto en el firewall del router:

```
/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept
```

Y que el usuario tenga permiso de API:
```
/user set [find name=admin] group=full
```

---

## Notas

- Render en plan gratuito "duerme" el servidor tras 15 min de inactividad.
  La primera conexión puede tardar 30-60 segundos en despertar.
- Para uso continuo considera Railway (también gratuito, no duerme).
- Los datos se actualizan cada 3 segundos automáticamente.
