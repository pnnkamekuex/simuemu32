import type { ParsedLine } from '../types';
import { formatRegisterValue } from '../features/simulator/asmSimulator';

const DATA_DIRECTIVES = new Set(['.byte', '.word', '.int', '.quad']);

type VariableEntry = {
  name: string;
  directive: string;
  values: number[];
};

interface VariablesPanelProps {
  analysis?: ParsedLine[];
  onInspect: (label: string, value: number, address?: number) => void;
}

const extractVariables = (analysis?: ParsedLine[]): VariableEntry[] => {
  if (!analysis) {
    return [];
  }

  const variables: VariableEntry[] = [];

  analysis.forEach((line) => {
    if (!line.label || !DATA_DIRECTIVES.has(line.mnemonic)) {
      return;
    }

    const values = line.operands
      .map((operand) => {
        const value = operand.parsed.value;
        return typeof value === 'number' ? value : null;
      })
      .filter((value): value is number => value !== null);

    if (values.length > 0) {
      variables.push({
        name: line.label,
        directive: line.mnemonic,
        values,
      });
    }
  });

  return variables;
};

export const VariablesPanel = ({ analysis, onInspect }: VariablesPanelProps) => {
  const variables = extractVariables(analysis);

  return (
    <div className="panel">
      <header>
        <h2 className="panelTitle">Variables</h2>
      </header>
      {variables.length === 0 ? (
        <p>No se detectaron variables numéricas en la sección de datos.</p>
      ) : (
        <div className="variablesList">
          {variables.map((variable) => (
            <div key={variable.name} className="variableCard">
              <div className="variableHeader">
                <span className="variableName">{variable.name}</span>
                <span className="variableDirective">{variable.directive}</span>
              </div>
              <div className="variableValues">
                {variable.values.map((value, index) => {
                  const label = variable.values.length > 1 ? `${variable.name}[${index}]` : variable.name;
                  return (
                    <button
                      key={`${variable.name}-${index}`}
                      type="button"
                      className="variableValueButton"
                      onClick={() => onInspect(label, value)}
                    >
                      {formatRegisterValue(value)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
