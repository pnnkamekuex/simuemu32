import { useMemo } from 'react';

interface EditorPanelProps {
  code: string;
  onChange: (value: string) => void;
  onRun: () => void;
  disabled?: boolean;
}

export const EditorPanel = ({ code, onChange, onRun, disabled = false }: EditorPanelProps) => {
  const lineNumbers = useMemo(() => {
    const totalLines = code.split(/\r?\n/).length || 1;
    return Array.from({ length: totalLines }, (_, index) => index + 1).join('\n');
  }, [code]);

  return (
    <div className="panel">
      <header>
        <h2 className="panelTitle">Editor ASM</h2>
        <button type="button" className="buttonPrimary" onClick={onRun} disabled={disabled}>
          Ejecutar programa
        </button>
      </header>
      <div className="editorContainer">
        <pre className="lineNumbers" aria-hidden="true">
          {lineNumbers}
        </pre>
        <textarea
          className="textarea editorTextarea"
          value={code}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Escribe aquí tus instrucciones..."
          spellCheck={false}
        />
      </div>
    </div>
  );
};
