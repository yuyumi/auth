import React, { useEffect, useRef } from 'react';
import qrcodegen from 'nayuki-qr-code-generator';

const QRGenerator = ({ data, size = 256, border = 4 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    try {
      const number = parseInt(data.itemId, 16);

      // Generate QR Code using the correct import
      const qr = qrcodegen.QrCode.encodeText(number, qrcodegen.QrCode.Ecc.HIGH);
      
      // Calculate scaling factor
      const moduleCount = qr.size;
      const moduleSize = Math.floor((size - 2 * border) / moduleCount);
      const actualSize = moduleSize * moduleCount + 2 * border;
      
      // Set canvas size
      canvas.width = actualSize;
      canvas.height = actualSize;
      
      // Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, actualSize, actualSize);
      
      // Draw modules
      ctx.fillStyle = '#000000';
      for (let y = 0; y < moduleCount; y++) {
        for (let x = 0; x < moduleCount; x++) {
          if (qr.getModule(x, y)) {
            ctx.fillRect(
              x * moduleSize + border, 
              y * moduleSize + border, 
              moduleSize, 
              moduleSize
            );
          }
        }
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Draw error message on canvas
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#FF0000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Error generating QR code', size/2, size/2);
    }
  }, [data, size, border]);

  const downloadQR = () => {
    const canvas = canvasRef.current;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `product-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="bg-white rounded-lg shadow-sm"
        style={{ 
          width: size,
          height: size,
          maxWidth: '100%'
        }}
      />
      <button
        onClick={downloadQR}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Download QR Code
      </button>
    </div>
  );
};

export default QRGenerator;