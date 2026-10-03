"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, SwitchCamera, Loader2, ScanLine } from "lucide-react";

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
  /** Last result shown under the viewfinder (e.g. "Added Paracetamol"). */
  status?: { ok: boolean; text: string } | null;
}

/**
 * Continuous camera scanner for 1D barcodes (EAN-13/8, UPC, Code 128/39…)
 * and QR codes, via ZXing. Stays open so a cashier can scan item after item;
 * the same code is ignored for 1.5s so one held-up item isn't added twice.
 */
export default function BarcodeScanner({ onDetected, onClose, status }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIndex, setDeviceIndex] = useState(-1);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStarting(true);
      setError("");
      try {
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93, BarcodeFormat.ITF,
          BarcodeFormat.CODABAR, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });

        const list = await BrowserMultiFormatReader.listVideoInputDevices().catch(() => []);
        if (cancelled) return;
        setDevices(list);

        const device = deviceIndex >= 0 ? list[deviceIndex] : undefined;
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: device
            ? { deviceId: { exact: device.deviceId } }
            : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        };

        const controls = await reader.decodeFromConstraints(constraints, videoRef.current!, (result) => {
          if (!result) return;
          const code = result.getText().trim();
          const now = Date.now();
          if (!code || (code === lastRef.current.code && now - lastRef.current.at < 1500)) return;
          lastRef.current = { code, at: now };
          setFlash((f) => f + 1);
          onDetectedRef.current(code);
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (e: any) {
        if (cancelled) return;
        const name = e?.name || "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser settings and try again."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No camera found on this device. You can still use a USB/Bluetooth barcode scanner."
              : "Couldn't start the camera. Close other apps using it and try again."
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [deviceIndex]);

  const switchCamera = () => {
    if (devices.length < 2) return;
    setDeviceIndex((i) => (i + 1) % devices.length);
  };

  return (
    <div className="modal-overlay fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[3px]">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Scan barcode</h3>
              <p className="text-xs text-slate-500">Hold the barcode inside the frame — keeps scanning</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close scanner">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-slate-950">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />

          {/* Viewfinder */}
          {!error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[78%] h-[42%]">
                {["top-0 left-0 border-t-2 border-l-2 rounded-tl-md", "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
                  "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md", "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md"].map((c) => (
                  <span key={c} className={`absolute w-7 h-7 border-amber-400 ${c}`} />
                ))}
                <span className="absolute left-2 right-2 top-1/2 h-[2px] bg-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse" />
              </div>
            </div>
          )}

          {/* Green flash on each successful read */}
          {flash > 0 && (
            <div key={flash} className="absolute inset-0 bg-emerald-400/25 pointer-events-none animate-[fade-in_0.12s_ease_reverse_both]" />
          )}

          {starting && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-sm gap-2">
              <Loader2 className="w-6 h-6 animate-spin" /> Starting camera...
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-3">
              <Camera className="w-8 h-8 text-white/50" />
              <p className="text-sm text-white/80">{error}</p>
            </div>
          )}

          {devices.length > 1 && !error && (
            <button
              onClick={switchCamera}
              className="absolute bottom-3 right-3 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70"
              title="Switch camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-5 py-3 min-h-[52px] flex items-center">
          {status ? (
            <p className={`text-sm font-medium ${status.ok ? "text-emerald-600" : "text-rose-600"}`}>{status.text}</p>
          ) : (
            <p className="text-xs text-slate-400">Tip: a USB or Bluetooth scanner works on this screen without opening the camera.</p>
          )}
        </div>
      </div>
    </div>
  );
}
