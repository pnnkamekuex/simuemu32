import { formatRegisterValue } from '../features/simulator/asmSimulator';

interface StackPanelProps {
  stack: number[];
  stackPointer: number;
  onInspect: (label: string, value: number, address?: number) => void;
}

export const StackPanel = ({ stack, stackPointer, onInspect }: StackPanelProps) => {
  return (
    <div className="panel">
      <header>
        <h2 className="panelTitle">Pila</h2>
        <span>ESP: {formatRegisterValue(stackPointer)}</span>
      </header>
      <div className="stackList">
        {stack.length === 0 && <p>La pila está vacía.</p>}
        {stack.map((value, index) => {
          const address = stackPointer + index * 4;
          return (
            <button
              key={index}
              type="button"
              className="stackItemButton"
              onClick={() => onInspect(`pila[${index}]`, value, address)}
            >
              <span>{formatRegisterValue(address)}</span>
              <strong>{formatRegisterValue(value)}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
};
