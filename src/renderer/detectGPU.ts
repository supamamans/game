/**
 * GPU capability detection.
 * Checks for WebGPU first, then falls back to WebGL2.
 */

export enum GPUTier {
  WebGPU = 'webgpu',
  WebGL2 = 'webgl2',
  Unsupported = 'unsupported',
}

export async function detectGPU(): Promise<GPUTier> {
  // Check WebGPU
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        console.log('[detectGPU] WebGPU adapter found');
        return GPUTier.WebGPU;
      }
      console.warn('[detectGPU] navigator.gpu exists but requestAdapter returned null');
    } catch (e) {
      console.warn('[detectGPU] WebGPU request failed:', e);
    }
  }

  // Check WebGL2
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2');
    if (gl) {
      console.log('[detectGPU] WebGL2 context obtained');
      // Clean up the test context
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
      return GPUTier.WebGL2;
    }
    console.warn('[detectGPU] webgl2 context returned null');
  } catch (e) {
    console.warn('[detectGPU] WebGL2 check threw:', e);
  }

  // Last resort: check WebGL1 to distinguish "no GPU at all" from "old GPU"
  try {
    const testCanvas = document.createElement('canvas');
    const gl1 = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (gl1) {
      console.warn('[detectGPU] WebGL1 works but WebGL2 does not. Three.js r170 requires WebGL2.');
    }
  } catch {
    // ignore
  }

  console.error('[detectGPU] No supported GPU context found');
  return GPUTier.Unsupported;
}
