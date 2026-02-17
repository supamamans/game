/**
 * TestRoom - A simple box room for Phase 1 testing.
 *
 * Creates a room with floor, walls, and ceiling using basic geometry.
 * This will be replaced by the procedural HouseGenerator in Phase 2.
 */

import * as THREE from 'three';

export interface RoomDimensions {
  width: number;
  depth: number;
  height: number;
}

const DEFAULT_ROOM: RoomDimensions = {
  width: 8,
  depth: 10,
  height: 3,
};

export class TestRoom {
  public group: THREE.Group;

  constructor(dimensions?: Partial<RoomDimensions>) {
    const dim = { ...DEFAULT_ROOM, ...dimensions };
    this.group = new THREE.Group();
    this.group.name = 'TestRoom';

    this.buildFloor(dim);
    this.buildWalls(dim);
    this.buildCeiling(dim);
    this.addFurniture(dim);
  }

  private buildFloor(dim: RoomDimensions): void {
    const geometry = new THREE.PlaneGeometry(dim.width, dim.depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b6f47, // Warm wood color
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    this.group.add(floor);
  }

  private buildWalls(dim: RoomDimensions): void {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f0e8, // Off-white
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(dim.width, dim.height),
      wallMaterial,
    );
    backWall.position.set(0, dim.height / 2, -dim.depth / 2);
    backWall.receiveShadow = true;
    backWall.name = 'wall_back';
    this.group.add(backWall);

    // Front wall
    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(dim.width, dim.height),
      wallMaterial,
    );
    frontWall.position.set(0, dim.height / 2, dim.depth / 2);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    frontWall.name = 'wall_front';
    this.group.add(frontWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(dim.depth, dim.height),
      wallMaterial,
    );
    leftWall.position.set(-dim.width / 2, dim.height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.name = 'wall_left';
    this.group.add(leftWall);

    // Right wall (with window cutout simulated by color difference)
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(dim.depth, dim.height),
      wallMaterial,
    );
    rightWall.position.set(dim.width / 2, dim.height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.name = 'wall_right';
    this.group.add(rightWall);

    // Baseboard trim on all walls
    const baseboardMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8e0d0,
      roughness: 0.5,
    });
    const baseboardHeight = 0.1;

    const positions = [
      { pos: [0, baseboardHeight / 2, -dim.depth / 2 + 0.01], rot: [0, 0, 0], size: [dim.width, baseboardHeight] },
      { pos: [0, baseboardHeight / 2, dim.depth / 2 - 0.01], rot: [0, Math.PI, 0], size: [dim.width, baseboardHeight] },
      { pos: [-dim.width / 2 + 0.01, baseboardHeight / 2, 0], rot: [0, Math.PI / 2, 0], size: [dim.depth, baseboardHeight] },
      { pos: [dim.width / 2 - 0.01, baseboardHeight / 2, 0], rot: [0, -Math.PI / 2, 0], size: [dim.depth, baseboardHeight] },
    ];

    for (const p of positions) {
      const baseboard = new THREE.Mesh(
        new THREE.PlaneGeometry(p.size[0], p.size[1]),
        baseboardMaterial,
      );
      baseboard.position.set(p.pos[0] as number, p.pos[1] as number, p.pos[2] as number);
      baseboard.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
      this.group.add(baseboard);
    }
  }

  private buildCeiling(dim: RoomDimensions): void {
    const geometry = new THREE.PlaneGeometry(dim.width, dim.depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ceiling = new THREE.Mesh(geometry, material);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = dim.height;
    ceiling.name = 'ceiling';
    this.group.add(ceiling);
  }

  /**
   * Add basic placeholder furniture for Phase 1 testing.
   */
  private addFurniture(dim: RoomDimensions): void {
    // Simple table
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4226,
      roughness: 0.6,
    });

    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.05, 0.8),
      tableMaterial,
    );
    tableTop.position.set(-2, 0.75, -3);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.group.add(tableTop);

    // Table legs
    const legGeo = new THREE.BoxGeometry(0.05, 0.75, 0.05);
    const legPositions = [
      [-2.7, 0.375, -3.35],
      [-1.3, 0.375, -3.35],
      [-2.7, 0.375, -2.65],
      [-1.3, 0.375, -2.65],
    ];
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(legGeo, tableMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      this.group.add(leg);
    }

    // Simple chair
    const chairSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.04, 0.45),
      tableMaterial,
    );
    chairSeat.position.set(-2, 0.45, -2);
    chairSeat.castShadow = true;
    this.group.add(chairSeat);

    const chairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.5, 0.04),
      tableMaterial,
    );
    chairBack.position.set(-2, 0.7, -2.22);
    chairBack.castShadow = true;
    this.group.add(chairBack);

    // A colorful toy block on the floor
    const toyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      roughness: 0.4,
    });
    const toyBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      toyMaterial,
    );
    toyBlock.position.set(1, 0.075, 1);
    toyBlock.castShadow = true;
    this.group.add(toyBlock);

    // Another toy block
    const toyMaterial2 = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      roughness: 0.4,
    });
    const toyBlock2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      toyMaterial2,
    );
    toyBlock2.position.set(1.2, 0.075, 0.9);
    toyBlock2.rotation.y = 0.4;
    toyBlock2.castShadow = true;
    this.group.add(toyBlock2);
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
