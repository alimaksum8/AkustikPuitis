/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Activity, 
  Terminal,
  CheckCircle2,
  Music,
  Copy,
  Check,
  ChevronRight,
  Info,
  Volume2,
  Wind,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface SongResult {
  judul: string;
  style_prompt_combined: string;
  lirik: string;
  arrangement_notes: string;
  mixing_mastering_guide: string;
  chord_map: string;
}

// Database of acoustic guitar chord frequencies
const CHORD_FREQS: Record<string, number[]> = {
  'G': [98.00, 146.83, 196.00, 246.94, 293.66, 392.00], // G2, D3, G3, B3, D4, G4
  'C': [130.81, 164.81, 196.00, 261.63, 329.63, 523.25], // C3, E3, G3, C4, E4, C5
  'D': [146.83, 220.00, 293.66, 369.99, 440.00, 587.33], // D3, A3, D4, F#4, A4, D5
  'Em': [82.41, 131.81, 164.81, 196.00, 246.94, 329.63], // E2, E3, G3, B3, E4
  'Am': [110.00, 164.81, 220.00, 261.63, 329.63, 440.00], // A2, E3, A3, C4, E4
  'F': [87.31, 130.81, 174.61, 220.00, 261.63, 349.23], // F2, C3, F3, A3, C4
  'Dm': [146.83, 220.00, 293.66, 349.23, 440.00], // D3, A3, D4, F4, A4
  'A': [110.00, 164.81, 220.00, 277.18, 329.63, 440.00], // A2, E3, A3, C#4, E4
  'E': [82.41, 164.81, 220.00, 329.63, 415.30], // E2, E3, G#3, B3, E4
  'Bm': [123.47, 185.00, 246.94, 293.66, 369.99], // B2, F#3, B3, D4, F#4
};

const cleanChord = (raw: string): string => {
  let c = raw.trim();
  if (c.includes('/')) c = c.split('/')[0];
  if (c.startsWith('C')) return c.includes('m') && !c.includes('maj') ? 'Dm' : 'C';
  if (c.startsWith('G')) return c.includes('m') ? 'Gm' : 'G';
  if (c.startsWith('D')) return c.includes('m') ? 'Dm' : 'D';
  if (c.startsWith('A')) return c.includes('m') ? 'Am' : 'A';
  if (c.startsWith('E')) return c.includes('m') ? 'Em' : 'E';
  if (c.startsWith('F')) return c.includes('m') ? 'Fm' : 'F';
  if (c.startsWith('B')) return c.includes('m') ? 'Bm' : 'Bm';
  return 'G';
};

const parseChords = (chordMapStr: string): string[] => {
  if (!chordMapStr) return ['G', 'Em', 'C', 'D'];
  const matches = chordMapStr.match(/[A-G][a-zA-Z0-9#]*/g);
  if (!matches || matches.length === 0) return ['G', 'Em', 'C', 'D'];
  return matches.map(cleanChord);
};

const INDO_CREATORS = [
  {
    id: 'none',
    name: 'Asli Studio',
    tagline: 'Akustik Sederhana',
    description: 'Bahasa mengalir indah, sederhana, jujur, mudah dipahami, dan penuh makna mendalam.',
    promptInstruction: `PENTING - GAYA ASLI STUDIO: Gunakan bahasa sehari-hari yang tulus, jujur, mengalir indah, sederhana, dan mudah dicerna oleh siapa saja. Fokus pada kedalaman rasa dan pesan kehidupan yang jernih, hindari istilah puitis yang terlalu abstrak atau sulit dipahami.`
  },
  {
    id: 'ebiet_g_ade',
    name: 'Ebiet G. Ade',
    tagline: 'Balada Sastra Alam',
    description: 'Sastra Indonesia baku, metafora alam (hujan, cemara, rumput), kontemplasi spiritual yang agung.',
    promptInstruction: `PENTING - GAYA BAHASA EBIET G. ADE: Lirik WAJIB menggunakan Bahasa Indonesia baku yang sangat sastrawi, puitis, agung, dan elegan. Gunakan metafora alam yang kental (seperti desah angin, cemara, padang rumput, ombak, tanah kering, hujan) dan tema perenungan spiritual, moralitas, ketuhanan, serta kisah manusia yang penuh introspeksi.`
  },
  {
    id: 'fiersa_besari',
    name: 'Fiersa Besari',
    tagline: 'Indie Folk Petualang',
    description: 'Romantis kontemporer, senja, kopi, gunung, perjalanan, bahasa puitis namun lugas & relatable.',
    promptInstruction: `PENTING - GAYA BAHASA FIERSA BESARI: Lirik WAJIB menggunakan gaya indie-folk kontemporer Indonesia yang hangat, jujur, melankolis, dan relatable. Gunakan diksi khas seperti 'senja', 'kopi', 'perjalanan', 'gunung', 'langit', 'arah', 'pulang'. Kalimat-kalimat puitis yang lugas, menceritakan cinta, perpisahan, atau petualangan anak muda masa kini.`
  },
  {
    id: 'iwan_fals',
    name: 'Iwan Fals',
    tagline: 'Balada Rakyat Bersahaja',
    description: 'Bahasa lugas, jujur, menggunakan analogi sehari-hari rakyat jelata, bersahaja & berkarakter kuat.',
    promptInstruction: `PENTING - GAYA BAHASA IWAN FALS: Lirik WAJIB menggunakan gaya folk balada legendaris yang bersahaja, lugas, jujur, dan berkarakter kuat. Gunakan analogi kehidupan rakyat jelata sehari-hari, bahasa yang membumi namun memiliki kedalaman rasa, terkadang menyelipkan kritik atau cinta keluarga yang murni.`
  },
  {
    id: 'alip_ba_ta',
    name: 'Alip Ba Ta',
    tagline: 'Meditatif Spiritual Sunyi',
    description: 'Sangat mistis, minim lirik, gumaman magis (hums/chants), mengandalkan atmosfer kesunyian.',
    promptInstruction: `PENTING - GAYA BAHASA ALIP BA TA: Gaya instrumental mistis dan spiritual. Lirik harus sangat minim, mengandalkan gumaman mistis dan chants/hums vokal yang meliuk syahdu (seperti "oooh", "aaah", "hmmm") yang mengelilingi kata-kata puitis sederhana tentang alam semesta, kesunyian malam, raga, dan kedamaian batin.`
  },
  {
    id: 'jubing_kristianto',
    name: 'Jubing Kristianto',
    tagline: 'Klasik Nusantara Nostalgik',
    description: 'Melodi indah meliuk-liuk, lirik bertema nina bobo, dongeng anak tradisional yang anggun.',
    promptInstruction: `PENTING - GAYA BAHASA JUBING KRISTIANTO: Gaya klasik-nostalgik nusantara yang tenang. Liriknya bernuansa dongeng tradisional, nina bobo anak yang anggun, melodi meliuk indah yang riang namun menenangkan hati, dengan diksi yang lembut, jernih, penuh kehangatan masa kecil.`
  }
];

const App = () => {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Indie Folk');
  const [key, setKey] = useState('G Major (Standard)');
  const [mood, setMood] = useState<string[]>([]);
  const [emotion, setEmotion] = useState<string[]>([]);
  const [intro, setIntro] = useState<string[]>([]);
  const [instrument, setInstrument] = useState<string[]>([]);
  const [musicEffect, setMusicEffect] = useState<string[]>([]);
  const [vocalStyle, setVocalStyle] = useState<string[]>([]);
  const [vocalEffect, setVocalEffect] = useState<string[]>([]);
  const [tempo, setTempo] = useState('60-80');
  const [duration, setDuration] = useState(4);
  const [isOriginal, setIsOriginal] = useState(false);
  const [creator, setCreator] = useState('none');
  const [result, setResult] = useState<SongResult | null>(null);
  const [history, setHistory] = useState<SongResult[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('akustik_history') : null;
    return saved ? JSON.parse(saved) : [];
  });
  const [copiedLirik, setCopiedLirik] = useState(false);
  const [copiedProps, setCopiedProps] = useState(false);

  // Audio Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(16).fill(4));

  const currentTimeRef = useRef(0);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const schedulerTimerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateCurrentTime = (time: number) => {
    setCurrentTime(time);
    currentTimeRef.current = time;
  };

  const createAudioChain = (ctx: AudioContext) => {
    const input = ctx.createGain();
    const delay = ctx.createDelay(1.0);
    const delayFeedback = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const output = ctx.createGain();

    delay.delayTime.setValueAtTime(0.35, ctx.currentTime);
    delayFeedback.gain.setValueAtTime(0.32, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    input.connect(delay);
    delay.connect(filter);
    filter.connect(delayFeedback);
    delayFeedback.connect(delay);

    input.connect(output);
    delay.connect(output);
    
    return { input, output };
  };

  const playGuitarPluck = (ctx: AudioContext, destination: AudioNode, freq: number, time: number) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const biquadFilter = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);

    biquadFilter.type = 'lowpass';
    biquadFilter.frequency.setValueAtTime(2000, time);
    biquadFilter.frequency.exponentialRampToValueAtTime(150, time + 0.8);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.25, time + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);

    osc1.connect(biquadFilter);
    osc2.connect(biquadFilter);
    biquadFilter.connect(gainNode);
    gainNode.connect(destination);

    osc1.start(time);
    osc1.stop(time + 1.8);
    osc2.start(time);
    osc2.stop(time + 1.8);

    // Pick noise transient
    const noiseLength = ctx.sampleRate * 0.01;
    const buffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(3000, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.01);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    noiseSource.start(time);
    noiseSource.stop(time + 0.012);
  };

  const stopAudio = () => {
    setIsPlaying(false);
    
    if (schedulerTimerRef.current) {
      clearTimeout(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setVisualizerData(new Array(16).fill(4));
  };

  const startAudio = () => {
    if (isPlaying) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    setIsPlaying(true);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;

    const effectChain = createAudioChain(ctx);
    effectChain.output.connect(analyser);
    analyser.connect(ctx.destination);

    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    
    const chordProgression = result ? parseChords(result.chord_map) : ['G', 'Em', 'C', 'D'];
    const parsedTempo = parseInt(tempo.split('-')[0]) || 70;
    const eighthNoteDuration = 60 / parsedTempo / 2;

    let currentSubBeat = Math.floor((currentTimeRef.current / eighthNoteDuration) % 8);
    let currentChordIdx = Math.floor((currentTimeRef.current / (eighthNoteDuration * 8)) % chordProgression.length);

    const scheduleAheadTime = 0.12;
    const lookahead = 25.0;

    const scheduleNextNote = () => {
      while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        const chordName = chordProgression[currentChordIdx];
        const notes = CHORD_FREQS[chordName] || CHORD_FREQS['G'];

        let noteFreq = notes[0];
        switch (currentSubBeat) {
          case 0: noteFreq = notes[0]; break;
          case 1: noteFreq = notes[2] || notes[1]; break;
          case 2: noteFreq = notes[4] || notes[3]; break;
          case 3: noteFreq = notes[3] || notes[2]; break;
          case 4: noteFreq = notes[1] || notes[0]; break;
          case 5: noteFreq = notes[5] || notes[4]; break;
          case 6: noteFreq = notes[3] || notes[2]; break;
          case 7: noteFreq = notes[4] || notes[3]; break;
        }

        const humanDelay = (Math.random() - 0.5) * 0.01;
        playGuitarPluck(ctx, effectChain.input, noteFreq, nextNoteTimeRef.current + humanDelay);

        nextNoteTimeRef.current += eighthNoteDuration;
        currentSubBeat = (currentSubBeat + 1) % 8;
        if (currentSubBeat === 0) {
          currentChordIdx = (currentChordIdx + 1) % chordProgression.length;
        }
      }
    };

    const scheduler = () => {
      scheduleNextNote();
      schedulerTimerRef.current = window.setTimeout(scheduler, lookahead);
    };
    scheduler();

    const startTime = ctx.currentTime - currentTimeRef.current;
    const updateProgress = () => {
      const elapsed = ctx.currentTime - startTime;
      const targetTotal = duration * 60;
      
      if (elapsed >= targetTotal) {
        stopAudio();
        updateCurrentTime(targetTotal);
      } else {
        updateCurrentTime(elapsed);
        playTimerRef.current = setTimeout(updateProgress, 100);
      }
    };
    updateProgress();

    const updateVisuals = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const scaled = Array.from(dataArray.slice(0, 16)).map(val => {
          return Math.max(4, (val / 255) * 40);
        });
        setVisualizerData(scaled);
      }
      animationFrameRef.current = requestAnimationFrame(updateVisuals);
    };
    updateVisuals();
  };

  const seekTo = (seconds: number) => {
    const wasPlaying = isPlaying;
    stopAudio();
    updateCurrentTime(seconds);
    
    if (wasPlaying) {
      setTimeout(() => {
        startAudio();
      }, 50);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  React.useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const options = {
    genres: [
      'Indie Folk', 'Contemporary Acoustic', 'Acoustic Blues', 'Fingerstyle Solo', 
      'Soft Pop Acoustic', 'Country Folk', 'Bossa Nova', 'Flamenco Fusion', 
      'Americana', 'Acoustic Soul', 'Celtic Folk', 'Ethereal Acoustic'
    ],
    keys: [
      'G Major (Standard)', 'C Major (Pure)', 'D Major (Bright)', 'A Major (Warm)', 
      'E Major (Deep)', 'A Minor (Sad)', 'E Minor (Dark)', 'D Minor (Melancholy)', 
      'Open D Tuning', 'DADGAD Tuning', 'Drop D Acoustic'
    ],
    moods: [
      'Nostalgik', 'Sepi', 'Hangat', 'Gelisah', 'Misterius', 'Romantis', 
      'Damai', 'Berdebu', 'Pagi yang Dingin', 'Senja Keemasan', 'Hutan Hujan', 'Urban Acoustic',
      'Api Unggun', 'Nongkrong', 'Warkop'
    ],
    emotions: [
      'Rindu', 'Penyesalan', 'Harapan', 'Patah Hati', 'Kagum', 'Sendiri', 
      'Kehilangan', 'Ketabahan', 'Cinta Tak Terucap', 'Kebebasan', 'Kerapuhan'
    ],
    intros: [
      'Travis Picking', 'Artificial Harmonics', 'Percussive Slap', 'Slow Arpeggio', 
      'Strumming Muted', 'Melodic Single Line', 'Descending Bassline', 'Hammer-on Riff'
    ],
    instruments: [
      'Steel String Acoustic', 'Nylon String (Classical)', '12-String Acoustic', 
      'Parlor Guitar', 'Resonator Guitar', 'Baritone Acoustic', 'Acoustic Bass',
      'Akustik Persekusi', 'Gitar Lead', 'Grand Piano'
    ],
    musicEffects: [
      'Natural Reverb', 'Tape Echo', 'Subtle Chorus', 'Woody Resonance', 
      'Vinyl Crackle', 'Room Ambience', 'Slapback Delay', 'Double Tracking'
    ],
    vocals: [
      'Vokal Laki-laki', 'Vokal Perempuan', 'Vokal Menyanyi', 'Irama', 'Chanting', 
      'Whispering', 'Husky Tone', 'Falsetto Airy', 'Baritone Deep', 'Breathy Vocal', 'Raw & Unfiltered'
    ],
    vocalEffects: [
      'Warm Compression', 'Hall Reverb', 'Vintage Tube Saturation', 'Lo-fi Filter', 
      'Parallel Compression', 'De-esser Natural', 'Soft Doubling'
    ],
    tempos: ['40-60', '60-80', '80-100', '100-120', '120-140'],
    durations: [4, 5, 6, 7, 8]
  };

  const toggleMultiSelect = (item: string, state: string[], setState: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (state.includes(item)) {
      setState(state.filter(i => i !== item));
    } else {
      setState([...state, item]);
    }
  };

  const copyToClipboard = async (text: string, type: 'lirik' | 'props') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'lirik') {
        setCopiedLirik(true);
        setTimeout(() => setCopiedLirik(false), 2000);
      } else {
        setCopiedProps(true);
        setTimeout(() => setCopiedProps(false), 2000);
      }
    } catch (err) {
      // Fallback for older browsers or restricted iframes
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      
      if (type === 'lirik') {
        setCopiedLirik(true);
        setTimeout(() => setCopiedLirik(false), 2000);
      } else {
        setCopiedProps(true);
        setTimeout(() => setCopiedProps(false), 2000);
      }
    }
  };

  const generateSong = async () => {
    if (!description) return;
    stopAudio();
    updateCurrentTime(0);
    setLoading(true);
    setResult(null);
    
    const activeCreator = INDO_CREATORS.find(c => c.id === creator);
    const creatorInstruction = activeCreator && activeCreator.promptInstruction ? activeCreator.promptInstruction : '';

    const systemPrompt = `Anda adalah Produser Musik Akustik Kelas Dunia & Penulis Lirik Lagu yang Jujur dan Sederhana.
    TUGAS: Ciptakan paket produksi lagu akustik profesional yang mendalam.
    
    PANDUAN KHUSUS PRODUKSI:
    - TANPA NAMA TOKOH/ARTIS: DILARANG KERAS menyebutkan atau mencantumkan nama artis, nama penyanyi, nama pencipta lagu, atau nama orang nyata/tokoh siapapun di dalam judul, lirik, chord, ataupun catatan aransemen/mixing. Hasil lagu harus bersifat universal tanpa referensi nama tokoh/individu.
    - LIRIK: GAYA BAHASA HARUS SEDERHANA, mengalir indah, penuh makna, dan mudah dipahami. JANGAN menggunakan bahasa puitis yang rumit, metafora yang terlalu abstrak, atau diksi sastra kuno/berat yang sulit dimengerti. Gunakan bahasa sehari-hari yang tulus namun tetap menyentuh hati, serta memiliki PESAN atau AMANAT yang jelas tersampaikan kepada pendengar. Lagu harus memiliki struktur lagu yang jelas (Intro, Verse, Chorus, Bridge, Outro).
    - MAKSIMAL KARAKTER: Seluruh teks hasil lirik dan chord pada field \`lirik\` harus ringkas, padat, puitis, dan SANGAT PENTING: tidak boleh melebihi 5400 karakter.
    - DURASI: Pastikan panjang lagu dan jumlah baris lirik sesuai dengan target durasi ${duration} menit yang diminta.
    - INSTRUKSI TEKNIS LIRIK: SETIAP TAG struktur (misal: [Intro], [Verse 1], [Chorus]) WAJIB diikuti instruksi teknis dalam kurung di baris yang sama. 
      Contoh: [Intro] (Tempo: 65 BPM, Travis Picking, Low Intensity).
    - INSTRUKSI CHORD & EKSPRESI: Setiap baris lirik WAJIB mencantumkan chord di dalam kurung di awal baris, dan instruksi ekspresi di dalam kurung di akhir baris. 
      Contoh: "(Gadd9) Malam mulai mendingin (vokal berbisik, lembut)".
    - ARRANGEMENT: Berikan catatan teknis untuk setiap bagian di field arrangement_notes.
    - MIXING/MASTERING: Berikan panduan teknis untuk sound engineer di field mixing_mastering_guide.
    - TEMPO: Harus spesifik dalam rentang ${tempo} BPM.

    ${creatorInstruction}

    ${isOriginal ? 
      `MODE ORIGINAL AKTIF: Fokus utama adalah mempertahankan SETIAP KATA dari deskripsi user jika itu berupa lirik. Jangan mengubah metafora atau pilihan kata asli user.` : 
      `PROTEKSI HAK CIPTA (PENTING):
      - Jika Deskripsi Cerita terdeteksi mengandung referensi karya berhak cipta, Anda WAJIB mengubah minimal 1 kata kunci di setiap baris lirik agar menjadi karya orisinal yang baru.`};`;

    const userQuery = `
      PRODUKSI REQUEST:
      Cerita: ${description}
      Genre: ${genre}
      Tuning: ${key}
      Mood/Vibe: ${mood.join(', ')}
      Emosi: ${emotion.join(', ')}
      Intro: ${intro.join(', ')}
      Instrumen: ${instrument.join(', ')}
      FX Musik: ${musicEffect.join(', ')}
      Vokal: ${vocalStyle.join(', ')}
      FX Vokal: ${vocalEffect.join(', ')}
      Tempo: ${tempo} BPM
      Target Durasi: ${duration} Menit
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userQuery,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              judul: { type: Type.STRING },
              style_prompt_combined: { type: Type.STRING },
              lirik: { type: Type.STRING },
              arrangement_notes: { type: Type.STRING },
              mixing_mastering_guide: { type: Type.STRING },
              chord_map: { type: Type.STRING }
            },
            required: ["judul", "style_prompt_combined", "lirik", "arrangement_notes", "mixing_mastering_guide", "chord_map"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}') as SongResult;
      
      // Ensure strict adherence to 5400 character limit defensively
      if (data && data.lirik) {
        data.lirik = data.lirik.slice(0, 5400);
      }

      setResult(data);
      
      setHistory(prev => {
        const newHistory = [data, ...prev.slice(0, 9)];
        localStorage.setItem('akustik_history', JSON.stringify(newHistory));
        return newHistory;
      });
    } catch (error) {
      console.error("Error generating song:", error);
      alert("Terjadi kesalahan saat menghubungi Gemini API. Pastikan API Key sudah terpasang dengan benar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050a18] text-purple-50 font-sans selection:bg-purple-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-16 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-4 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm"
          >
            <Music className="w-8 h-8 text-purple-400" />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-serif font-black text-white tracking-tighter mb-4"
          >
            Akustik<span className="text-purple-500">Puitis</span>
            <span className="ml-4 text-[11pt] bg-purple-600/20 text-purple-400 border border-purple-500/30 px-4 py-1.5 rounded-full align-middle tracking-[0.2em] uppercase font-bold">Studio</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-purple-400/60 text-[11pt] tracking-[0.5em] uppercase font-black mb-8"
          >
            Professional Acoustic Engine • v5.2 Stable
          </motion.p>

          <div className="flex justify-center gap-1 h-4 items-end opacity-30">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [4, 16, 8, 12, 4] }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  delay: i * 0.05,
                  ease: "easeInOut"
                }}
                className="w-1 bg-purple-500 rounded-full"
              />
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          {/* INPUT PANEL */}
          <motion.div 
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="xl:col-span-6 space-y-8"
          >
            <div className="bg-[#0f172a]/80 p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
              
              <div className="flex items-center gap-4 mb-10">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Activity size={20} className="text-purple-500" />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-widest text-white/90">Studio Configuration</h2>
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIsOriginal(!isOriginal)}
                        className={`text-[9px] uppercase font-black px-2 py-1 rounded-md border transition-all ${isOriginal ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40' : 'bg-white/5 border-white/10 text-white/20 hover:text-white/40'}`}
                      >
                        Original
                      </button>
                      <label className="text-[11pt] uppercase font-black text-purple-500 tracking-[0.2em]">Cerita & Deskripsi</label>
                    </div>
                    <Info size={12} className="text-white/20" />
                  </div>
                  <textarea 
                    className="w-full p-6 bg-gray-200 border border-white/5 rounded-3xl focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all h-40 text-gray-900 placeholder:text-gray-500 text-[11pt] leading-relaxed resize-none"
                    placeholder="Tuliskan inti cerita atau suasana yang ingin dibangun... (Contoh: Kerinduan di pelabuhan tua saat hujan reda)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[11pt] uppercase font-black text-purple-500 tracking-[0.2em] block">
                    Inspirasi Gaya Pencipta (Acoustic/Fingerstyle Indonesia)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INDO_CREATORS.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setCreator(item.id)}
                        className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden ${
                          creator === item.id
                            ? 'bg-purple-600/20 border-purple-500/60 text-white shadow-lg shadow-purple-950/40'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2 mb-1.5">
                          <span className="font-bold text-sm text-white">{item.name}</span>
                          <span className={`text-[8px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md ${creator === item.id ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40'}`}>
                            {item.tagline}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 leading-relaxed">
                          {item.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <SingleSelector label="Genre" options={options.genres} active={genre} onChange={setGenre} icon={<Volume2 size={12}/>} />
                  <SingleSelector label="Tuning / Kunci" options={options.keys} active={key} onChange={setKey} icon={<Terminal size={12}/>} />
                </div>

                <div className="space-y-8">
                  <MultiSelector label="Mood Gitar" options={options.moods} activeItems={mood} onToggle={(i) => toggleMultiSelect(i, mood, setMood)} />
                  <MultiSelector label="Emosi" options={options.emotions} activeItems={emotion} onToggle={(i) => toggleMultiSelect(i, emotion, setEmotion)} />
                  <MultiSelector label="Intro Style" options={options.intros} activeItems={intro} onToggle={(i) => toggleMultiSelect(i, intro, setIntro)} />
                  <MultiSelector label="Instrumen" options={options.instruments} activeItems={instrument} onToggle={(i) => toggleMultiSelect(i, instrument, setInstrument)} />
                  <MultiSelector label="FX Musik" options={options.musicEffects} activeItems={musicEffect} onToggle={(i) => toggleMultiSelect(i, musicEffect, setMusicEffect)} />
                  <MultiSelector label="Karakter Vokal" options={options.vocals} activeItems={vocalStyle} onToggle={(i) => toggleMultiSelect(i, vocalStyle, setVocalStyle)} />
                  <MultiSelector label="FX Vokal" options={options.vocalEffects} activeItems={vocalEffect} onToggle={(i) => toggleMultiSelect(i, vocalEffect, setVocalEffect)} />
                  
                  <div className="space-y-4">
                    <label className="text-[11pt] uppercase font-black text-purple-500 tracking-[0.2em] block">Target Tempo (BPM)</label>
                    <div className="flex flex-wrap gap-2">
                      {options.tempos.map(t => (
                        <button 
                          key={t} 
                          onClick={() => setTempo(t)} 
                          className={`px-5 py-2.5 text-[11pt] rounded-2xl border transition-all ${tempo === t ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                          {t} BPM
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11pt] uppercase font-black text-purple-500 tracking-[0.2em] block">Target Durasi (Menit)</label>
                    <div className="flex flex-wrap gap-2">
                      {options.durations.map(d => (
                        <button 
                          key={d} 
                          onClick={() => setDuration(d)} 
                          className={`px-5 py-2.5 text-[11pt] rounded-2xl border transition-all ${duration === d ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                          {d} Menit
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generateSong}
                  disabled={loading || !description}
                  className="w-full relative group overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-700 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-purple-900/20 flex items-center justify-center gap-4 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                  <span className="relative z-10">{loading ? 'Synthesizing...' : 'Generate Song'}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* OUTPUT PANEL */}
          <motion.div 
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="xl:col-span-6 space-y-8"
          >
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Production Blueprint */}
                  <div className="bg-[#0f172a]/80 p-8 rounded-[3rem] border border-purple-500/20 shadow-2xl relative group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-purple-500/20 rounded-md">
                          <Terminal size={14} className="text-purple-400" />
                        </div>
                        <span className="text-[11pt] font-black uppercase tracking-[0.2em] text-purple-400/80">Production Blueprint</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const blob = new Blob([`JUDUL: ${result.judul}\n\nPROMPT:\n${result.style_prompt_combined}\n\nLIRIK:\n${result.lirik}\n\nARANSEMEN:\n${result.arrangement_notes}\n\nMIXING:\n${result.mixing_mastering_guide}`], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${result.judul.replace(/\s+/g, '_')}_Production_Sheet.txt`;
                            a.click();
                          }}
                          className="flex items-center gap-2 text-[11pt] bg-white/5 hover:bg-indigo-500 hover:text-white px-4 py-2 rounded-full transition-all uppercase font-black tracking-widest text-white/40"
                        >
                          Download
                        </button>
                        <button 
                          onClick={() => copyToClipboard(result.style_prompt_combined, 'props')} 
                          className="flex items-center gap-2 text-[11pt] bg-white/5 hover:bg-purple-500 hover:text-white px-4 py-2 rounded-full transition-all uppercase font-black tracking-widest text-white/40"
                        >
                          {copiedProps ? <Check size={12} /> : <Copy size={12} />}
                          {copiedProps ? 'Copied' : 'Copy Props'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                        <span className="text-[10px] uppercase font-black text-purple-500 tracking-widest block mb-3">Main Chord Map</span>
                        <p className="text-purple-100 font-mono text-sm">{result.chord_map}</p>
                      </div>
                      <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                        <span className="text-[10px] uppercase font-black text-purple-500 tracking-widest block mb-3">Arrangement Notes</span>
                        <p className="text-purple-100/70 text-xs leading-relaxed">{result.arrangement_notes}</p>
                      </div>
                    </div>

                    <div className="bg-black/60 p-6 rounded-3xl border border-white/5 group-hover:border-purple-500/20 transition-colors mb-6">
                      <span className="text-[10px] uppercase font-black text-purple-500 tracking-widest block mb-3">Mixing & Mastering Guide</span>
                      <p className="text-purple-200/60 text-xs leading-relaxed italic">
                        {result.mixing_mastering_guide}
                      </p>
                    </div>

                    <div className="bg-black/60 p-6 rounded-3xl border border-white/5 group-hover:border-purple-500/20 transition-colors">
                      <span className="text-[10px] uppercase font-black text-purple-500 tracking-widest block mb-3">Style Prompt</span>
                      <pre className="whitespace-pre-wrap font-mono text-[11pt] text-purple-200/60 leading-relaxed">
                        {result.style_prompt_combined}
                      </pre>
                    </div>
                  </div>

                  {/* Lyrics Section */}
                  <div className="bg-[#0f172a]/80 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-40" />
                    
                    <header className="text-center mb-12 border-b border-white/5 pb-10">
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="inline-block mb-4"
                      >
                        <Wind className="w-6 h-6 text-purple-500/40" />
                      </motion.div>
                      <h3 className="text-4xl font-serif font-black text-white mb-6 tracking-tight">{result.judul}</h3>
                      
                      {/* Real Music Player Card */}
                      <div className="max-w-md mx-auto mb-8 bg-black/40 border border-white/5 rounded-3xl p-6 shadow-inner relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] uppercase font-black text-purple-400 tracking-[0.2em]">Real-Time Acoustic Player</span>
                          <span className="text-xs font-mono text-purple-200/50">{formatTime(currentTime)} / {formatTime(duration * 60)}</span>
                        </div>

                        {/* Visualizer bars */}
                        <div className="flex justify-center items-end gap-1 h-14 w-full px-4 py-2 bg-[#050a18]/60 rounded-2xl border border-white/5 mb-6">
                          {visualizerData.map((height, i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full"
                              style={{ height }}
                              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                            />
                          ))}
                        </div>

                        {/* Player controls & scrubber */}
                        <div className="space-y-4">
                          <input 
                            type="range" 
                            min="0" 
                            max={duration * 60} 
                            value={currentTime} 
                            onChange={(e) => seekTo(Number(e.target.value))}
                            className="w-full accent-purple-500 bg-white/10 rounded-lg appearance-none h-1 cursor-pointer transition-all hover:bg-white/20"
                          />
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/30 font-mono">Tempo: {tempo} BPM</span>
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => seekTo(0)}
                                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 transition-all hover:scale-105 active:scale-95"
                                title="Reset"
                              >
                                <RotateCcw size={16} />
                              </button>
                              <button 
                                onClick={isPlaying ? stopAudio : startAudio}
                                className="p-4 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-900/30 hover:scale-105 active:scale-95"
                              >
                                {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
                              </button>
                            </div>
                            <span className="text-xs text-white/30 font-mono">{genre}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center">
                         <button 
                          onClick={() => copyToClipboard(result.lirik, 'lirik')}
                          className="flex items-center gap-3 px-8 py-3.5 bg-purple-600 hover:bg-purple-500 rounded-full text-[11pt] font-black uppercase tracking-[0.25em] transition-all shadow-xl shadow-purple-900/40 active:scale-95"
                        >
                          {copiedLirik ? <Check size={14} /> : <Copy size={14} />}
                          {copiedLirik ? 'Tersalin' : 'Salin Lirik & Chord'}
                        </button>
                      </div>
                    </header>

                    <div className="max-h-[800px] overflow-y-auto custom-scrollbar pr-4 scroll-smooth">
                      <div className="space-y-12 pb-10">
                        {result.lirik.split('\n\n').map((section, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative group/section"
                          >
                            <pre className="whitespace-pre-wrap font-serif text-xl text-white/90 leading-[2.4]">
                              {section.split('\n').map((line, lIdx) => {
                                const isTag = line.trim().startsWith('[');
                                if (isTag) {
                                  return (
                                    <div key={lIdx} className="text-purple-400 font-sans text-sm font-black uppercase tracking-[0.2em] mb-4 mt-2 bg-purple-500/10 inline-block px-3 py-1 rounded-md border border-purple-500/20">
                                      {line}
                                    </div>
                                  );
                                }
                                return (
                                  <div key={lIdx} className="italic flex flex-wrap items-baseline">
                                    {line.split(/(\(.*?\))/g).map((part, pIdx) => {
                                      if (part.startsWith('(') && part.endsWith(')')) {
                                        const isAtStart = pIdx <= 1 && line.trim().startsWith('(');
                                        return (
                                          <span 
                                            key={pIdx} 
                                            className={`text-purple-400/60 text-sm font-sans not-italic ${isAtStart ? 'mr-3 font-black' : 'ml-3 opacity-50'}`}
                                          >
                                            {part}
                                          </span>
                                        );
                                      }
                                      return <span key={pIdx}>{part}</span>;
                                    })}
                                  </div>
                                );
                              })}
                            </pre>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[700px] flex flex-col items-center justify-center bg-white/[0.02] rounded-[3.5rem] border-2 border-dashed border-white/5 text-center p-16"
                >
                  <div className="w-24 h-24 bg-purple-500/5 rounded-full flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-ping" />
                    <Music className="text-purple-500/40" size={40} />
                  </div>
                  <h4 className="text-white/40 font-black uppercase tracking-[0.4em] text-[11pt] mb-6">Waiting for Session</h4>
                  <p className="text-white/10 text-[11pt] uppercase max-w-sm leading-loose tracking-widest">
                    Konfigurasi studio anda di sebelah kiri untuk mulai menciptakan aransemen akustik puitis yang mendalam.
                  </p>
                  <div className="mt-12 flex gap-4 opacity-20">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  </div>

                  {history.length > 0 && (
                    <div className="mt-16 w-full max-w-md">
                      <div className="flex items-center justify-between mb-6">
                        <h5 className="text-[10px] uppercase font-black text-white/20 tracking-[0.3em]">Recent Sessions</h5>
                        <button 
                          onClick={() => {
                            setHistory([]);
                            localStorage.removeItem('akustik_history');
                          }}
                          className="text-[10px] uppercase font-black text-red-500/40 hover:text-red-500 tracking-widest transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="space-y-3">
                        {history.map((h, i) => (
                          <button 
                            key={i}
                            onClick={() => setResult(h)}
                            className="w-full p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl flex items-center justify-between transition-all group"
                          >
                            <span className="text-white/40 text-sm font-serif italic">{h.judul}</span>
                            <ChevronRight size={14} className="text-white/10 group-hover:text-purple-500 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.4);
        }
      `}} />
    </div>
  );
};

const SingleSelector = ({ label, options, active, onChange, icon }: { label: string, options: string[], active: string, onChange: (v: string) => void, icon?: React.ReactNode }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      {icon && <span className="opacity-40">{icon}</span>}
      <label className="text-[11pt] uppercase font-black text-purple-500 tracking-[0.2em]">{label}</label>
    </div>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button 
          key={opt} 
          onClick={() => onChange(opt)} 
          className={`px-4 py-2 text-[11pt] rounded-xl border transition-all ${active === opt ? 'bg-purple-600/20 border-purple-500 text-purple-100 shadow-lg shadow-purple-900/20' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60 hover:bg-white/10'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const MultiSelector = ({ label, options, activeItems, onToggle }: { label: string, options: string[], activeItems: string[], onToggle: (v: string) => void }) => (
  <div className="space-y-4">
    <label className="text-[11pt] uppercase font-black text-purple-500 tracking-[0.2em] block">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isActive = activeItems.includes(opt);
        return (
          <button 
            key={opt} 
            onClick={() => onToggle(opt)} 
            className={`px-4 py-2 text-[11pt] rounded-xl border transition-all flex items-center gap-2 ${isActive ? 'bg-purple-900/40 border-purple-500/50 text-white shadow-md shadow-purple-900/20' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60 hover:bg-white/10'}`}
          >
            {isActive && <CheckCircle2 size={10} className="text-purple-400" />}
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

export default App;
