/**
 * Tile Shader - Procedural tile/grout material for kitchens and bathrooms.
 */

import * as THREE from 'three';

export interface TileParams {
  tileColor?: THREE.Color;
  groutColor?: THREE.Color;
  tileSize?: number;
  groutWidth?: number;
  roughness?: number;
  colorVariation?: number;
}

export function createTileMaterial(params?: TileParams): THREE.MeshStandardMaterial {
  const p = {
    tileColor: params?.tileColor ?? new THREE.Color(0xf0f0f0),
    groutColor: params?.groutColor ?? new THREE.Color(0x888888),
    tileSize: params?.tileSize ?? 4,
    groutWidth: params?.groutWidth ?? 0.05,
    roughness: params?.roughness ?? 0.3,
    colorVariation: params?.colorVariation ?? 0.05,
  };

  const mat = new THREE.MeshStandardMaterial({
    color: p.tileColor,
    roughness: p.roughness,
    metalness: 0.1,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGroutColor = { value: p.groutColor };
    shader.uniforms.uTileSize = { value: p.tileSize };
    shader.uniforms.uGroutWidth = { value: p.groutWidth };
    shader.uniforms.uColorVar = { value: p.colorVariation };

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
      uniform vec3 uGroutColor;
      uniform float uTileSize;
      uniform float uGroutWidth;
      uniform float uColorVar;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec2 tileUV = vWorldPos.xz * uTileSize;
      vec2 tileId = floor(tileUV);
      vec2 tileLocal = fract(tileUV);

      float groutMask = step(uGroutWidth, tileLocal.x) * step(uGroutWidth, tileLocal.y)
                      * step(tileLocal.x, 1.0 - uGroutWidth) * step(tileLocal.y, 1.0 - uGroutWidth);

      float tileHash = hash(tileId);
      vec3 tileVariation = diffuseColor.rgb * (1.0 + (tileHash - 0.5) * uColorVar * 2.0);

      diffuseColor.rgb = mix(uGroutColor, tileVariation, groutMask);`,
    );
  };

  return mat;
}
