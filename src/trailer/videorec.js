// videorec.js (from TheLostsTB) — the trailer recorder: WebCodecs (H.264 + AAC) muxed into a plain, seekable MP4 with
// mp4-muxer, instead of MediaRecorder. MediaRecorder writes streaming files (no index, odd timestamps,
// gaps where it was paused) that Windows players stumble over and re-encoders shift by seconds; here every
// video frame gets its timestamp from a recording clock that only runs while recording (constant frame
// rate, no gaps), and the audio is re-stamped by its own sample count, so both tracks start at zero and
// stay together.
import { Muxer, ArrayBufferTarget } from '../vendor/mp4-muxer.js';

// H.264 first (plays everywhere); VP9 in MP4 only when the browser has no H.264 encoder
const VIDEO_CODECS = ['avc1.640034', 'avc1.640033', 'avc1.640032', 'avc1.640028', 'avc1.4d0033', 'avc1.4d0028', 'avc1.42003e', 'vp09.00.41.08'];

export class CodecRecorder {
	static available() {
		return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window && 'AudioEncoder' in window;
	}

	/** -> a started recorder, or null when this browser cannot encode H.264 at this size. */
	static async create(canvas, { fps = 60, mbps = 80, audioCtx = null, audioNode = null } = {}) {
		if (!CodecRecorder.available()) return null;
		const W = canvas.width, H = canvas.height;
		let vcfg = null;
		for (const codec of VIDEO_CODECS) {
			// constant bitrate first: hardware encoders in 'variable' mode often land far under the asked rate
			for (const [hw, mode] of [['prefer-hardware', 'constant'], ['prefer-hardware', 'variable'], ['no-preference', 'constant'], ['no-preference', 'variable']]) {
				const c = { codec, width: W, height: H, bitrate: Math.round(mbps * 1e6), framerate: fps, bitrateMode: mode, latencyMode: 'quality', hardwareAcceleration: hw };
				if (codec.startsWith('avc')) c.avc = { format: 'avc' };
				try { if ((await VideoEncoder.isConfigSupported(c)).supported) { vcfg = c; break; } } catch (_) { /* next */ }
			}
			if (vcfg) break;
		}
		if (!vcfg) return null;
		let acfg = null;
		const rate = audioCtx ? audioCtx.sampleRate : 48000;
		if (audioCtx && audioNode && audioCtx.audioWorklet) {
			for (const codec of ['mp4a.40.2', 'opus']) {
				const c = { codec, sampleRate: rate, numberOfChannels: 2, bitrate: 256000 };
				try { if ((await AudioEncoder.isConfigSupported(c)).supported) { acfg = c; break; } } catch (_) { /* next */ }
			}
		}
		const r = new CodecRecorder(canvas, vcfg, acfg, fps, audioCtx, audioNode);
		await r.audioReady;
		return r;
	}

	constructor(canvas, vcfg, acfg, fps, audioCtx, audioNode) {
		this.canvas = canvas; this.fps = fps; this.vcfg = vcfg; this.acfg = acfg;
		this.muxer = new Muxer({
			target: new ArrayBufferTarget(),
			video: { codec: vcfg.codec.startsWith('avc') ? 'avc' : 'vp9', width: vcfg.width, height: vcfg.height, frameRate: fps },
			audio: acfg ? { codec: acfg.codec === 'opus' ? 'opus' : 'aac', numberOfChannels: 2, sampleRate: acfg.sampleRate } : undefined,
			fastStart: 'in-memory',                 // the index up front: plays and seeks everywhere
			firstTimestampBehavior: 'offset',
		});
		this.error = null;
		this.venc = new VideoEncoder({ output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta), error: (e) => { this.error = e; console.error('video encoder', e); } });
		this.venc.configure(vcfg);
		this.clock = 0; this.last = performance.now(); this.n = 0; this.paused = false;
		this.mime = 'video/mp4; codecs=' + vcfg.codec + (acfg ? ',' + acfg.codec : '');
		this.audioReady = acfg ? this.startAudio(audioCtx, audioNode).catch((e) => { console.warn('trailer: no audio track', e); }) : Promise.resolve();
	}

	/** Audio comes straight off the mix in an AudioWorklet (posted to this thread in blocks: nothing is
	 * dropped when the page is busy), stamped by sample count. The worklet only runs while the audio
	 * context does, so the pauses (context suspended) leave no gap. */
	async startAudio(ctx, node) {
		this.aenc = new AudioEncoder({ output: (chunk, meta) => this.muxer.addAudioChunk(chunk, meta), error: (e) => { console.error('audio encoder', e); } });
		this.aenc.configure(this.acfg);
		this.samples = 0; this.rate = ctx.sampleRate;
		const src = `class Tap extends AudioWorkletProcessor {
			constructor() { super(); this.n = 0; this.L = new Float32Array(1024); this.R = new Float32Array(1024); this.port.onmessage = (e) => { if (e.data === 'flush') this.flush(); }; }
			flush() { if (!this.n) return; this.port.postMessage([this.L.slice(0, this.n), this.R.slice(0, this.n)]); this.n = 0; }
			process(inputs) {
				const i = inputs[0]; if (!i || !i.length) return true;
				const l = i[0], r = i[1] || i[0];
				for (let k = 0; k < l.length; k++) { this.L[this.n] = l[k]; this.R[this.n] = r[k]; if (++this.n === 1024) this.flush(); }
				return true;
			}
		}
		registerProcessor('deeplink-tap', Tap);`;
		const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
		await ctx.audioWorklet.addModule(url);
		URL.revokeObjectURL(url);
		this.tap = new AudioWorkletNode(ctx, 'deeplink-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
		this.sink = ctx.createGain(); this.sink.gain.value = 0;          // keeps the tap pulled without adding to the mix
		this.node = node; node.connect(this.tap); this.tap.connect(this.sink); this.sink.connect(ctx.destination);
		this.tap.port.onmessage = (e) => {
			if (this.stopped || this.paused) return;           // what plays around a pause is off the record
			const [L, R] = e.data, n = L.length;
			const data = new Float32Array(n * 2); data.set(L, 0); data.set(R, n);
			const ad = new AudioData({ format: 'f32-planar', sampleRate: this.rate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(this.samples / this.rate * 1e6), data });
			this.samples += n;
			try { if (this.aenc.state === 'configured') this.aenc.encode(ad); } catch (err) { console.warn('audio frame', err); }
			ad.close();
		};
	}

	/** Off the record: the clock stops, nothing is captured. */
	pause(on) {
		const now = performance.now();
		if (on) { if (!this.paused && this.last !== null) this.clock += (now - this.last) / 1000; this.last = null; }
		else if (this.paused) this.last = now;            // the clock runs again from this very moment, like the audio
		this.paused = on;
	}

	/** Called after every drawn stage frame: emits the constant-rate frames the elapsed recording time calls for. */
	capture(now = performance.now()) {
		if (this.paused || this.stopping || this.error || this.venc.state !== 'configured') return;
		// the audio is the master clock: a frame is due for every 1/fps of sound recorded, so the two tracks can
		// never drift apart (and nothing advances while the sound is stopped); without audio, real time
		if (this.tap) this.clock = this.samples / this.rate;
		else if (this.last !== null) this.clock += (now - this.last) / 1000;
		this.last = now;
		const due = Math.floor(this.clock * this.fps);
		let k = 0;
		while (this.n <= due && k < 4) {
			if (this.venc.encodeQueueSize > 12) break;            // the encoder is behind: skip ahead (repeats the last image later)
			const vf = new VideoFrame(this.canvas, { timestamp: Math.round(this.n * 1e6 / this.fps), duration: Math.round(1e6 / this.fps) });
			this.venc.encode(vf, { keyFrame: this.n % (this.fps * 2) === 0 });
			vf.close();
			this.n++; k++;
		}
		if (this.n <= due - 4) this.n = due;                     // never fall further and further behind
	}

	/** -> Blob (video/mp4) */
	async stop() {
		this.capture();                                       // the video runs up to the last sound
		this.stopping = true; this.stopped = true;           // both tracks end now (the flushes below can take a while)
		try { await this.venc.flush(); } catch (e) { console.error(e); }
		if (this.tap) {
			try { this.node.disconnect(this.tap); this.tap.disconnect(); this.sink.disconnect(); } catch (_) { /* gone */ }
			try { await this.aenc.flush(); } catch (e) { console.error(e); }
		}
		this.muxer.finalize();
		try { this.venc.close(); } catch (_) { /* closed */ }
		try { this.aenc && this.aenc.close(); } catch (_) { /* closed */ }
		return new Blob([this.muxer.target.buffer], { type: 'video/mp4' });
	}
}
