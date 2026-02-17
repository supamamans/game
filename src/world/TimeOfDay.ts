/**
 * TimeOfDay - Sun position, sky color, and light color transitions.
 *
 * Controls the directional light (sun/moon), ambient light color,
 * fog color, and scene background based on in-game time.
 */

import * as THREE from 'three';
import { lerp, clamp, remap } from '@utils/MathUtils';

interface TimeSlice {
  hour: number;
  sunAngle: number; // degrees from horizon
  sunColor: THREE.Color;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  sunIntensity: number;
  fogColor: THREE.Color;
  skyColor: THREE.Color;
}

const TIME_SLICES: TimeSlice[] = [
  {
    hour: 6,
    sunAngle: 5,
    sunColor: new THREE.Color(0xffcc88),
    ambientColor: new THREE.Color(0xc8a8e0),
    ambientIntensity: 0.3,
    sunIntensity: 0.8,
    fogColor: new THREE.Color(0xffd4a0),
    skyColor: new THREE.Color(0xffd4a0),
  },
  {
    hour: 8,
    sunAngle: 25,
    sunColor: new THREE.Color(0xfff4e0),
    ambientColor: new THREE.Color(0xc8d8f0),
    ambientIntensity: 0.4,
    sunIntensity: 1.5,
    fogColor: new THREE.Color(0xc8ddf0),
    skyColor: new THREE.Color(0x87ceeb),
  },
  {
    hour: 12,
    sunAngle: 70,
    sunColor: new THREE.Color(0xffffff),
    ambientColor: new THREE.Color(0xd0e0f8),
    ambientIntensity: 0.5,
    sunIntensity: 2.0,
    fogColor: new THREE.Color(0xd0e0f8),
    skyColor: new THREE.Color(0x6eb5ff),
  },
  {
    hour: 15,
    sunAngle: 45,
    sunColor: new THREE.Color(0xfff0d0),
    ambientColor: new THREE.Color(0xd4d8e0),
    ambientIntensity: 0.45,
    sunIntensity: 1.8,
    fogColor: new THREE.Color(0xd4d8e0),
    skyColor: new THREE.Color(0x7ec0ee),
  },
  {
    hour: 18,
    sunAngle: 15,
    sunColor: new THREE.Color(0xffaa55),
    ambientColor: new THREE.Color(0xe0c0a0),
    ambientIntensity: 0.35,
    sunIntensity: 1.2,
    fogColor: new THREE.Color(0xf0c888),
    skyColor: new THREE.Color(0xf0a050),
  },
  {
    hour: 20,
    sunAngle: -5,
    sunColor: new THREE.Color(0x4466aa),
    ambientColor: new THREE.Color(0x303050),
    ambientIntensity: 0.15,
    sunIntensity: 0.3,
    fogColor: new THREE.Color(0x202040),
    skyColor: new THREE.Color(0x1a1a3a),
  },
  {
    hour: 22,
    sunAngle: -15,
    sunColor: new THREE.Color(0x334488),
    ambientColor: new THREE.Color(0x202038),
    ambientIntensity: 0.1,
    sunIntensity: 0.15,
    fogColor: new THREE.Color(0x101025),
    skyColor: new THREE.Color(0x0a0a20),
  },
];

export class TimeOfDay {
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private scene: THREE.Scene;

  constructor(sunLight: THREE.DirectionalLight, ambientLight: THREE.AmbientLight, scene: THREE.Scene) {
    this.sunLight = sunLight;
    this.ambientLight = ambientLight;
    this.scene = scene;
  }

  /**
   * Update lighting based on the current game hour (6-22).
   */
  update(gameHour: number): void {
    const hour = clamp(gameHour, 6, 22);

    // Find surrounding time slices
    let lower = TIME_SLICES[0];
    let upper = TIME_SLICES[TIME_SLICES.length - 1];

    for (let i = 0; i < TIME_SLICES.length - 1; i++) {
      if (hour >= TIME_SLICES[i].hour && hour <= TIME_SLICES[i + 1].hour) {
        lower = TIME_SLICES[i];
        upper = TIME_SLICES[i + 1];
        break;
      }
    }

    // Interpolation factor
    const t = upper.hour === lower.hour ? 0 : (hour - lower.hour) / (upper.hour - lower.hour);

    // Interpolate sun position
    const sunAngle = lerp(lower.sunAngle, upper.sunAngle, t);
    const angleRad = (sunAngle * Math.PI) / 180;
    this.sunLight.position.set(
      Math.cos(angleRad) * 10,
      Math.sin(angleRad) * 10,
      3,
    );

    // Interpolate colors
    this.sunLight.color.copy(lower.sunColor).lerp(upper.sunColor, t);
    this.sunLight.intensity = lerp(lower.sunIntensity, upper.sunIntensity, t);

    this.ambientLight.color.copy(lower.ambientColor).lerp(upper.ambientColor, t);
    this.ambientLight.intensity = lerp(lower.ambientIntensity, upper.ambientIntensity, t);

    // Update scene background and fog
    const skyColor = lower.skyColor.clone().lerp(upper.skyColor, t);
    this.scene.background = skyColor;
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(lower.fogColor).lerp(upper.fogColor, t);
    }
  }

  /**
   * Get a normalized "darkness" value (0 = bright day, 1 = full night).
   * Useful for UI and gameplay effects.
   */
  getDarkness(gameHour: number): number {
    if (gameHour <= 8) return remap(gameHour, 6, 8, 0.4, 0);
    if (gameHour <= 18) return 0;
    return remap(gameHour, 18, 22, 0, 1);
  }
}
