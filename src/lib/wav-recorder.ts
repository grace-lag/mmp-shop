/**
 * Cross-platform voice recorder that encodes WAV (PCM 16-bit).
 * WAV plays natively on iOS Safari, unlike webm/opus produced by MediaRecorder.
 */
export class WavRecorder {
  private ctx: AudioContext;
  private source: MediaStreamAudioSourceNode;
  private processor: ScriptProcessorNode;
  private buffers: Float32Array[] = [];
  private stream: MediaStream;
  private sampleRate: number;

  constructor(stream: MediaStream) {
    this.stream = stream;
    const AC: typeof AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AC();
    this.sampleRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const ch = e.inputBuffer.getChannelData(0);
      this.buffers.push(new Float32Array(ch));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
  }

  static async start(): Promise<WavRecorder> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new WavRecorder(stream);
  }

  cancel() {
    try { this.processor.disconnect(); } catch { /* noop */ }
    try { this.source.disconnect(); } catch { /* noop */ }
    this.stream.getTracks().forEach((t) => t.stop());
    this.ctx.close().catch(() => { /* noop */ });
    this.buffers = [];
  }

  stop(): Blob {
    try { this.processor.disconnect(); } catch { /* noop */ }
    try { this.source.disconnect(); } catch { /* noop */ }
    this.stream.getTracks().forEach((t) => t.stop());
    const length = this.buffers.reduce((s, b) => s + b.length, 0);
    const merged = new Float32Array(length);
    let off = 0;
    for (const b of this.buffers) { merged.set(b, off); off += b.length; }
    const blob = encodeWav(merged, this.sampleRate);
    this.ctx.close().catch(() => { /* noop */ });
    this.buffers = [];
    return blob;
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}
