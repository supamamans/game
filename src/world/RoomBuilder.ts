/**
 * RoomBuilder - Constructs 3D room geometry from RoomNode data.
 *
 * Creates floor, walls (with door cutouts), and ceiling for each room.
 */

import * as THREE from 'three';
import { RoomNode, DoorInfo } from './RoomTypes';

const WALL_THICKNESS = 0.15;

export class RoomBuilder {
  /**
   * Build a complete room group with floor, walls, and ceiling.
   */
  buildRoom(room: RoomNode, doors: DoorInfo[], roomColors: { wall: number; floor: number }): THREE.Group {
    const group = new THREE.Group();
    group.name = `room_${room.id}_${room.type}`;
    group.position.set(room.worldX, 0, room.worldZ);

    this.buildFloor(group, room, roomColors.floor);
    this.buildCeiling(group, room);
    this.buildWalls(group, room, doors, roomColors.wall);

    return group;
  }

  private buildFloor(group: THREE.Group, room: RoomNode, color: number): void {
    const geo = new THREE.PlaneGeometry(room.width, room.depth);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.name = 'floor';
    group.add(mesh);
  }

  private buildCeiling(group: THREE.Group, room: RoomNode): void {
    const geo = new THREE.PlaneGeometry(room.width, room.depth);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = room.height;
    mesh.name = 'ceiling';
    group.add(mesh);
  }

  private buildWalls(group: THREE.Group, room: RoomNode, doors: DoorInfo[], wallColor: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    const w = room.width;
    const d = room.depth;
    const h = room.height;

    // Define 4 walls: direction they face, position, and size
    const walls = [
      { name: 'wall_back', pos: [0, h / 2, -d / 2], rot: [0, 0, 0], size: [w, h], axis: 'z', axisVal: room.worldZ - d / 2 },
      { name: 'wall_front', pos: [0, h / 2, d / 2], rot: [0, Math.PI, 0], size: [w, h], axis: 'z', axisVal: room.worldZ + d / 2 },
      { name: 'wall_left', pos: [-w / 2, h / 2, 0], rot: [0, Math.PI / 2, 0], size: [d, h], axis: 'x', axisVal: room.worldX - w / 2 },
      { name: 'wall_right', pos: [w / 2, h / 2, 0], rot: [0, -Math.PI / 2, 0], size: [d, h], axis: 'x', axisVal: room.worldX + w / 2 },
    ];

    for (const wallDef of walls) {
      // Check if any door intersects this wall
      const hasDoor = doors.some((door) => {
        if (door.roomA !== room.id && door.roomB !== room.id) return false;
        // Check if door is on this wall (approximate)
        const doorWorldPos = wallDef.axis === 'x' ? door.worldX : door.worldZ;
        const wallWorldPos = wallDef.axisVal;
        return Math.abs(doorWorldPos - wallWorldPos) < WALL_THICKNESS * 4;
      });

      if (hasDoor) {
        // Build wall with door opening
        this.buildWallWithDoor(group, wallDef, mat, h);
      } else {
        // Solid wall
        const geo = new THREE.PlaneGeometry(wallDef.size[0], wallDef.size[1]);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(wallDef.pos[0], wallDef.pos[1], wallDef.pos[2]);
        mesh.rotation.set(wallDef.rot[0], wallDef.rot[1], wallDef.rot[2]);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.name = wallDef.name;
        group.add(mesh);
      }
    }
  }

  private buildWallWithDoor(
    group: THREE.Group,
    wallDef: { name: string; pos: number[]; rot: number[]; size: number[] },
    mat: THREE.MeshStandardMaterial,
    wallHeight: number,
  ): void {
    const wallWidth = wallDef.size[0];
    const doorWidth = 1.0;
    const doorHeight = 2.2;

    // Left section
    const leftWidth = (wallWidth - doorWidth) / 2;
    if (leftWidth > 0.01) {
      const leftGeo = new THREE.PlaneGeometry(leftWidth, wallHeight);
      const leftMesh = new THREE.Mesh(leftGeo, mat);
      leftMesh.position.set(
        wallDef.pos[0] - (doorWidth + leftWidth) / 2,
        wallDef.pos[1],
        wallDef.pos[2],
      );
      leftMesh.rotation.set(wallDef.rot[0], wallDef.rot[1], wallDef.rot[2]);
      leftMesh.receiveShadow = true;
      leftMesh.castShadow = true;
      leftMesh.name = `${wallDef.name}_left`;
      group.add(leftMesh);
    }

    // Right section
    const rightWidth = (wallWidth - doorWidth) / 2;
    if (rightWidth > 0.01) {
      const rightGeo = new THREE.PlaneGeometry(rightWidth, wallHeight);
      const rightMesh = new THREE.Mesh(rightGeo, mat);
      rightMesh.position.set(
        wallDef.pos[0] + (doorWidth + rightWidth) / 2,
        wallDef.pos[1],
        wallDef.pos[2],
      );
      rightMesh.rotation.set(wallDef.rot[0], wallDef.rot[1], wallDef.rot[2]);
      rightMesh.receiveShadow = true;
      rightMesh.castShadow = true;
      rightMesh.name = `${wallDef.name}_right`;
      group.add(rightMesh);
    }

    // Top section (above door)
    const topHeight = wallHeight - doorHeight;
    if (topHeight > 0.01) {
      const topGeo = new THREE.PlaneGeometry(doorWidth, topHeight);
      const topMesh = new THREE.Mesh(topGeo, mat);
      topMesh.position.set(
        wallDef.pos[0],
        doorHeight + topHeight / 2,
        wallDef.pos[2],
      );
      topMesh.rotation.set(wallDef.rot[0], wallDef.rot[1], wallDef.rot[2]);
      topMesh.receiveShadow = true;
      topMesh.name = `${wallDef.name}_top`;
      group.add(topMesh);
    }
  }
}
