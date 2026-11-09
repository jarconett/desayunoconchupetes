// =====================================================================
// Reproductor de ruido blanco para bebés
// Un único reproductor para toda la app: sigue sonando aunque se cambie
// de pantalla o se bloquee el móvil, y se apaga solo si se programa.
// =====================================================================
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

export type NoiseKey = 'estatica' | 'lluvia' | 'secador' | 'ventilador' | 'lavadora' | 'olas' | 'rio';

export interface NoiseSound {
  key: NoiseKey;
  label: string;
  icon: string;
  color: string;
  source: number;
  /** Origen y licencia del audio */
  credit: string;
}

export const NOISE_SOUNDS: NoiseSound[] = [
  {
    key: 'estatica',
    label: 'Estática de TV',
    icon: 'television-classic',
    color: '#DCE2F2',
    source: require('../../assets/sounds/estatica.m4a'),
    credit: '«White noise.ogg», Wikimedia Commons, dominio público (bucle y volumen adaptados).',
  },
  {
    key: 'lluvia',
    label: 'Lluvia',
    icon: 'weather-pouring',
    color: '#DDEFF0',
    source: require('../../assets/sounds/lluvia.m4a'),
    credit: '«Rain against the window.ogg», Wikimedia Commons, dominio público (bucle y volumen adaptados).',
  },
  {
    key: 'secador',
    label: 'Secador',
    icon: 'hair-dryer-outline',
    color: '#FBE3D6',
    source: require('../../assets/sounds/secador.m4a'),
    credit: 'Sonido de secador sintetizado para Desayuno con Chupetes.',
  },
  {
    key: 'ventilador',
    label: 'Ventilador',
    icon: 'fan',
    color: '#E8E1F5',
    source: require('../../assets/sounds/ventilador.m4a'),
    credit: '«Ventilador.ogg» de Armartinell, Wikimedia Commons, licencia CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Adaptado: bucle y volumen.',
  },
  {
    key: 'lavadora',
    label: 'Lavadora',
    icon: 'washing-machine',
    color: '#FFF2C7',
    source: require('../../assets/sounds/lavadora.m4a'),
    credit: '«Washing machine mid program.ogg», Wikimedia Commons, dominio público (bucle y volumen adaptados).',
  },
  {
    key: 'olas',
    label: 'Olas del mar',
    icon: 'waves',
    color: '#DDF1E6',
    source: require('../../assets/sounds/olas.m4a'),
    credit: 'Sonido de olas sintetizado para Desayuno con Chupetes.',
  },
  {
    key: 'rio',
    label: 'Río',
    icon: 'waves-arrow-right',
    color: '#F8DDE4',
    source: require('../../assets/sounds/rio.m4a'),
    credit: '«Shallow small river with stony riverbed.ogg», Wikimedia Commons, dominio público (bucle y volumen adaptados).',
  },
];

export interface NoiseState {
  sound: NoiseKey | null;
  playing: boolean;
  /** Momento en que se apagará solo (null = sin límite) */
  endsAt: number | null;
  volume: number;
}

let player: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let state: NoiseState = { sound: null, playing: false, endsAt: null, volume: 0.8 };
const listeners = new Set<(s: NoiseState) => void>();

function emit(patch: Partial<NoiseState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function getNoiseState() {
  return state;
}

export function subscribeNoise(l: (s: NoiseState) => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function clearTimers() {
  if (stopTimer) clearTimeout(stopTimer);
  if (fadeTimer) clearInterval(fadeTimer);
  stopTimer = null;
  fadeTimer = null;
}

/** Empieza a sonar. `minutes` = null para que suene hasta pulsar Detener. */
export async function playNoise(key: NoiseKey, minutes: number | null) {
  const sound = NOISE_SOUNDS.find((s) => s.key === key);
  if (!sound) return;
  clearTimers();
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
  } catch {
    // en web no aplica
  }
  if (player) {
    player.pause();
    player.remove();
  }
  player = createAudioPlayer(sound.source);
  player.loop = true;
  player.volume = state.volume;
  player.play();
  if (Platform.OS !== 'web') {
    // Necesario en Android para que siga sonando en segundo plano (y da controles en la pantalla de bloqueo)
    player.setActiveForLockScreen(true, { title: `Ruido blanco · ${sound.label}`, artist: 'Desayuno con Chupetes' });
  }
  const endsAt = minutes ? Date.now() + minutes * 60000 : null;
  if (endsAt) scheduleStop(endsAt);
  // Comprobación extra: si el sistema retrasa los temporizadores, se apaga al recibir el siguiente estado
  player.addListener('playbackStatusUpdate', () => {
    if (state.endsAt && Date.now() >= state.endsAt) stopNoise();
  });
  emit({ sound: key, playing: true, endsAt });
}

function scheduleStop(endsAt: number) {
  const FADE_MS = 20000;
  const untilFade = Math.max(0, endsAt - Date.now() - FADE_MS);
  stopTimer = setTimeout(() => {
    // Bajada suave del volumen durante los últimos segundos
    const start = Date.now();
    const v0 = state.volume;
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / FADE_MS);
      if (player) player.volume = v0 * (1 - k);
      if (k >= 1) stopNoise();
    }, 500);
  }, untilFade);
}

export function stopNoise() {
  clearTimers();
  if (player) {
    player.pause();
    if (Platform.OS !== 'web') player.clearLockScreenControls();
    player.remove();
    player = null;
  }
  emit({ playing: false, endsAt: null });
}

export function setNoiseVolume(v: number) {
  const vol = Math.min(1, Math.max(0, v));
  if (player && !fadeTimer) player.volume = vol;
  emit({ volume: vol });
}

/** Cambia el tiempo de apagado mientras suena (null = sin límite). */
export function setNoiseTimer(minutes: number | null) {
  if (!state.playing) return;
  clearTimers();
  if (player) player.volume = state.volume;
  const endsAt = minutes ? Date.now() + minutes * 60000 : null;
  if (endsAt) scheduleStop(endsAt);
  emit({ endsAt });
}
