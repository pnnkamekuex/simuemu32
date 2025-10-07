import type { ProjectTemplate } from '../../types';

export const projectTemplates: Record<ProjectTemplate, string> = {
  normal: `; SimuEmu32 - Plantilla Normal
.data
mensaje: .asciiz "Hola, SimuEmu32!"

.text
.global _start

_start:
  movl $0, %ebx
  movl $1, %eax
  int $0x80
`,
  simplificado: `; SimuEmu32 - Plantilla Simplificada
.text
.global main

main:
  movl $0, %eax
  ret
`,
};
