'use client';

import { useMemo } from 'react';
import { generateBarcodeSVGData } from '../../lib/barcode';

export default function BarcodeView({
  value,
  height = 40,
  barWidth = 1.8,
  quietZone = 8,
  showText = true,
  className = '',
  style = {},
  color = '#000000',
  bgColor = '#ffffff',
}) {
  const code = (value || '').toString().trim() || '000000';

  const svgData = useMemo(() => {
    try {
      return generateBarcodeSVGData(code, {
        height,
        barWidth,
        quietZone,
      });
    } catch {
      return null;
    }
  }, [code, height, barWidth, quietZone]);

  if (!svgData) return null;

  return (
    <div
      className={`barcode-container ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: bgColor,
        padding: '6px 10px',
        borderRadius: 6,
        ...style,
      }}
    >
      <svg
        viewBox={`0 0 ${svgData.totalWidth} ${svgData.height}`}
        width="100%"
        height={height}
        style={{ display: 'block', maxWidth: '100%' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={svgData.totalWidth} height={svgData.height} fill={bgColor} />
        {svgData.bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y="0"
            width={bar.width}
            height={svgData.height}
            fill={color}
          />
        ))}
      </svg>
      {showText && (
        <span
          className="barcode-text"
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 700,
            color: color,
            marginTop: 3,
            letterSpacing: '1.5px',
          }}
        >
          {svgData.text}
        </span>
      )}
    </div>
  );
}
