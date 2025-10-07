import type { CpuState, RegisterName } from '../types';
import { formatRegisterValue } from '../features/simulator/asmSimulator';

interface RegistersPanelProps {
  state: CpuState;
}

const registerOrder: RegisterName[] = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP'];

export const RegistersPanel = ({ state }: RegistersPanelProps) => {
  return (
    <div className="panel">
      <header>
        <h2 className="panelTitle">Registros</h2>
      </header>
      <div className="registerGrid">
        {registerOrder.map((register) => (
          <div key={register} className="registerCard">
            <span className="registerName">{register}</span>
            <span>{formatRegisterValue(state.registers[register])}</span>
          </div>
        ))}
      </div>
      <div className="flags">
        <span>ZF: {state.flags.ZF ? '1' : '0'}</span>
        <span>SF: {state.flags.SF ? '1' : '0'}</span>
      </div>
    </div>
  );
};
