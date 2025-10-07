import type { CpuState, RegisterName } from '../types';
import { formatRegisterValue } from '../features/simulator/asmSimulator';

interface RegistersPanelProps {
  state: CpuState;
  onInspect: (label: string, value: number, address?: number) => void;
}

const registerOrder: RegisterName[] = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP'];

export const RegistersPanel = ({ state, onInspect }: RegistersPanelProps) => {
  return (
    <div className="panel">
      <header>
        <h2 className="panelTitle">Registros</h2>
      </header>
      <div className="registerGrid">
        {registerOrder.map((register) => (
          <button
            key={register}
            type="button"
            className="registerCardButton"
            onClick={() => onInspect(`%${register}`, state.registers[register])}
          >
            <span className="registerName">{register}</span>
            <span>{formatRegisterValue(state.registers[register])}</span>
          </button>
        ))}
      </div>
      <div className="flags">
        <span>ZF: {state.flags.ZF ? '1' : '0'}</span>
        <span>SF: {state.flags.SF ? '1' : '0'}</span>
      </div>
    </div>
  );
};
