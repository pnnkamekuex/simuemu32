# Guía de uso de SimuEmu32

Esta guía resume la sintaxis aceptada por el simulador y cómo interactuar con la interfaz para inspeccionar el estado de la CPU.

## Notación básica

- **Registros**: siempre se escriben como `%REGISTRO`, por ejemplo `%EAX`, `%EBX`, `%ESP`.
- **Inmediatos**: los literales numéricos usan el prefijo `$`, por ejemplo `$10`, `$0xFF`, `$0b1010`.
- **Direcciones de memoria**: se refieren a la dirección contenida en un registro o símbolo, por ejemplo `(%eax)` o `variable`. Cuando quieras obtener la dirección como inmediato, usa `$variable`.
- **Separadores**: las instrucciones pueden incluir espacios adicionales, por ejemplo `mov $3, %EBX` es válido.

## Instrucciones soportadas

El simulador actual soporta un conjunto reducido de instrucciones AT&T con operandos en el orden *fuente, destino*:

| Instrucción | Uso | Descripción |
|-------------|-----|-------------|
| `mov` | `mov $valor, %REG` | Copia el valor fuente en el destino (solo registro). |
| `add` | `add $valor, %REG` | Suma el valor fuente al registro destino. |
| `sub` | `sub %REG, %REG` | Resta el valor fuente del registro destino. |
| `push` | `push %REG` | Empuja el valor fuente a la pila (decrementa `%ESP`). |
| `pop` | `pop %REG` | Extrae el valor del tope de la pila al registro destino. |
| `nop` | `nop` | No realiza ninguna operación, útil para relleno. |
| `int` | `int $numero` | Simula una interrupción (sin efectos secundarios). |

> **Nota:** por ahora las operaciones entre dos operandos de memoria no están disponibles y cualquier intento mostrará un diagnóstico.

### Ejemplos

```asm
.data
  contador: .int 5

.text
  mov $3, %EBX
  add %EBX, %EAX
  push %EAX
  pop %ECX
```

## Inspección del estado

- **Registros**: haz clic sobre cualquier tarjeta de registro (por ejemplo `%EAX`) para ver su contenido en binario, decimal con y sin signo, hexadecimal y representación ASCII de los cuatro bytes.
- **Pila**: cada entrada de la pila es interactiva. Al pulsarla se muestra el valor almacenado junto con la dirección de memoria asociada.
- **Variables de `.data`**: tras ejecutar el programa, las variables numéricas declaradas con `.byte`, `.word`, `.int` o `.quad` aparecen en el panel de variables. Puedes pulsar cada valor para inspeccionarlo en todos los formatos.

La ventana de inspección puede cerrarse con el botón **Cerrar** o presionando la tecla `Esc`.

## Consejos adicionales

- Usa comentarios con `;` para documentar tu código: `add $1, %EAX ; incrementa el contador`.
- Ejecuta el programa desde el panel derecho para actualizar los registros, la pila y las variables visibles.
- Si una instrucción o modo de direccionamiento no está soportado, revisa el panel de diagnósticos para obtener detalles del error.
