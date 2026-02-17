/**
 * Wood Shader - Procedural wood grain material.
 *
 * Creates stylized wood with grain lines, color variation, and wear.
 * Uses Three.js MeshStandardMaterial with custom onBeforeCompile
 * for procedural patterns. Full TSL version comes in WebGPU path.
 */

import * as THREE from 'three';

export interface WoodParams {
  baseColor?: THREE.Color;
  grainColor?: THREE.Color;
  grainScale?: number;
  roughness?: number;
  wearAmount?: number;
}

export function createWoodMaterial(params?: WoodParams): THREE.MeshStandardMaterial {
  const p = {
    baseColor: params?.baseColor ?? new THREE.Color(0x8b6f47),
    grainColor: params?.grainColor ?? new THREE.Color(0x6b4f27),
    grainScale: params?.grainScale ?? 10,
    roughness: params?.roughness ?? 0.7,
    wearAmount: params?.wearAmount ?? 0.1,
  };

  const mat = new THREE.MeshStandardMaterial({
    color: p.baseColor,
    roughness: p.roughness,
    metalness: 0.02,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGrainColor = { value: p.grainColor };
    shader.uniforms.uGrainScale = { value: p.grainScale };
    shader.uniforms.uWear = { value: p.wearAmount };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      uniform vec3 uGrainColor;
      uniform float uGrainScale;
      uniform float uWear;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float woodGrain(vec2 uv) {
        float grain = sin(uv.y * uGrainScale + noise(uv * 4.0) * 3.0) * 0.5 + 0.5;
        grain += noise(uv * uGrainScale * 2.0) * 0.15;
        return grain;
      }`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec2 woodUV = vWorldPos.xz;
      float grain = woodGrain(woodUV);
      vec3 grainMix = mix(diffuseColor.rgb, uGrainColor, grain * 0.4);
      float wear = noise(vWorldPos.xz * 20.0) * uWear;
      diffuseColor.rgb = mix(grainMix, grainMix * 1.1, wear);`,
    );
  };

  return mat;
}
