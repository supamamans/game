/**
 * FurnitureFactory - Procedural furniture generation from primitives.
 *
 * Each room type has furniture sets. Items are built from BoxGeometry
 * and other primitives with appropriate materials.
 */

import * as THREE from 'three';
import { RoomType, RoomNode } from './RoomTypes';
import { SeededRandom } from '@utils/SeededRandom';

export interface FurnitureItem {
  mesh: THREE.Group;
  name: string;
  tags: string[];
  interactable: boolean;
}

export class FurnitureFactory {
  private rng: SeededRandom;

  constructor(seed: string) {
    this.rng = new SeededRandom(seed + '_furniture');
  }

  /**
   * Generate furniture for a room based on its type.
   */
  furnishRoom(room: RoomNode): FurnitureItem[] {
    switch (room.type) {
      case RoomType.Kitchen: return this.kitchenFurniture(room);
      case RoomType.LivingRoom: return this.livingRoomFurniture(room);
      case RoomType.Bathroom: return this.bathroomFurniture(room);
      case RoomType.Bedroom: return this.bedroomFurniture(room);
      case RoomType.MasterBedroom: return this.masterBedroomFurniture(room);
      case RoomType.Playroom: return this.playroomFurniture(room);
      case RoomType.DiningRoom: return this.diningRoomFurniture(room);
      case RoomType.LaundryRoom: return this.laundryFurniture(room);
      default: return [];
    }
  }

  private makeBox(w: number, h: number, d: number, color: number, roughness = 0.6): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private makeCylinder(radius: number, height: number, color: number): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 12);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  private kitchenFurniture(room: RoomNode): FurnitureItem[] {
    const items: FurnitureItem[] = [];
    const hw = room.width / 2 - 0.3;
    const hd = room.depth / 2 - 0.3;

    // Counter along back wall
    const counter = new THREE.Group();
    counter.name = 'kitchen_counter';
    const counterTop = this.makeBox(room.width * 0.8, 0.05, 0.6, 0xd4c4a8);
    counterTop.position.set(0, 0.9, -hd + 0.3);
    counter.add(counterTop);
    const counterBase = this.makeBox(room.width * 0.8, 0.88, 0.58, 0x8b6f47);
    counterBase.position.set(0, 0.44, -hd + 0.3);
    counter.add(counterBase);
    items.push({ mesh: counter, name: 'counter', tags: ['furniture'], interactable: true });

    // Stove
    const stove = new THREE.Group();
    stove.name = 'stove';
    const stoveBody = this.makeBox(0.7, 0.9, 0.6, 0x333333, 0.3);
    stoveBody.position.set(-hw + 0.5, 0.45, -hd + 0.3);
    stove.add(stoveBody);
    // Burners
    for (let bx = 0; bx < 2; bx++) {
      for (let bz = 0; bz < 2; bz++) {
        const burner = this.makeCylinder(0.08, 0.02, 0x222222);
        burner.position.set(-hw + 0.3 + bx * 0.25, 0.91, -hd + 0.15 + bz * 0.25);
        stove.add(burner);
      }
    }
    items.push({ mesh: stove, name: 'stove', tags: ['electronic', 'hazardous', 'hot'], interactable: true });

    // Fridge
    const fridge = new THREE.Group();
    fridge.name = 'fridge';
    const fridgeBody = this.makeBox(0.7, 1.8, 0.7, 0xeeeeee, 0.2);
    fridgeBody.position.set(hw - 0.5, 0.9, -hd + 0.35);
    fridge.add(fridgeBody);
    const fridgeHandle = this.makeBox(0.03, 0.4, 0.03, 0x999999);
    fridgeHandle.position.set(hw - 0.15, 1.2, -hd + 0.01);
    fridge.add(fridgeHandle);
    items.push({ mesh: fridge, name: 'fridge', tags: ['container', 'electronic'], interactable: true });

    // Sink
    const sink = new THREE.Group();
    sink.name = 'sink';
    const sinkBasin = this.makeBox(0.5, 0.15, 0.4, 0xaabbcc, 0.2);
    sinkBasin.position.set(0, 0.85, -hd + 0.3);
    sink.add(sinkBasin);
    const faucet = this.makeCylinder(0.02, 0.25, 0xcccccc);
    faucet.position.set(0, 1.05, -hd + 0.15);
    sink.add(faucet);
    items.push({ mesh: sink, name: 'sink', tags: ['liquid_source'], interactable: true });

    // Table in center
    const table = this.makeTable(0, 0.5, 1.2, 0.7, 0x8b6f47);
    items.push({ mesh: table, name: 'kitchen_table', tags: ['furniture'], interactable: true });

    // High chair (if there are infants/toddlers)
    if (this.rng.chance(0.7)) {
      const highChair = new THREE.Group();
      highChair.name = 'high_chair';
      const seat = this.makeBox(0.35, 0.04, 0.35, 0xddcc99);
      seat.position.set(0.8, 0.6, 0.5);
      highChair.add(seat);
      const chairBack = this.makeBox(0.35, 0.4, 0.04, 0xddcc99);
      chairBack.position.set(0.8, 0.8, 0.32);
      highChair.add(chairBack);
      // Legs
      for (const dx of [-0.15, 0.15]) {
        for (const dz of [-0.15, 0.15]) {
          const leg = this.makeBox(0.03, 0.6, 0.03, 0xddcc99);
          leg.position.set(0.8 + dx, 0.3, 0.5 + dz);
          highChair.add(leg);
        }
      }
      items.push({ mesh: highChair, name: 'high_chair', tags: ['furniture'], interactable: true });
    }

    return items;
  }

  private livingRoomFurniture(room: RoomNode): FurnitureItem[] {
    const items: FurnitureItem[] = [];
    const hw = room.width / 2 - 0.3;
    const hd = room.depth / 2 - 0.3;

    // Couch against back wall
    const couch = new THREE.Group();
    couch.name = 'couch';
    const couchSeat = this.makeBox(2.0, 0.4, 0.8, 0x6b5b4a, 0.8);
    couchSeat.position.set(0, 0.3, -hd + 0.4);
    couch.add(couchSeat);
    const couchBack = this.makeBox(2.0, 0.5, 0.15, 0x5a4a3a, 0.8);
    couchBack.position.set(0, 0.65, -hd + 0.05);
    couch.add(couchBack);
    // Armrests
    for (const side of [-1, 1]) {
      const arm = this.makeBox(0.15, 0.3, 0.7, 0x5a4a3a, 0.8);
      arm.position.set(side * 1.0, 0.45, -hd + 0.35);
      couch.add(arm);
    }
    items.push({ mesh: couch, name: 'couch', tags: ['furniture'], interactable: true });

    // Coffee table
    const coffeeTable = this.makeTable(0, 0.3, 1.0, 0.5, 0x6b4226);
    items.push({ mesh: coffeeTable, name: 'coffee_table', tags: ['furniture'], interactable: true });

    // TV on stand against right wall
    const tv = new THREE.Group();
    tv.name = 'tv';
    const tvScreen = this.makeBox(1.2, 0.7, 0.05, 0x111111, 0.1);
    tvScreen.position.set(hw - 0.1, 1.1, 0);
    tv.add(tvScreen);
    const tvStand = this.makeBox(1.0, 0.5, 0.4, 0x4a3520);
    tvStand.position.set(hw - 0.2, 0.25, 0);
    tv.add(tvStand);
    items.push({ mesh: tv, name: 'tv', tags: ['electronic'], interactable: true });

    // Toy box
    const toyBox = new THREE.Group();
    toyBox.name = 'toy_box';
    const box = this.makeBox(0.6, 0.4, 0.4, 0xee8844, 0.7);
    box.position.set(-hw + 0.4, 0.2, hd - 0.4);
    toyBox.add(box);
    items.push({ mesh: toyBox, name: 'toy_box', tags: ['container', 'toy'], interactable: true });

    // Scatter some toy blocks
    for (let i = 0; i < 4; i++) {
      const colors = [0xff4444, 0x4488ff, 0x44cc44, 0xffcc00];
      const block = this.makeBox(0.1, 0.1, 0.1, this.rng.pick(colors), 0.4);
      block.position.set(
        this.rng.nextFloat(-1, 1),
        0.05,
        this.rng.nextFloat(0, hd - 0.5),
      );
      block.rotation.y = this.rng.nextFloat(0, Math.PI);
      const blockGroup = new THREE.Group();
      blockGroup.name = `toy_block_${i}`;
      blockGroup.add(block);
      items.push({ mesh: blockGroup, name: `toy_block_${i}`, tags: ['toy'], interactable: true });
    }

    // Bookshelf
    const bookshelf = new THREE.Group();
    bookshelf.name = 'bookshelf';
    const shelfFrame = this.makeBox(0.8, 1.8, 0.3, 0x5c4030);
    shelfFrame.position.set(-hw + 0.2, 0.9, -hd + 0.15);
    bookshelf.add(shelfFrame);
    // Books as colored blocks on shelves
    for (let shelf = 0; shelf < 4; shelf++) {
      for (let b = 0; b < 3; b++) {
        const bookColors = [0x8b0000, 0x00008b, 0x006400, 0x8b8b00, 0x4b0082];
        const book = this.makeBox(0.06, 0.2, 0.18, this.rng.pick(bookColors));
        book.position.set(-hw + 0.05 + b * 0.12, 0.2 + shelf * 0.45, -hd + 0.15);
        bookshelf.add(book);
      }
    }
    items.push({ mesh: bookshelf, name: 'bookshelf', tags: ['furniture'], interactable: true });

    return items;
  }

  private bathroomFurniture(room: RoomNode): FurnitureItem[] {
    const items: FurnitureItem[] = [];
    const hw = room.width / 2 - 0.2;
    const hd = room.depth / 2 - 0.2;

    // Bathtub
    const tub = new THREE.Group();
    tub.name = 'bathtub';
    const tubBody = this.makeBox(1.5, 0.5, 0.7, 0xf0f0f0, 0.2);
    tubBody.position.set(0, 0.25, -hd + 0.35);
    tub.add(tubBody);
    // Inner depression (darker)
    const tubInner = this.makeBox(1.3, 0.3, 0.5, 0xddeeff, 0.1);
    tubInner.position.set(0, 0.35, -hd + 0.35);
    tub.add(tubInner);
    // Faucet
    const tubFaucet = this.makeCylinder(0.02, 0.2, 0xcccccc);
    tubFaucet.position.set(0.5, 0.6, -hd + 0.15);
    tub.add(tubFaucet);
    items.push({ mesh: tub, name: 'bathtub', tags: ['liquid_source'], interactable: true });

    // Toilet
    const toilet = new THREE.Group();
    toilet.name = 'toilet';
    const toiletBase = this.makeBox(0.4, 0.35, 0.5, 0xf0f0f0, 0.2);
    toiletBase.position.set(hw - 0.3, 0.175, hd - 0.35);
    toilet.add(toiletBase);
    const toiletTank = this.makeBox(0.35, 0.35, 0.15, 0xf0f0f0, 0.2);
    toiletTank.position.set(hw - 0.3, 0.4, hd - 0.08);
    toilet.add(toiletTank);
    items.push({ mesh: toilet, name: 'toilet', tags: ['hygiene'], interactable: true });

    // Bathroom sink
    const sink = new THREE.Group();
    sink.name = 'bathroom_sink';
    const sinkBasin = this.makeBox(0.5, 0.1, 0.35, 0xf0f0f0, 0.2);
    sinkBasin.position.set(-hw + 0.35, 0.8, hd - 0.25);
    sink.add(sinkBasin);
    const sinkFaucet = this.makeCylinder(0.015, 0.15, 0xcccccc);
    sinkFaucet.position.set(-hw + 0.35, 0.92, hd - 0.1);
    sink.add(sinkFaucet);
    // Mirror
    const mirror = this.makeBox(0.5, 0.6, 0.03, 0xaaccee, 0.05);
    mirror.position.set(-hw + 0.35, 1.4, hd - 0.02);
    sink.add(mirror);
    items.push({ mesh: sink, name: 'bathroom_sink', tags: ['liquid_source', 'hygiene'], interactable: true });

    // Towel rack
    const towelRack = new THREE.Group();
    towelRack.name = 'towel_rack';
    const rack = this.makeBox(0.5, 0.03, 0.05, 0xcccccc, 0.3);
    rack.position.set(0, 1.2, hd - 0.05);
    towelRack.add(rack);
    const towel = this.makeBox(0.4, 0.5, 0.03, 0x66aadd, 0.9);
    towel.position.set(0, 0.9, hd - 0.07);
    towelRack.add(towel);
    items.push({ mesh: towelRack, name: 'towel_rack', tags: ['hygiene'], interactable: true });

    // Rubber duck
    if (this.rng.chance(0.8)) {
      const duck = this.makeCylinder(0.04, 0.06, 0xffdd00);
      duck.position.set(0.3, 0.55, -hd + 0.35);
      const duckGroup = new THREE.Group();
      duckGroup.name = 'rubber_duck';
      duckGroup.add(duck);
      items.push({ mesh: duckGroup, name: 'rubber_duck', tags: ['toy'], interactable: true });
    }

    return items;
  }

  private bedroomFurniture(room: RoomNode): FurnitureItem[] {
    const items: FurnitureItem[] = [];
    const hw = room.width / 2 - 0.3;
    const hd = room.depth / 2 - 0.3;

    // Bed
    const bed = new THREE.Group();
    bed.name = 'bed';
    const mattress = this.makeBox(1.0, 0.25, 1.8, 0xeeddcc, 0.8);
    mattress.position.set(-hw + 0.6, 0.35, 0);
    bed.add(mattress);
    const bedFrame = this.makeBox(1.1, 0.22, 1.9, 0x6b4226);
    bedFrame.position.set(-hw + 0.6, 0.11, 0);
    bed.add(bedFrame);
    // Pillow
    const pillow = this.makeBox(0.4, 0.1, 0.3, 0xffffff, 0.9);
    pillow.position.set(-hw + 0.6, 0.52, -0.65);
    bed.add(pillow);
    // Headboard
    const headboard = this.makeBox(1.1, 0.6, 0.08, 0x6b4226);
    headboard.position.set(-hw + 0.6, 0.6, -0.95);
    bed.add(headboard);
    items.push({ mesh: bed, name: 'bed', tags: ['furniture'], interactable: true });

    // Nightlight
    const nightlight = new THREE.Group();
    nightlight.name = 'nightlight';
    const nlBase = this.makeBox(0.06, 0.06, 0.04, 0xffeedd, 0.3);
    nlBase.position.set(-hw + 0.05, 0.3, -0.3);
    nightlight.add(nlBase);
    items.push({ mesh: nightlight, name: 'nightlight', tags: ['electronic'], interactable: true });

    // Dresser
    const dresser = new THREE.Group();
    dresser.name = 'dresser';
    const dresserBody = this.makeBox(0.8, 1.0, 0.45, 0x8b6f47);
    dresserBody.position.set(hw - 0.4, 0.5, -hd + 0.25);
    dresser.add(dresserBody);
    // Drawer handles
    for (let dy = 0; dy < 3; dy++) {
      const handle = this.makeBox(0.15, 0.02, 0.02, 0xcccccc, 0.3);
      handle.position.set(hw - 0.4, 0.25 + dy * 0.3, -hd + 0.48);
      dresser.add(handle);
    }
    items.push({ mesh: dresser, name: 'dresser', tags: ['container', 'furniture'], interactable: true });

    // Stuffed animal
    const stuffedAnimal = this.makeCylinder(0.1, 0.15, this.rng.pick([0xcc8844, 0xffaacc, 0xaaddff]));
    stuffedAnimal.position.set(-hw + 0.6, 0.55, 0.3);
    const stuffedGroup = new THREE.Group();
    stuffedGroup.name = 'stuffed_animal';
    stuffedGroup.add(stuffedAnimal);
    items.push({ mesh: stuffedGroup, name: 'stuffed_animal', tags: ['toy'], interactable: true });

    return items;
  }

  private masterBedroomFurniture(room: RoomNode): FurnitureItem[] {
    const items: FurnitureItem[] = [];
    const hw = room.width / 2 - 0.3;
    const hd = room.depth / 2 - 0.3;

    // Large bed
    const bed = new THREE.Group();
    bed.name = 'master_bed';
    const mattress = this.makeBox(1.6, 0.3, 2.0, 0xeeddcc, 0.8);
    mattress.position.set(0, 0.4, -hd + 1.0);
    bed.add(mattress);
    const bedFrame = this.makeBox(1.7, 0.25, 2.1, 0x5c3a1a);
    bedFrame.position.set(0, 0.125, -hd + 1.0);
    bed.add(bedFrame);
    const headboard = this.makeBox(1.7, 0.8, 0.08, 0x5c3a1a);
    headboard.position.set(0, 0.7, -hd + 0.02);
    bed.add(headboard);
    for (const dx of [-0.4, 0.4]) {
      const pillow = this.makeBox(0.35, 0.1, 0.3, 0xffffff, 0.9);
      pillow.position.set(dx, 0.6, -hd + 0.3);
      bed.add(pillow);
    }
    items.push({ mesh: bed, name: 'master_bed', tags: ['furniture'], interactable: true });

    // Two nightstands
    for (const side of [-1, 1]) {
      const stand = new THREE.Group();
      stand.name = `nightstand_${side > 0 ? 'right' : 'left'}`;
      const standBody = this.makeBox(0.4, 0.5, 0.35, 0x6b4226);
      standBody.position.set(side * 1.1, 0.25, -hd + 0.3);
      stand.add(standBody);
      // Lamp
      const lampBase = this.makeCylinder(0.06, 0.02, 0x8b6f47);
      lampBase.position.set(side * 1.1, 0.52, -hd + 0.3);
      stand.add(lampBase);
      const lampShade = this.makeCylinder(0.08, 0.15, 0xfff8e0);
      lampShade.position.set(side * 1.1, 0.65, -hd + 0.3);
      stand.add(lampShade);
      items.push({ mesh: stand, name: stand.name, tags: ['furniture'], interactable: true });
    }

    return items;
  }

  private playroomFurniture(room: RoomNode): FurnitureItem[] {
    const items: FurnitureItem[] = [];
    const hw = room.width / 2 - 0.3;
    const hd = room.depth / 2 - 0.3;

    // Toy box
    const toyBox = this.makeBox(0.8, 0.5, 0.5, 0xff6633, 0.7);
    toyBox.position.set(-hw + 0.5, 0.25, -hd + 0.3);
    const toyBoxGroup = new THREE.Group();
    toyBoxGroup.name = 'toy_box';
    toyBoxGroup.add(toyBox);
    items.push({ mesh: toyBoxGroup, name: 'toy_box', tags: ['container', 'toy'], interactable: true });

    // Small table
    const table = this.makeTable(0, 0.3, 0.8, 0.6, 0xddcc99);
    items.push({ mesh: table, name: 'play_table', tags: ['furniture'], interactable: true });

    // Scattered toys
    const toyColors = [0xff4444, 0x4488ff, 0x44cc44, 0xffcc00, 0xff44ff, 0x44ffff];
    for (let i = 0; i < 8; i++) {
      const block = this.makeBox(0.12, 0.12, 0.12, this.rng.pick(toyColors), 0.4);
      block.position.set(
        this.rng.nextFloat(-hw + 0.2, hw - 0.2),
        0.06,
        this.rng.nextFloat(-hd + 0.2, hd - 0.2),
      );
      block.rotation.y = this.rng.nextFloat(0, Math.PI * 2);
      const group = new THREE.Group();
      group.name = `play_block_${i}`;
      group.add(block);
      items.push({ mesh: group, name: `play_block_${i}`, tags: ['toy'], interactable: true });
    }

    // Crayon box
    const crayonBox = this.makeBox(0.2, 0.08, 0.12, 0x44aa44);
    crayonBox.position.set(0, 0.35, 0);
    const crayonGroup = new THREE.Group();
    crayonGroup.name = 'crayons';
    crayonGroup.add(crayonBox);
    items.push({ mesh: crayonGroup, name: 'crayons', tags: ['toy'], interactable: true });

    return items;
  }

  private diningRoomFurniture(room: RoomNode): FurnitureItem[] {
    const items: FurnitureItem[] = [];

    // Dining table
    const table = this.makeTable(0, 0.4, 1.6, 0.9, 0x6b4226);
    items.push({ mesh: table, name: 'dining_table', tags: ['furniture'], interactable: true });

    // Chairs
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const cx = Math.sin(angle) * 1.1;
      const cz = Math.cos(angle) * 0.6;
      const chair = new THREE.Group();
      chair.name = `dining_chair_${i}`;
      const seat = this.makeBox(0.4, 0.04, 0.4, 0x6b4226);
      seat.position.set(cx, 0.45, cz);
      chair.add(seat);
      const back = this.makeBox(0.4, 0.45, 0.04, 0x6b4226);
      back.position.set(cx, 0.7, cz - 0.18);
      chair.add(back);
      for (const dx of [-0.15, 0.15]) {
        for (const dz of [-0.15, 0.15]) {
          const leg = this.makeBox(0.03, 0.45, 0.03, 0x6b4226);
          leg.position.set(cx + dx, 0.225, cz + dz);
          chair.add(leg);
        }
      }
      items.push({ mesh: chair, name: `dining_chair_${i}`, tags: ['furniture'], interactable: true });
    }

    return items;
  }

  private laundryFurniture(room: RoomNode): FurnitureItem[] {
    const items: FurnitureItem[] = [];
    const hd = room.depth / 2 - 0.2;

    // Washing machine
    const washer = this.makeBox(0.6, 0.85, 0.6, 0xdddddd, 0.2);
    washer.position.set(-0.4, 0.425, -hd + 0.3);
    const washerGroup = new THREE.Group();
    washerGroup.name = 'washer';
    washerGroup.add(washer);
    // Door circle
    const door = this.makeCylinder(0.15, 0.02, 0x888888);
    door.rotation.x = Math.PI / 2;
    door.position.set(-0.4, 0.5, -hd + 0.61);
    washerGroup.add(door);
    items.push({ mesh: washerGroup, name: 'washer', tags: ['electronic'], interactable: true });

    // Dryer
    const dryer = this.makeBox(0.6, 0.85, 0.6, 0xdddddd, 0.2);
    dryer.position.set(0.4, 0.425, -hd + 0.3);
    const dryerGroup = new THREE.Group();
    dryerGroup.name = 'dryer';
    dryerGroup.add(dryer);
    items.push({ mesh: dryerGroup, name: 'dryer', tags: ['electronic'], interactable: true });

    return items;
  }

  private makeTable(x: number, height: number, width: number, depth: number, color: number): THREE.Group {
    const group = new THREE.Group();
    const top = this.makeBox(width, 0.04, depth, color);
    top.position.set(x, height, 0);
    group.add(top);
    const legW = width / 2 - 0.05;
    const legD = depth / 2 - 0.05;
    for (const dx of [-legW, legW]) {
      for (const dz of [-legD, legD]) {
        const leg = this.makeBox(0.04, height, 0.04, color);
        leg.position.set(x + dx, height / 2, dz);
        group.add(leg);
      }
    }
    group.name = 'table';
    return group;
  }
}
