/**
 * Glass Shader - Transparent material for windows, cups, bottles.
 */

import * as THREE from 'three';

export interface GlassParams {
  color?: THREE.Color;
  opacity?: number;
  roughness?: number;
  ior?: number;
}

export function createGlassMaterial(params?: GlassParams): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: params?.color ?? new THREE.Color(0xffffff),
    roughness: params?.roughness ?? 0.05,
    metalness: 0,
    transmission: 1.0,
    thickness: 0.5,
    ior: params?.ior ?? 1.5,
    transparent: true,
    opacity: params?.opacity ?? 0.3,
  });
}
