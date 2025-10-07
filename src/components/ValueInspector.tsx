import { useEffect } from 'react';
import { formatRegisterValue } from '../features/simulator/asmSimulator';

interface ValueInspectorProps {
  label: string;
  value: number;
  address?: number;
  onClose: () => void;
}

const formatBinary = (value: number) => (value >>> 0).toString(2).padStart(32, '0');

const chunkBinary = (binary: string) =>
  binary
    .match(/.{1,4}/g)
    ?.join(' ')
    .replace(/(.{36})/g, '$1\n') ?? binary;

const toSigned = (value: number) => {
  const unsigned = value >>> 0;
  return unsigned & 0x80000000 ? unsigned - 0x1_0000_0000 : unsigned;
};

const toAscii = (value: number) => {
  const unsigned = value >>> 0;
  const bytes = [unsigned & 0xff, (unsigned >>> 8) & 0xff, (unsigned >>> 16) & 0xff, (unsigned >>> 24) & 0xff];
  return bytes
    .map((byte) => {
      if (byte === 0) {
        return '\\0';
      }
      if (byte >= 32 && byte <= 126) {
        return String.fromCharCode(byte);
      }
      return '.';
    })
    .join('');
};

export const ValueInspector = ({ label, value, address, onClose }: ValueInspectorProps) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const unsigned = value >>> 0;
  const signed = toSigned(value);
  const binary = chunkBinary(formatBinary(value));
  const hexadecimal = formatRegisterValue(value);
  const ascii = toAscii(value);

  return (
    <div className="valueInspectorOverlay" role="dialog" aria-modal="true">
      <div className="valueInspectorContent">
        <header className="valueInspectorHeader">
          <div>
            <h3>{label}</h3>
            {typeof address === 'number' && <p>Dirección: {formatRegisterValue(address)}</p>}
          </div>
          <button type="button" className="valueInspectorClose" onClick={onClose}>
            Cerrar
          </button>
        </header>
        <div className="valueInspectorGrid">
          <div>
            <span className="valueInspectorLabel">Decimal (con signo)</span>
            <strong>{signed}</strong>
          </div>
          <div>
            <span className="valueInspectorLabel">Decimal (sin signo)</span>
            <strong>{unsigned}</strong>
          </div>
          <div>
            <span className="valueInspectorLabel">Hexadecimal</span>
            <strong>{hexadecimal}</strong>
          </div>
          <div>
            <span className="valueInspectorLabel">ASCII</span>
            <strong className="valueInspectorAscii">{ascii}</strong>
          </div>
        </div>
        <div className="valueInspectorBinary">
          <span className="valueInspectorLabel">Binario</span>
          <code>{binary}</code>
        </div>
      </div>
    </div>
  );
};
