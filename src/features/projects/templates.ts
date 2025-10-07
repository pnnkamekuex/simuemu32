import type { ProjectTemplate } from '../../types';

export const projectTemplates: Record<ProjectTemplate, string> = {
  normal: `; SimuEmu32 - Plantilla Normal
section .text
  global _start

_start:
  mov eax,1
  mov ebx,0
  int 0x80
`,
  simplificado: `; SimuEmu32 - Plantilla Simplificada
start:
  mov eax,0
  ret
`,
};
