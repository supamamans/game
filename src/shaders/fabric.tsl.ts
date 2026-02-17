/**
 * Fabric Shader - Soft fabric material for couches, curtains, clothing.
 */

import * as THREE from 'three';

export interface FabricParams {
  color?: THREE.Color;
  roughness?: number;
  fiberScale?: number;
}

export function createFabricMaterial(params?: FabricParams): THREE.MeshStandardMaterial {
  const p = {
    color: params?.color ?? new THREE.Color(0x6b5b4a),
    roughness: params?.roughness ?? 0.85,
    fiberScale: params?.fiberScale ?? 30,
  };

  const mat = new THREE.MeshStandardMaterial({
    color: p.color,
    roughness: p.roughness,
    metalness: 0,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFiberScale = { value: p.fiberScale };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vWorldNormal = normalize(normalMatrix * normal);`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      uniform float uFiberScale;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec2 fiberUV = vWorldPos.xz * uFiberScale;
      float fiber = hash(floor(fiberUV)) * 0.08;
      float weave = sin(fiberUV.x * 3.14159) * sin(fiberUV.y * 3.14159) * 0.03;
      diffuseColor.rgb *= 1.0 + fiber + weave;`,
    );
  };

  return mat;
}
