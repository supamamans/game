/**
 * Water Shader - For bathtub water, sinks, and spills.
 */

import * as THREE from 'three';

export interface WaterParams {
  color?: THREE.Color;
  opacity?: number;
  soapy?: boolean;
}

export function createWaterMaterial(params?: WaterParams): THREE.MeshStandardMaterial {
  const p = {
    color: params?.color ?? new THREE.Color(0x4488cc),
    opacity: params?.opacity ?? 0.6,
    soapy: params?.soapy ?? false,
  };

  const mat = new THREE.MeshStandardMaterial({
    color: p.soapy ? new THREE.Color(0xddeeff) : p.color,
    roughness: p.soapy ? 0.4 : 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: p.opacity,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      varying vec3 vWorldPos;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      // Gentle wave displacement
      transformed.y += sin(vWorldPos.x * 4.0 + uTime * 2.0) * 0.005
                     + sin(vWorldPos.z * 3.0 + uTime * 1.5) * 0.003;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      uniform float uTime;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // Subtle caustic-like pattern
      float caustic = sin(vWorldPos.x * 8.0 + uTime) * sin(vWorldPos.z * 8.0 + uTime * 0.7);
      diffuseColor.rgb += caustic * 0.05;`,
    );
  };

  // Store reference to update uTime each frame
  (mat as unknown as Record<string, unknown>).__waterShader = null;
  const origBeforeCompile = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    origBeforeCompile(shader, renderer);
    (mat as unknown as Record<string, unknown>).__waterShader = shader;
  };

  return mat;
}

/**
 * Update water shader time uniform.
 */
export function updateWaterTime(mat: THREE.MeshStandardMaterial, time: number): void {
  const shader = (mat as unknown as Record<string, unknown>).__waterShader as {
    uniforms: Record<string, { value: number }>;
  } | null;
  if (shader) {
    shader.uniforms.uTime.value = time;
  }
}
