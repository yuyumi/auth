import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, SwitchCamera } from 'lucide-react';
import QrScanner from 'qr-scanner';

const QRScannerPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const startScanner = async () => {
    try {
      if (!videoRef.current) return;
      setError('');

      scannerRef.current = new QrScanner(
        videoRef.current,
        result => {
          try {
            handleSuccessfulScan(result.data);
          } catch (e) {
            setError('Invalid QR code format');
          }
        },
        {
          preferredCamera: facingMode,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
        }
      );

      await scannerRef.current.start();
      setIsScanning(true);
    } catch (err) {
      setError('Error accessing camera. Please ensure camera permissions are granted.');
    }
  };

  const handleSuccessfulScan = async (data) => {
    try {
      const response = await fetch(`${API_URL}/products/${data}/public`);
      if (response.ok) {
        const productData = await response.json();
        setScannedResult(productData);
        stopScanner();
      } else {
        setError('Product not found');
      }
    } catch (err) {
      setError('Error fetching product information');
    }
  };

  const switchCamera = async () => {
    if (!scannerRef.current) return;
    await stopScanner();
    setFacingMode(current => current === 'environment' ? 'user' : 'environment');
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const resetScanner = () => {
    setScannedResult(null);
    setError('');
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (isScanning) {
      startScanner();
    }
  }, [facingMode]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">QR Code Scanner</h1>
        
        {error && (
          <div className="mb-4 p-4 rounded bg-red-100 text-red-700">
            {error}
          </div>
        )}

        {!scannedResult ? (
          <div className="space-y-4">
            <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white rounded-lg opacity-50"></div>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              {!isScanning ? (
                <button
                  onClick={startScanner}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  <Camera className="w-5 h-5" />
                  Start Scanner
                </button>
              ) : (
                <>
                  <button
                    onClick={stopScanner}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    <X className="w-5 h-5" />
                    Stop
                  </button>
                  <button
                    onClick={switchCamera}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    <SwitchCamera className="w-5 h-5" />
                    Switch Camera
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="text-xl font-bold mb-4">Product Information</h2>
              <p><strong>Product ID:</strong> {scannedResult.productId}</p>
              <p><strong>Item ID:</strong> {scannedResult.itemId}</p>
              <p><strong>Current Owner:</strong> {scannedResult.currentOwner}</p>
            </div>
            
            <button
              onClick={resetScanner}
              className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
            >
              Scan Another Code
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-blue-500 hover:text-blue-600"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default QRScannerPage;