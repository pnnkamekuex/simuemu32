# SimuEmu32 by PNNKamek

SimuEmu32 es una aplicación web orientada a simular un entorno de programación en ensamblador Intel de 32 bits. El objetivo es ofrecer una interfaz amigable donde el usuario pueda crear o cargar proyectos, escribir código, validar instrucciones y observar el estado de la pila y de los registros de la CPU.

## Desarrollo actual

El repositorio ya incluye una primera versión funcional del simulador web construido con **React + TypeScript + Vite**. Esta entrega cubre los elementos principales descritos en la planificación inicial:

- **Gestor de proyectos** con almacenamiento en `localStorage` que permite crear proyectos a partir de dos plantillas (normal y simplificada) y alternar rápidamente entre los más recientes.
- **Editor de código ASM** basado en un `<textarea>` optimizado para monoespaciado, con botón de ejecución para simular el programa.
- **Motor de simulación** sencillo que reconoce instrucciones básicas (`mov`, `add`, `sub`, `push`, `pop`, `nop`, `int`) y genera un log de ejecución junto con diagnósticos de errores de sintaxis.
- **Visualización de pila y registros** actualizados tras cada ejecución, incluyendo los flags `ZF` y `SF`.
- **Panel de mensajes** que reúne los errores detectados y el historial de instrucciones ejecutadas.

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Scripts disponibles

```bash
npm install      # Instala las dependencias
npm run dev      # Inicia el entorno de desarrollo en http://localhost:5173
npm run build    # Genera la build de producción
npm run preview  # Previsualiza la build de producción
npm run lint     # Ejecuta ESLint sobre el código fuente
```

## Estructura principal

```
src/
├── components/         # UI principal: editor, pila, registros, mensajes
├── context/            # Contexto global para proyectos
├── features/           # Lógica de negocio (simulador ASM, plantillas)
├── styles/             # Hojas de estilo globales
├── App.tsx             # Punto de entrada de la aplicación
└── main.tsx            # Renderizado con ReactDOM
```

## Próximos pasos sugeridos

- Sustituir el `<textarea>` por un editor avanzado (Monaco/CodeMirror) con resaltado y autocompletado.
- Añadir ejecución paso a paso, puntos de ruptura y visualización de banderas adicionales.
- Expandir el set de instrucciones soportadas y permitir la definición de etiquetas y saltos.
- Implementar exportación/importación de proyectos y sincronización opcional con un backend.
- Incluir pruebas automatizadas tanto para el parser como para los componentes críticos del UI.

## Licencia

Este proyecto se distribuye con fines educativos. Ajusta la licencia según tus necesidades antes de publicar.
