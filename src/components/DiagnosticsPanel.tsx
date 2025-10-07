import type { Diagnostic, SimulationLogEntry } from '../types';

interface DiagnosticsPanelProps {
  diagnostics: Diagnostic[];
  logs: SimulationLogEntry[];
}

export const DiagnosticsPanel = ({ diagnostics, logs }: DiagnosticsPanelProps) => {
  const hasDiagnostics = diagnostics.length > 0;
  const hasLogs = logs.length > 0;

  return (
    <div className="panel">
      <header>
        <h2 className="panelTitle">Mensajes</h2>
      </header>
      <div className="diagnosticsList">
        {!hasDiagnostics && <p>No se encontraron errores.</p>}
        {diagnostics.map((diagnostic, index) => (
          <div
            key={`${diagnostic.line}-${index}`}
            className={`diagnosticItem ${diagnostic.severity === 'warning' ? 'diagnosticWarning' : ''}`}
          >
            <strong>Línea {diagnostic.line}:</strong> {diagnostic.message}
          </div>
        ))}
      </div>
      <div>
        <h3 className="panelTitle">Registro de ejecución</h3>
        <div className="logList">
          {!hasLogs && <p>Aún no se ha ejecutado ningún programa.</p>}
          {logs.map((entry, index) => (
            <div key={`${entry.line}-${index}`} className="logEntry">
              <span>
                <strong>Línea {entry.line}:</strong> {entry.instruction}
              </span>
              <span>{entry.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
