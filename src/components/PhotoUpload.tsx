import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { ApiError, errorMessage, uploadImage } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useApp } from '@/state/store';
import type { PhotoSource } from '@/types/photoAnalysis';

// Decode before uploading, and shrink large phone photos to the API's 5 MB limit.
async function preparePhoto(file: File): Promise<File> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
  if (!/\.(jpe?g|png|webp)$/i.test(file.name) && !/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('Choose a JPG, PNG or WebP photo. Export HEIC photos as JPG first.');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => { throw new Error('This photo could not be opened. Try another JPG, PNG or WebP image.'); });
    if (file.size <= 5 * 1024 * 1024 && Math.max(img.width, img.height) <= 2400) return file;
    const scale = Math.min(1, 2400 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not prepare this photo. Try a smaller image.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size > 5 * 1024 * 1024) throw new Error('Please choose a smaller photo.');
    return new File([blob], 'outfit.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoUpload({ onUploaded }: { onUploaded: (url: string, source: PhotoSource) => void }) {
  const { refreshWardrobe } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const nativeCamera = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [cameraVideo, setCameraVideo] = useState<HTMLVideoElement | null>(null);
  const attachVideo = useCallback((node: HTMLVideoElement | null) => { video.current = node; setCameraVideo(node); }, []);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [canSwitch, setCanSwitch] = useState(false);
  const capturing = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [pendingSource, setPendingSource] = useState<PhotoSource>('photo');
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const pause = () => { if (document.hidden) setCameraOpen(false); };
    const leave = () => { stream.current?.getTracks().forEach(track => track.stop()); setCameraOpen(false); };
    document.addEventListener('visibilitychange', pause);
    window.addEventListener('pagehide', leave);
    return () => { document.removeEventListener('visibilitychange', pause); window.removeEventListener('pagehide', leave); };
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!cameraOpen || !cameraVideo) return;
    setReady(false);
    setCameraError('');
    capturing.current = false;
    let cancelled = false;
    const stop = () => { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; };
    const open = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Live camera is unavailable here. Open this page on localhost or HTTPS, or use your device camera below.');
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (cancelled) { media.getTracks().forEach((track) => track.stop()); return; }
        stream.current = media;
        media.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
          if (!cancelled) { setReady(false); setCameraError('Camera disconnected. Reconnect it and retry, or upload a photo.'); }
        }, { once: true }));
        cameraVideo.srcObject = media;
        await cameraVideo.play();
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) setCanSwitch(devices.filter(device => device.kind === 'videoinput').length > 1);
      } catch (err) {
        if (cancelled) return;
        stop();
        const name = err instanceof Error ? err.name : '';
        setCameraError(name === 'NotAllowedError' ? 'Camera access was blocked. Allow camera access in your browser settings, then reopen the camera, or upload a photo.' : name === 'NotFoundError' ? 'No camera was found. Connect a camera or upload a photo.' : name === 'NotReadableError' ? 'Your camera is busy. Close other apps using it, then try again.' : errorMessage(err));
      }
    };
    void open();
    return () => { cancelled = true; stop(); cameraVideo.srcObject = null; };
  }, [cameraOpen, cameraVideo, cameraAttempt, facingMode]);

  const choose = async (file?: File, source: PhotoSource = 'photo') => {
    if (!file || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setPhase('Preparing your photo…');
    setError('');
    setPending(null);
    try {
      const prepared = await preparePhoto(file);
      if (!alive.current) return;
      setPending(prepared);
      setPendingSource(source);
      setPreview(URL.createObjectURL(prepared));
      setPhase('Saving your photo to your account…');
      const url = await uploadImage(prepared, source);
      if (alive.current) { void refreshWardrobe().catch(err => toast.error('Photo saved; wardrobe refresh failed', { description: errorMessage(err) })); setPending(null); onUploaded(url, source); }
    } catch (err) {
      if (alive.current) setError(err instanceof ApiError && err.status === 401 ? 'Your session expired. Sign in again before uploading.' : errorMessage(err));
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const capture = () => {
    const el = video.current;
    if (!el || !el.videoWidth || busyRef.current || capturing.current) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(el.videoWidth, el.videoHeight));
    canvas.width = Math.max(1, Math.round(el.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(el.videoHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) { setCameraError('Could not capture this photo. Please upload an image instead.'); return; }
    capturing.current = true;
    ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
    setReady(false);
    canvas.toBlob((blob) => {
      if (!alive.current) return;
      if (!blob) { capturing.current = false; setCameraError('Could not capture this photo. Try again.'); setReady(true); return; }
      setCameraOpen(false);
      void choose(new File([blob], 'camera.jpg', { type: 'image/jpeg' }), 'camera');
    }, 'image/jpeg', 0.9);
  };
  return (
    <>
      <div className={`photo-drop mt-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-wine bg-blush/40' : 'border-charcoal/25 bg-surface'}`}
        aria-busy={busy}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void choose(e.dataTransfer.files[0]); }}>
        {preview && <img src={preview} alt="Selected outfit photo" className="mx-auto mb-5 max-h-72 object-contain" />}
        {!preview && <div className="upload-emblem mx-auto mb-5"><ImagePlus size={28} strokeWidth={1.4} /><span aria-hidden="true">✦</span></div>}
        <p className="font-display text-2xl">Your next look starts here</p>
        <p className="mt-2 text-sm text-soot">Drop a clothing photo, choose a file, or take a picture.</p>
        <p className="mt-2 text-sm text-soot">JPG, PNG or WebP · up to 20 MB · large photos resized automatically</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" disabled={busy} className="btn-stroke disabled:opacity-50" onClick={() => input.current?.click()}><ImagePlus size={16} /> Upload image</button>
          <button type="button" disabled={busy} className="btn-stroke disabled:opacity-50" onClick={() => { setReady(false); setCameraError(''); setCameraOpen(true); }}><Camera size={16} /> Use camera</button>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; void choose(file); }} />
        <input ref={nativeCamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) { setCameraOpen(false); void choose(file, 'camera'); } }} />
        {busy && <p role="status" className="mt-4 flex items-center justify-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> {phase}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-wine">{error}</p>}
        {error && pending && !busy && <button type="button" className="btn-stroke mt-3" onClick={() => void choose(pending, pendingSource)}>Retry upload</button>}
      </div>
      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto bg-ivory">
          <DialogTitle>Take an outfit photo</DialogTitle>
          <DialogDescription>Allow camera access, frame your outfit, then capture your photo.</DialogDescription>
          {ready && !cameraError && <p role="status" className="flex items-center gap-2 text-xs font-semibold text-wine"><span className="h-2 w-2 rounded-full bg-green-700" /> Live camera · frame your clothing clearly</p>}
          <video ref={attachVideo} autoPlay muted playsInline onLoadedData={() => setReady(true)} onPlaying={() => setReady(true)} className="max-h-[55vh] w-full rounded bg-panel" />
          {cameraError ? <p role="alert" className="text-sm text-wine">{cameraError}</p> : !ready && <p role="status">Waiting for camera…</p>}
          {cameraError && <button type="button" className="text-sm font-semibold text-wine underline" onClick={() => setCameraAttempt(n => n + 1)}>Retry camera</button>}
          {canSwitch && <button type="button" disabled={!ready || !!cameraError} className="btn-stroke justify-center disabled:opacity-50" onClick={() => { setReady(false); setFacingMode(mode => mode === 'environment' ? 'user' : 'environment'); }}>Switch front / back camera</button>}
          <button type="button" disabled={!ready || !!cameraError} className="btn-solid justify-center disabled:opacity-50" onClick={capture}>Capture photo</button>
          <button type="button" className="btn-stroke justify-center" onClick={() => nativeCamera.current?.click()}>Open device camera</button>
        </DialogContent>
      </Dialog>
    </>
  );
}
