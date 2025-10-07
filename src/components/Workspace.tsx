import { useEffect, useMemo, useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import type { SimulationResult } from '../types';
import { getInitialCpuState, simulateProgram } from '../features/simulator/asmSimulator';
import { ProjectManager } from './ProjectManager';
import { EditorPanel } from './EditorPanel';
import { StackPanel } from './StackPanel';
import { RegistersPanel } from './RegistersPanel';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { VariablesPanel } from './VariablesPanel';
import { ValueInspector } from './ValueInspector';
import '../styles/workspace.css';

export const Workspace = () => {
  const { currentProject, updateProjectCode } = useProjectContext();
  const [code, setCode] = useState('');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [inspectedValue, setInspectedValue] = useState<
    | {
        label: string;
        value: number;
        address?: number;
      }
    | null
  >(null);

  useEffect(() => {
    if (currentProject) {
      setCode(currentProject.code);
      setSimulationResult(null);
    } else {
      setCode('');
      setSimulationResult(null);
    }
  }, [currentProject]);

  const cpuState = useMemo(() => simulationResult?.state ?? getInitialCpuState(), [simulationResult]);
  const diagnostics = simulationResult?.diagnostics ?? [];
  const logs = simulationResult?.log ?? [];
  const analysis = simulationResult?.analysis;

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (currentProject) {
      updateProjectCode(value);
    }
  };

  const handleRun = () => {
    if (!currentProject) {
      return;
    }
    const result = simulateProgram(code);
    setSimulationResult(result);
  };

  const handleInspect = (label: string, value: number, address?: number) => {
    setInspectedValue({ label, value, address });
  };

  const closeInspector = () => setInspectedValue(null);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div>
          <h1>SimuEmu32</h1>
          <p>Simulador educativo de ensamblador Intel 32 bits.</p>
        </div>
        <ProjectManager />
      </aside>
      <main className="content">
        <div className="editorArea">
          <EditorPanel code={code} onChange={handleCodeChange} onRun={handleRun} disabled={!currentProject} />
          <DiagnosticsPanel diagnostics={diagnostics} logs={logs} />
        </div>
        <div className="stackArea">
          <StackPanel stack={cpuState.stack} stackPointer={cpuState.registers.ESP} onInspect={handleInspect} />
        </div>
        <div className="registerArea">
          <RegistersPanel state={cpuState} onInspect={handleInspect} />
        </div>
        <div className="variablesArea">
          <VariablesPanel analysis={analysis} onInspect={handleInspect} />
        </div>
      </main>
      {inspectedValue && (
        <ValueInspector
          label={inspectedValue.label}
          value={inspectedValue.value}
          address={inspectedValue.address}
          onClose={closeInspector}
        />
      )}
    </div>
  );
};
