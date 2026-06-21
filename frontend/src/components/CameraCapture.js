import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  // Initialize camera stream
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }, // or 'environment' for rear camera
          audio: false
        });
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      } catch (err) {
        setError('No se pudo acceder a la cámara. Otorga permisos en tu navegador.');
      }
    }
    startCamera();

    // Clean up stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext('2d');
      // Set canvas size matching the video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get base64 data url
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
    }
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      // Convert base64 to Blob file to send to API
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'camera_photo.jpg', { type: 'image/jpeg' });
          onCapture(file, capturedImage); // Returns file object & preview URL
        });
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px', width: '100%',
        backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
        padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Cámara Integrada</h3>
          <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>{error}</div>
        ) : (
          <div style={{ position: 'relative', width: '100%', paddingBottom: '75%', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden' }}>
            {!capturedImage ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img 
                src={capturedImage} 
                alt="Captured" 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
          {!capturedImage ? (
            <button className="btn btn-primary" onClick={takePhoto} disabled={!!error} style={{ width: '100%' }}>
              <Camera size={18} /> Tomar Foto
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={retakePhoto} style={{ flex: 1 }}>
                <RefreshCw size={18} /> Volver a tomar
              </button>
              <button className="btn btn-primary" onClick={confirmPhoto} style={{ flex: 1 }}>
                <Check size={18} /> Usar Foto
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
