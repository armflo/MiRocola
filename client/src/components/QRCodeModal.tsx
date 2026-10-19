import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Check, Share2, Smartphone } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomName: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  roomName
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Generate invite URL
  const inviteUrl = `${window.location.origin}?code=${roomCode}`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(inviteUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#020617'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [isOpen, inviteUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-purple-800/60 rounded-2xl p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center mx-auto mb-3 text-pink-400">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-white">Escanea para Unirte</h3>
        <p className="text-xs text-slate-400 mt-1 truncate px-2">{roomName}</p>

        {/* QR Code Canvas */}
        <div className="my-5 p-3 rounded-2xl bg-slate-950 border border-purple-900/40 inline-block shadow-inner">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Código QR de la sala"
              className="w-52 h-52 mx-auto rounded-xl"
            />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-slate-500 text-xs">
              Generando QR...
            </div>
          )}
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <Smartphone className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-xs text-slate-400">Código de Sala:</span>
          <span className="font-mono font-bold text-pink-400 text-sm tracking-wider">
            {roomCode}
          </span>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-slate-950 hover:bg-purple-950/50 border border-purple-800/50 hover:border-pink-500/60 flex items-center justify-center gap-2 transition-all cursor-pointer group"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">¡Enlace Copiado al Portapapeles!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-slate-400 group-hover:text-pink-400" />
              <span>Copiar Enlace Directo para Amigos</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
