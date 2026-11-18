import * as THREE from 'three';

export interface BanditProp {
  group: THREE.Group;
  aimArm: THREE.Group;
  head: THREE.Group;
}

export interface BlowMachineProp {
  group: THREE.Group;
  fanRotor: THREE.Group;
  windRings: THREE.Mesh[];
}

/**
 * Stylized cartoon desert bandit holding a chunky brass/wood blunderbuss pistol.
 */
export function buildBanditWithGun(
  trackDisposable: (d: { dispose: () => void }) => void
): BanditProp {
  const group = new THREE.Group();

  const cloakMat = new THREE.MeshStandardMaterial({
    color: 0x312e81,
    roughness: 0.78,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.65,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xfdba74,
    roughness: 0.7,
  });
  const maskMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.85,
  });
  const turbanMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.6,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.75,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.82,
  });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.1,
  });

  [
    cloakMat,
    vestMat,
    skinMat,
    maskMat,
    turbanMat,
    woodMat,
    brassMat,
    eyeWhiteMat,
    pupilMat,
  ].forEach(trackDisposable);

  // Boots
  const bootGeo = new THREE.CapsuleGeometry(0.11, 0.16, 6, 8);
  trackDisposable(bootGeo);
  const bootL = new THREE.Mesh(bootGeo, maskMat);
  bootL.position.set(-0.16, 0.15, 0);
  bootL.castShadow = true;
  group.add(bootL);
  const bootR = new THREE.Mesh(bootGeo, maskMat);
  bootR.position.set(0.16, 0.15, 0);
  bootR.castShadow = true;
  group.add(bootR);

  // Tunic / Torso
  const bodyGeo = new THREE.CylinderGeometry(0.24, 0.34, 0.78, 12);
  trackDisposable(bodyGeo);
  const body = new THREE.Mesh(bodyGeo, cloakMat);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);

  // Crimson Vest & Belt
  const vestGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.45, 12);
  trackDisposable(vestGeo);
  const vest = new THREE.Mesh(vestGeo, vestMat);
  vest.position.y = 0.74;
  group.add(vest);

  const beltGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.1, 12);
  trackDisposable(beltGeo);
  const belt = new THREE.Mesh(beltGeo, brassMat);
  belt.position.y = 0.5;
  group.add(belt);

  // Head + Turban + Mask
  const head = new THREE.Group();
  head.position.set(0, 1.18, 0);
  group.add(head);

  const headGeo = new THREE.SphereGeometry(0.22, 14, 12);
  trackDisposable(headGeo);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  const maskGeo = new THREE.CylinderGeometry(0.23, 0.22, 0.16, 14);
  trackDisposable(maskGeo);
  const maskMesh = new THREE.Mesh(maskGeo, maskMat);
  maskMesh.position.y = -0.06;
  head.add(maskMesh);

  const turbanGeo = new THREE.TorusGeometry(0.2, 0.1, 10, 16);
  const turbanTopGeo = new THREE.SphereGeometry(0.19, 12, 10);
  trackDisposable(turbanGeo);
  trackDisposable(turbanTopGeo);
  const turban = new THREE.Mesh(turbanGeo, turbanMat);
  turban.rotation.x = Math.PI / 2;
  turban.position.y = 0.12;
  head.add(turban);
  const turbanTop = new THREE.Mesh(turbanTopGeo, vestMat);
  turbanTop.position.y = 0.18;
  head.add(turbanTop);

  // Mischievous cartoon eyes
  const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const pupGeo = new THREE.SphereGeometry(0.03, 8, 8);
  trackDisposable(eyeGeo);
  trackDisposable(pupGeo);
  [-0.08, 0.08].forEach((ex) => {
    const ew = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    ew.position.set(ex, 0.04, 0.19);
    head.add(ew);
    const ep = new THREE.Mesh(pupGeo, pupilMat);
    ep.position.set(ex, 0.04, 0.235);
    head.add(ep);
  });

  // Left arm (resting)
  const armGeo = new THREE.CapsuleGeometry(0.075, 0.34, 6, 8);
  trackDisposable(armGeo);
  const armL = new THREE.Mesh(armGeo, cloakMat);
  armL.position.set(-0.32, 0.72, 0.04);
  armL.rotation.z = 0.35;
  group.add(armL);

  // Right arm holding Cartoon Blunderbuss Gun
  const aimArm = new THREE.Group();
  aimArm.position.set(0.28, 0.85, 0.05);
  group.add(aimArm);

  const armR = new THREE.Mesh(armGeo, cloakMat);
  armR.rotation.x = Math.PI / 2;
  armR.position.set(0, -0.02, 0.22);
  aimArm.add(armR);

  // Stylized cartoon blunderbuss (wood grip + brass barrel + flared muzzle)
  const stockGeo = new THREE.BoxGeometry(0.1, 0.13, 0.36);
  const barrelGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.44, 10);
  const funnelGeo = new THREE.CylinderGeometry(0.12, 0.055, 0.16, 12);
  trackDisposable(stockGeo);
  trackDisposable(barrelGeo);
  trackDisposable(funnelGeo);

  const stock = new THREE.Mesh(stockGeo, woodMat);
  stock.position.set(0, 0.02, 0.44);
  aimArm.add(stock);

  const barrel = new THREE.Mesh(barrelGeo, brassMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.08, 0.6);
  barrel.castShadow = true;
  aimArm.add(barrel);

  const funnel = new THREE.Mesh(funnelGeo, brassMat);
  funnel.rotation.x = Math.PI / 2;
  funnel.position.set(0, 0.08, 0.86);
  aimArm.add(funnel);

  return { group, aimArm, head };
}

/**
 * Stylized cartoon Desert Wind Blow Machine with spinning rotor & gust rings.
 */
export function buildBlowMachine(
  trackDisposable: (d: { dispose: () => void }) => void
): BlowMachineProp {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.8,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.78,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.45,
    metalness: 0.6,
  });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.3,
    metalness: 0.35,
  });
  const windMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  [woodMat, brassMat, darkIronMat, bladeMat, windMat].forEach(trackDisposable);

  // Wooden Base Cart + 4 Wheels
  const baseGeo = new THREE.BoxGeometry(0.9, 0.16, 1.05);
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12);
  trackDisposable(baseGeo);
  trackDisposable(wheelGeo);

  const cart = new THREE.Mesh(baseGeo, woodMat);
  cart.position.y = 0.22;
  cart.castShadow = true;
  group.add(cart);

  [
    [-0.48, 0.22, 0.34],
    [0.48, 0.22, 0.34],
    [-0.48, 0.22, -0.34],
    [0.48, 0.22, -0.34],
  ].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(wheelGeo, darkIronMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    group.add(w);
  });

  // Blower Drum Housing
  const drumGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.62, 16);
  const nozzleGeo = new THREE.CylinderGeometry(0.46, 0.26, 0.58, 16);
  const rimGeo = new THREE.TorusGeometry(0.46, 0.055, 8, 20);
  trackDisposable(drumGeo);
  trackDisposable(nozzleGeo);
  trackDisposable(rimGeo);

  const drum = new THREE.Mesh(drumGeo, darkIronMat);
  drum.rotation.x = Math.PI / 2;
  drum.position.set(0, 0.72, -0.08);
  drum.castShadow = true;
  group.add(drum);

  const nozzle = new THREE.Mesh(nozzleGeo, brassMat);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.set(0, 0.72, 0.48);
  nozzle.castShadow = true;
  group.add(nozzle);

  const nozzleRim = new THREE.Mesh(rimGeo, brassMat);
  nozzleRim.position.set(0, 0.72, 0.77);
  group.add(nozzleRim);

  // Spinning Fan Rotor (at back/front intake)
  const fanRotor = new THREE.Group();
  fanRotor.position.set(0, 0.72, -0.42);
  group.add(fanRotor);

  const hubGeo = new THREE.SphereGeometry(0.11, 10, 10);
  const bladeGeo = new THREE.BoxGeometry(0.12, 0.34, 0.03);
  trackDisposable(hubGeo);
  trackDisposable(bladeGeo);

  fanRotor.add(new THREE.Mesh(hubGeo, brassMat));
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    const angle = (b * Math.PI) / 2;
    blade.position.set(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, 0);
    blade.rotation.z = angle + Math.PI / 2;
    blade.rotation.y = 0.35;
    fanRotor.add(blade);
  }

  // Animated Wind Gust Rings shooting out of nozzle
  const windRingGeo = new THREE.TorusGeometry(0.32, 0.035, 8, 18);
  trackDisposable(windRingGeo);
  const windRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const wr = new THREE.Mesh(windRingGeo, windMat);
    wr.position.set(0, 0.72, 0.9 + i * 0.45);
    wr.userData.phase = i / 3;
    group.add(wr);
    windRings.push(wr);
  }

  return { group, fanRotor, windRings };
}

/**
 * Floating Golden Star Power-Up Pedestal beside Power-Up tiles.
 */
export function buildPowerUpPedestal(
  trackDisposable: (d: { dispose: () => void }) => void
): { group: THREE.Group; crystal: THREE.Mesh } {
  const group = new THREE.Group();

  const pedMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.45,
  });
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.7,
  });
  const pedGeo = new THREE.CylinderGeometry(0.32, 0.42, 0.52, 8);
  const starGeo = new THREE.OctahedronGeometry(0.3, 0);
  [pedMat, starMat, pedGeo, starGeo].forEach(trackDisposable);

  const ped = new THREE.Mesh(pedGeo, pedMat);
  ped.position.y = 0.26;
  ped.castShadow = true;
  group.add(ped);

  const crystal = new THREE.Mesh(starGeo, starMat);
  crystal.position.y = 0.92;
  crystal.castShadow = true;
  group.add(crystal);

  return { group, crystal };
}

/**
 * Stylized Distant Desert City Skyline nestled between two giant background dunes.
 */
export function buildDistantDesertCity(
  trackDisposable: (d: { dispose: () => void }) => void
): { group: THREE.Group; windowMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.85,
  });
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.82,
  });
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    roughness: 0.35,
    metalness: 0.25,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.25,
    metalness: 0.85,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });

  [wallMat, towerMat, domeMat, goldMat, windowMat].forEach(trackDisposable);

  // City rampart wall
  const rampartGeo = new THREE.BoxGeometry(34, 6, 4);
  trackDisposable(rampartGeo);
  const rampart = new THREE.Mesh(rampartGeo, wallMat);
  rampart.position.set(0, 3, 0);
  group.add(rampart);

  // Palaces, domes & towers across the skyline
  const buildings = [
    { x: -12, w: 5.5, h: 11, d: 5, dome: true },
    { x: -6.2, w: 4.5, h: 15, d: 4.5, dome: false },
    { x: 0, w: 8.5, h: 16, d: 7, dome: true },
    { x: 6.8, w: 4.2, h: 14, d: 4.5, dome: false },
    { x: 12.5, w: 5.2, h: 10.5, d: 5, dome: true },
  ];

  buildings.forEach((b, idx) => {
    const bGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
    trackDisposable(bGeo);
    const mesh = new THREE.Mesh(bGeo, idx % 2 === 0 ? wallMat : towerMat);
    mesh.position.set(b.x, b.h / 2, -1.5);
    group.add(mesh);

    if (b.dome) {
      const domeGeo = new THREE.SphereGeometry(b.w * 0.44, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const spireGeo = new THREE.ConeGeometry(0.32, 2.2, 8);
      trackDisposable(domeGeo);
      trackDisposable(spireGeo);

      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.set(b.x, b.h, -1.5);
      group.add(dome);

      const spire = new THREE.Mesh(spireGeo, goldMat);
      spire.position.set(b.x, b.h + b.w * 0.42 + 0.8, -1.5);
      group.add(spire);
    } else {
      const roofGeo = new THREE.ConeGeometry(b.w * 0.6, 4.2, 6);
      trackDisposable(roofGeo);
      const roof = new THREE.Mesh(roofGeo, domeMat);
      roof.position.set(b.x, b.h + 2.1, -1.5);
      group.add(roof);
    }

    // Glowing windows on front facade
    const winGeo = new THREE.BoxGeometry(0.9, 1.4, 0.3);
    trackDisposable(winGeo);
    for (let row = 0; row < 2; row++) {
      const win = new THREE.Mesh(winGeo, windowMat);
      win.position.set(b.x, b.h * 0.48 + row * 2.8, b.d * 0.5 - 1.4);
      group.add(win);
    }
  });

  // Two Flanking Tall Dunes Framing the City Gap
  const flankDuneGeo = new THREE.SphereGeometry(28, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const flankDuneMat = new THREE.MeshStandardMaterial({
    color: 0xe6a145,
    roughness: 0.9,
  });
  trackDisposable(flankDuneGeo);
  trackDisposable(flankDuneMat);

  const leftDune = new THREE.Mesh(flankDuneGeo, flankDuneMat);
  leftDune.scale.set(1.35, 0.72, 1.1);
  leftDune.position.set(-34, -2, 16);
  group.add(leftDune);

  const rightDune = new THREE.Mesh(flankDuneGeo, flankDuneMat);
  rightDune.scale.set(1.4, 0.76, 1.1);
  rightDune.position.set(34, -2, 14);
  group.add(rightDune);

  return { group, windowMat };
}
