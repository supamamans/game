/**
 * Sky Shader - Procedural gradient sky for the exterior view through windows.
 *
 * Uses a simple gradient sphere that transitions color based on time of day.
 */

import * as THREE from 'three';

export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTopColor: { value: new THREE.Color(0x4488ff) },
      uBottomColor: { value: new THREE.Color(0xc8ddf0) },
      uSunColor: { value: new THREE.Color(0xffffcc) },
      uSunDir: { value: new THREE.Vector3(0.5, 0.3, 0.1) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;

      void main() {
        vec3 dir = normalize(vWorldPos);
        float t = dir.y * 0.5 + 0.5;
        vec3 sky = mix(uBottomColor, uTopColor, t);

        // Sun glow
        float sunDot = max(0.0, dot(dir, normalize(uSunDir)));
        float sunGlow = pow(sunDot, 32.0);
        sky += uSunColor * sunGlow * 0.5;

        // Horizon haze
        float haze = pow(1.0 - abs(dir.y), 8.0);
        sky = mix(sky, uBottomColor, haze * 0.3);

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
    side: THREE.BackSide,
  });
}
