/**
 * AudioManager - Spatial audio management using Web Audio API.
 *
 * All sounds are positioned in 3D space. The manager handles
 * sound loading, playback, and spatial positioning.
 * Howler.js integration is deferred until the dependency is added.
 */

import * as THREE from 'three';
import { EventBus } from '@core/EventBus';

export interface SoundConfig {
  name: string;
  volume: number;
  loop: boolean;
  spatial: boolean;
  position?: THREE.Vector3;
  maxDistance?: number;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private listener: THREE.AudioListener;
  private sounds: Map<string, THREE.Audio | THREE.PositionalAudio> = new Map();
  private masterVolume: number = 1.0;
  private muted: boolean = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);

    this.setupListeners();
  }

  private setupListeners(): void {
    EventBus.on('audio.play', (name: unknown, position?: unknown) => {
      this.play(name as string, position as THREE.Vector3 | undefined);
    });

    EventBus.on('audio.stop', (name: unknown) => {
      this.stop(name as string);
    });

    EventBus.on('audio.volume', (volume: unknown) => {
      this.setVolume(volume as number);
    });

    EventBus.on('audio.mute', (muted: unknown) => {
      this.muted = muted as boolean;
      this.listener.setMasterVolume(this.muted ? 0 : this.masterVolume);
    });
  }

  /**
   * Initialize the audio context (must be called after user gesture).
   */
  init(): void {
    this.audioContext = new AudioContext();
    // Resume context (required by browsers)
    if (this.audioContext.state === 'suspended') {
      document.addEventListener('click', () => {
        this.audioContext?.resume();
      }, { once: true });
    }
  }

  /**
   * Register a procedural sound (no file needed).
   * In a full implementation, this would load audio files.
   */
  registerSound(name: string, config: Partial<SoundConfig>): void {
    // Placeholder - actual audio loading would happen here
    // For now, just track the config
  }

  /**
   * Play a sound.
   */
  play(name: string, position?: THREE.Vector3): void {
    if (this.muted) return;
    // In a full implementation, this plays the registered sound
    // For now, emit event for systems to track
    EventBus.emit('audio.playing', name, position);
  }

  /**
   * Stop a sound.
   */
  stop(name: string): void {
    const sound = this.sounds.get(name);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }

  /**
   * Set master volume (0-1).
   */
  setVolume(volume: number): void {
    this.masterVolume = volume;
    if (!this.muted) {
      this.listener.setMasterVolume(volume);
    }
  }

  /**
   * Update spatial audio positions each frame.
   */
  update(): void {
    // Spatial audio updates are handled by Three.js AudioListener
  }

  dispose(): void {
    for (const sound of this.sounds.values()) {
      if (sound.isPlaying) sound.stop();
    }
    this.sounds.clear();
    this.audioContext?.close();
  }
}
