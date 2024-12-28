import React, { useEffect, useRef } from 'react';

const QRCodeDisplay = ({ data, size = 256 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const generateQR = () => {
      // Get QrCode from window object after script loads
      const { QrCode } = window;
      if (!QrCode) {
        console.error('QR Code library not loaded');
        return;
      }

      try {
        // Generate QR Code
        const qr = QrCode.encodeText(data, QrCode.Ecc.MEDIUM);
        
        // Draw on canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const scale = size / qr.size;
        
        // Clear canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        
        // Draw each module
        ctx.fillStyle = '#000000';
        for (let y = 0; y < qr.size; y++) {
          for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y)) {
              ctx.fillRect(x * scale, y * scale, scale, scale);
            }
          }
        }
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    // Generate QR code when data changes
    if (window.QrCode) {
      generateQR();
    } else {
      // If library isn't loaded yet, wait for it
      window.addEventListener('QrCodeLoaded', generateQR);
      return () => window.removeEventListener('QrCodeLoaded', generateQR);
    }
  }, [data, size]);

  const downloadQR = () => {
    const canvas = canvasRef.current;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'product-qr.png';
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
        className="border border-gray-200 rounded-lg"
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

export default QRCodeDisplay;