# Mis finanzas

Página para llevar mis finanzas personales. Se instala en el celular como una app y **funciona sin internet**. Los datos se guardan en el dispositivo (localStorage). El back viene después.

Abrir en la compu: doble clic en `index.html` (así anda todo menos el modo sin conexión, que necesita estar publicada por https).

## Archivos

| Archivo | Qué tiene |
|---|---|
| `index.html` | Estructura de la página |
| `manifest.webmanifest` | Nombre, ícono y colores de la app instalada |
| `sw.js` | Service worker: guarda los archivos para abrir sin internet. **Subir `VERSION` cada vez que se cambia algo** |
| `fonts/` | Inter Tight guardada localmente (fuente variable, un archivo) |
| `icons/` | Íconos de la app (el punto azul) |
| `css/fonts.css` | Carga la fuente local |
| `css/tokens.css` | Colores y tipografía |
| `css/base.css` | Reset, máscaras de revelado, botones |
| `css/header.css` | Logo, selector de mes, menú |
| `css/hero.css` | Balance del mes y gráfico |
| `css/lists.css` | Categorías y movimientos |
| `css/sheet.css` | El punto, el formulario y el aviso |
| `css/responsive.css` | Tablet y celular |
| `css/app.css` | Ajustes de app instalada (barra de estado, sin rebote, sin resaltado al tocar) |
| `js/util.js` | Formato de plata y fechas, constantes, categorías (`CATS`) |
| `js/motion.js` | Resortes y animaciones |
| `js/store.js` | Datos: cargar, guardar, consultas, ejemplo |
| `js/toast.js` | Aviso inferior con botón |
| `js/chart.js` | Gráfico del balance |
| `js/categories.js` | "En qué se va" y topes |
| `js/movements.js` | Lista, filtros, búsqueda, borrar |
| `js/sheet.js` | Formulario que sale del punto |
| `js/menu.js` | Instalar, exportar, importar, borrar todo |
| `js/pwa.js` | Registra el service worker, pide almacenamiento persistente, botón "Instalar" |
| `js/main.js` | Arranque, meses, teclado |

## App en el celular

1. Abrir el link publicado (https) en el celular, con internet, una vez.
2. Instalar:
   - **Android (Chrome):** Opciones → *Instalar en el celular*, o menú ⋮ → *Instalar app*.
   - **iPhone (Safari):** botón Compartir → *Agregar a inicio*.
3. Desde ahí se abre con el ícono del punto azul y funciona sin wifi ni datos.

- Lo que se carga queda guardado en el celular. Cada dispositivo tiene sus propios datos (hasta que exista el back).
- **Exportar copia** en el celular abre el menú de compartir: se puede guardar en Archivos, Drive o mandar por WhatsApp.
- Para publicar un cambio: subir `VERSION` en `sw.js` y volver a publicar. La app baja la versión nueva la próxima vez que se abre con internet y muestra "Hay una versión nueva · Recargar".

## Qué hace

- **Balance del mes**: número grande con ingresos, gastos, % de ahorro y comparación de gastos con el mes anterior.
- **Gráfico**: balance acumulado día a día. Pasando el mouse se ve el valor de cada día.
- **En qué se va**: gastos por categoría. Tocando una se le pone un **tope mensual** (muestra cuánto queda o por cuánto me pasé).
- **Movimientos**: agrupados por día, con filtros (Todos / Ingresos / Gastos) y búsqueda. Tocar uno lo edita; la ✕ lo borra (con "Deshacer").
- **Nuevo movimiento**: el punto azul abajo a la derecha, o la tecla `N`.
- **Cambiar de mes**: flechas del encabezado o teclas ← / →.
- **Opciones**: instalar en el celular, exportar copia `.json`, importar copia, ver datos de ejemplo, borrar todo.

> Los datos viven solo en este navegador. Si se limpian los datos del navegador, se pierden: **exportar una copia de vez en cuando**.

## Estilo

Basado en estas reglas:

- **Una sola tipografía**: Inter Tight (guardada en `fonts/`), con números tabulares.
- **Un solo color de acento**: azul `#2347FF` (`#5E7BFF` en modo oscuro). Se usa solo en **el punto** y en la palabra clave del título (el mes).
- Mucho espacio vacío, líneas finas en lugar de tarjetas, sin degradados, sombras ni brillos.
- Modo claro y oscuro automático según el sistema.

### El hilo conductor: el punto

El punto azul es el mismo objeto en toda la página:

1. Es el **logo** (arriba a la izquierda).
2. Es el **último punto de la línea** del balance en el gráfico.
3. Es el **botón para agregar**: al tocarlo se abre como un círculo y se transforma en el formulario; al guardar, el formulario se cierra y vuelve a ser el punto.

### Movimiento

- Resortes (springs) con rebote mínimo (~1%) y curvas exponenciales, calculados en función del tiempo (`js/motion.js`, funciones `springAt` y `animate`).
- Nada aparece de golpe: los textos entran por una **máscara**, las barras **crecen**, los números **cuentan** hasta su valor.
- El texto que sale y el que entra tienen tiempos separados, así las letras nunca se pisan.
- Respeta la opción del sistema "reducir movimiento".

## Datos

Se guardan en localStorage con la clave `misfinanzas.v1`, con este formato (el mismo que el `.json` exportado):

```json
{
  "tx": [
    { "id": "…", "created": 1762300000000, "type": "out", "amount": 12500,
      "category": "Supermercado", "note": "Súper", "date": "2026-11-05" }
  ],
  "budgets": { "Supermercado": 200000 },
  "sample": false
}
```

- `type`: `"in"` (ingreso) u `"out"` (gasto).
- Moneda: pesos argentinos, formato `es-AR` (`$ 12.500`).
- Categorías de gasto: Supermercado, Comida, Transporte, Vivienda, Servicios, Salud, Ocio, Ropa, Educación, Otros.
- Categorías de ingreso: Sueldo, Freelance, Ventas, Regalos, Otros.
- Para cambiarlas: constante `CATS` en `js/util.js`.

## Próximos pasos

- [ ] Back: guardar los datos en un servidor/base de datos en lugar del navegador.
- [ ] Video de 30 s de la página (brief con storyboard, banda sonora en código y render a MP4), usando el punto como hilo conductor.
