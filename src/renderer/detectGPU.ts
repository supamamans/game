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
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        return GPUTier.WebGPU;
      }
    } catch {
      // WebGPU request failed, try WebGL2
    }
  }

  // Check WebGL2
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2');
  if (gl) {
    return GPUTier.WebGL2;
  }

  return GPUTier.Unsupported;
}
