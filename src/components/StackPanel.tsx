import { formatRegisterValue } from '../features/simulator/asmSimulator';

interface StackPanelProps {
  stack: number[];
  stackPointer: number;
}

export const StackPanel = ({ stack, stackPointer }: StackPanelProps) => {
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
            <div key={index} className="stackItem">
              <span>{formatRegisterValue(address)}</span>
              <strong>{formatRegisterValue(value)}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
};
