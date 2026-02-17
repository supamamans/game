/**
 * ParticleSystem - GPU-instanced particle manager.
 *
 * Manages multiple emitters for water, steam, dust, smoke, etc.
 * Uses InstancedMesh for performance.
 */

import * as THREE from 'three';

export interface ParticleEmitterConfig {
  maxParticles: number;
  emitRate: number; // particles per second
  lifetime: number; // seconds
  startSize: number;
  endSize: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
  startOpacity: number;
  endOpacity: number;
  velocity: THREE.Vector3;
  velocitySpread: THREE.Vector3;
  gravity: THREE.Vector3;
  position: THREE.Vector3;
  positionSpread: THREE.Vector3;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  alive: boolean;
}

export class ParticleEmitter {
  private config: ParticleEmitterConfig;
  private particles: Particle[];
  private instancedMesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private emitAccumulator: number = 0;
  public active: boolean = true;

  constructor(config: ParticleEmitterConfig) {
    this.config = config;
    this.particles = [];

    for (let i = 0; i < config.maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        lifetime: config.lifetime,
        alive: false,
      });
    }

    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: config.startColor,
      transparent: true,
      opacity: config.startOpacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, config.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;

    // Hide all initially
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < config.maxParticles; i++) {
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
  }

  get mesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }

  update(dt: number): void {
    if (!this.active) return;

    // Emit new particles
    this.emitAccumulator += dt;
    const emitInterval = 1 / this.config.emitRate;

    while (this.emitAccumulator >= emitInterval) {
      this.emitAccumulator -= emitInterval;
      this.emit();
    }

    // Update existing particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.alive) continue;

      p.age += dt;
      if (p.age >= p.lifetime) {
        p.alive = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      // Physics
      p.velocity.addScaledVector(this.config.gravity, dt);
      p.position.addScaledVector(p.velocity, dt);

      // Interpolate size
      const t = p.age / p.lifetime;
      const size = this.config.startSize + (this.config.endSize - this.config.startSize) * t;

      this.dummy.position.copy(p.position);
      this.dummy.scale.set(size, size, size);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  private emit(): void {
    for (const p of this.particles) {
      if (p.alive) continue;

      p.alive = true;
      p.age = 0;
      p.lifetime = this.config.lifetime * (0.8 + Math.random() * 0.4);

      p.position.copy(this.config.position);
      p.position.x += (Math.random() - 0.5) * this.config.positionSpread.x;
      p.position.y += (Math.random() - 0.5) * this.config.positionSpread.y;
      p.position.z += (Math.random() - 0.5) * this.config.positionSpread.z;

      p.velocity.copy(this.config.velocity);
      p.velocity.x += (Math.random() - 0.5) * this.config.velocitySpread.x;
      p.velocity.y += (Math.random() - 0.5) * this.config.velocitySpread.y;
      p.velocity.z += (Math.random() - 0.5) * this.config.velocitySpread.z;

      break;
    }
  }

  setPosition(pos: THREE.Vector3): void {
    this.config.position.copy(pos);
  }

  dispose(): void {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
  }
}

/**
 * ParticleSystem manager - holds all emitters.
 */
export class ParticleSystem {
  private emitters: Map<string, ParticleEmitter> = new Map();
  public group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ParticleSystem';
  }

  addEmitter(name: string, config: ParticleEmitterConfig): ParticleEmitter {
    const emitter = new ParticleEmitter(config);
    this.emitters.set(name, emitter);
    this.group.add(emitter.mesh);
    return emitter;
  }

  getEmitter(name: string): ParticleEmitter | undefined {
    return this.emitters.get(name);
  }

  removeEmitter(name: string): void {
    const emitter = this.emitters.get(name);
    if (emitter) {
      this.group.remove(emitter.mesh);
      emitter.dispose();
      this.emitters.delete(name);
    }
  }

  update(dt: number): void {
    for (const emitter of this.emitters.values()) {
      emitter.update(dt);
    }
  }

  /**
   * Create a preset water stream emitter.
   */
  createWaterStream(name: string, position: THREE.Vector3): ParticleEmitter {
    return this.addEmitter(name, {
      maxParticles: 200,
      emitRate: 60,
      lifetime: 0.8,
      startSize: 0.02,
      endSize: 0.01,
      startColor: new THREE.Color(0x4488cc),
      endColor: new THREE.Color(0x6699dd),
      startOpacity: 0.8,
      endOpacity: 0.2,
      velocity: new THREE.Vector3(0, -2, 0),
      velocitySpread: new THREE.Vector3(0.1, 0.2, 0.1),
      gravity: new THREE.Vector3(0, -5, 0),
      position,
      positionSpread: new THREE.Vector3(0.02, 0, 0.02),
    });
  }

  /**
   * Create a preset steam emitter.
   */
  createSteam(name: string, position: THREE.Vector3): ParticleEmitter {
    return this.addEmitter(name, {
      maxParticles: 100,
      emitRate: 15,
      lifetime: 2,
      startSize: 0.05,
      endSize: 0.2,
      startColor: new THREE.Color(0xdddddd),
      endColor: new THREE.Color(0xffffff),
      startOpacity: 0.4,
      endOpacity: 0,
      velocity: new THREE.Vector3(0, 0.5, 0),
      velocitySpread: new THREE.Vector3(0.1, 0.1, 0.1),
      gravity: new THREE.Vector3(0, 0.2, 0),
      position,
      positionSpread: new THREE.Vector3(0.1, 0, 0.1),
    });
  }

  /**
   * Create a preset smoke emitter.
   */
  createSmoke(name: string, position: THREE.Vector3): ParticleEmitter {
    return this.addEmitter(name, {
      maxParticles: 200,
      emitRate: 30,
      lifetime: 3,
      startSize: 0.1,
      endSize: 0.5,
      startColor: new THREE.Color(0x444444),
      endColor: new THREE.Color(0x888888),
      startOpacity: 0.6,
      endOpacity: 0,
      velocity: new THREE.Vector3(0, 1.0, 0),
      velocitySpread: new THREE.Vector3(0.3, 0.2, 0.3),
      gravity: new THREE.Vector3(0, 0.5, 0),
      position,
      positionSpread: new THREE.Vector3(0.1, 0, 0.1),
    });
  }

  /**
   * Create dust motes in sunbeams.
   */
  createDustMotes(name: string, position: THREE.Vector3): ParticleEmitter {
    return this.addEmitter(name, {
      maxParticles: 50,
      emitRate: 5,
      lifetime: 8,
      startSize: 0.01,
      endSize: 0.015,
      startColor: new THREE.Color(0xffffcc),
      endColor: new THREE.Color(0xffffcc),
      startOpacity: 0.3,
      endOpacity: 0.1,
      velocity: new THREE.Vector3(0, 0.02, 0),
      velocitySpread: new THREE.Vector3(0.05, 0.02, 0.05),
      gravity: new THREE.Vector3(0, -0.005, 0),
      position,
      positionSpread: new THREE.Vector3(1, 1, 1),
    });
  }

  dispose(): void {
    for (const emitter of this.emitters.values()) {
      emitter.dispose();
    }
    this.emitters.clear();
  }
}
