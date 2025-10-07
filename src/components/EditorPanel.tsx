interface EditorPanelProps {
  code: string;
  onChange: (value: string) => void;
  onRun: () => void;
  disabled?: boolean;
}

export const EditorPanel = ({ code, onChange, onRun, disabled = false }: EditorPanelProps) => {
  return (
    <div className="panel">
      <header>
        <h2 className="panelTitle">Editor ASM</h2>
        <button type="button" className="buttonPrimary" onClick={onRun} disabled={disabled}>
          Ejecutar programa
        </button>
      </header>
      <textarea
        className="textarea"
        value={code}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribe aquí tus instrucciones..."
        spellCheck={false}
      />
    </div>
  );
};
