/**
 * Skin Shader - Subsurface scattering approximation for child skin.
 *
 * Uses a screen-space SSS trick: modulate the diffuse color
 * based on light direction and a subsurface color ramp.
 */

import * as THREE from 'three';

export interface SkinParams {
  skinTone?: number; // 0-1 mapped to color ramp
  roughness?: number;
  sssIntensity?: number;
  isCrying?: boolean;
}

const SKIN_RAMP = [
  new THREE.Color(0xffe0c0), // Very light
  new THREE.Color(0xf0c8a0), // Light
  new THREE.Color(0xd4a878), // Medium light
  new THREE.Color(0xb88860), // Medium
  new THREE.Color(0x8c6840), // Medium dark
  new THREE.Color(0x604830), // Dark
  new THREE.Color(0x3c2818), // Very dark
];

export function getSkinColor(tone: number): THREE.Color {
  const idx = tone * (SKIN_RAMP.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.min(lower + 1, SKIN_RAMP.length - 1);
  const t = idx - lower;
  return SKIN_RAMP[lower].clone().lerp(SKIN_RAMP[upper], t);
}

export function createSkinMaterial(params?: SkinParams): THREE.MeshStandardMaterial {
  const tone = params?.skinTone ?? 0.3;
  const baseColor = getSkinColor(tone);
  const sssColor = baseColor.clone().multiplyScalar(1.2).offsetHSL(0, 0.1, 0.05);

  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: params?.roughness ?? 0.65,
    metalness: 0,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSSSColor = { value: sssColor };
    shader.uniforms.uSSSIntensity = { value: params?.sssIntensity ?? 0.3 };
    shader.uniforms.uCrying = { value: params?.isCrying ? 1.0 : 0.0 };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vViewDir;
      varying vec3 vWorldNormal;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 worldPos4 = modelMatrix * vec4(position, 1.0);
      vViewDir = normalize(cameraPosition - worldPos4.xyz);
      vWorldNormal = normalize(normalMatrix * normal);`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vViewDir;
      varying vec3 vWorldNormal;
      uniform vec3 uSSSColor;
      uniform float uSSSIntensity;
      uniform float uCrying;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // Subsurface scattering approximation
      float sss = pow(max(0.0, dot(vViewDir, -vWorldNormal)), 2.0) * uSSSIntensity;
      diffuseColor.rgb += uSSSColor * sss;

      // Crying effect: redden cheeks and nose area
      if (uCrying > 0.5) {
        float cheekMask = smoothstep(0.3, 0.7, vWorldNormal.y);
        diffuseColor.rgb += vec3(0.15, 0.0, 0.0) * cheekMask;
      }`,
    );
  };

  return mat;
}
