# 🔐 Sistema de Autenticación - EDGE Analytics Dashboard

## Configuración Inicial

### Cambiar la Contraseña de Acceso

Abre el archivo **`config.js`** y modifica la contraseña:

```javascript
const AUTH_CONFIG = {
    // Cambia esta contraseña por la que desees
    accessPassword: 'EDGE2026',  // ← CÁMBIALA AQUÍ
    
    // Tiempo de sesión en horas (24 horas por defecto)
    sessionDuration: 24
};
```

### Contraseña por Defecto
**Contraseña actual:** `EDGE2024`

⚠️ **IMPORTANTE:** Cambia esta contraseña inmediatamente después de la instalación.

---

## Uso del Sistema

### Para Usuarios

1. **Acceder al Dashboard**
   - Abre `login.html` en tu navegador
   - Ingresa la clave de acceso proporcionada por el administrador
   - Haz clic en "Acceder al Dashboard"

2. **Sesión Activa**
   - La sesión permanece activa por 24 horas (configurable)
   - No necesitas volver a ingresar la clave durante este tiempo

3. **Cerrar Sesión**
   - Haz clic en el botón "Cerrar Sesión" en el menú lateral
   - Esto eliminará tu sesión y te redirigirá al login

### Para Administradores

#### Cambiar la Contraseña

1. Abre `config.js`
2. Modifica el valor de `accessPassword`
3. Guarda el archivo
4. Los usuarios deberán ingresar la nueva contraseña en su próximo acceso

#### Cambiar Duración de Sesión

En `config.js`, modifica:
```javascript
sessionDuration: 24  // Número de horas
```

---

## Archivos del Sistema

- **`config.js`** - Configuración de contraseña y sesión
- **`auth.js`** - Lógica de autenticación
- **`login.html`** - Página de inicio de sesión
- **`index.html`** - Dashboard principal (protegido)

---

## Seguridad

### Nivel de Seguridad
Este es un sistema de autenticación **básico** adecuado para:
- ✅ Protección contra acceso casual no autorizado
- ✅ Control interno de acceso
- ✅ Ambientes de desarrollo/staging

### No es adecuado para:
- ❌ Datos altamente confidenciales
- ❌ Ambientes de producción con múltiples usuarios
- ❌ Compliance con regulaciones estrictas

### Recomendaciones
- 🔐 Usa una contraseña fuerte y única
- 🔄 Cambia la contraseña periódicamente
- 🚫 No compartas la contraseña públicamente
- 🌐 Para mayor seguridad, considera implementar Supabase o Firebase

---

## Solución de Problemas

### "No puedo acceder después de cambiar la contraseña"
- Verifica que `config.js` esté guardado correctamente
- Refresca el navegador (Ctrl+F5)
- Limpia el caché del navegador

### "La sesión expira muy rápido"
- Aumenta el valor de `sessionDuration` en `config.js`

### "Olvidé la contraseña"
- Como administrador, edita `config.js` y establece una nueva contraseña
- Los usuarios deben cerrar sesión y volver a ingresar con la nueva clave

---

## Próximos Pasos (Opcional)

Si necesitas mayor seguridad en el futuro, considera:
1. **Supabase** - Sistema de autenticación robusto con base de datos
2. **Firebase** - Autenticación con Google, email/password, etc.
3. **Backend propio** - Node.js + Express con JWT tokens

---

**Fecha de implementación:** Enero 2026  
**Versión:** 1.0
