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

/**
 * Checkpoint Banner Arch (Tiles 10, 20, 30, 40)
 */
export function buildCheckpointGate(
  checkpointIndex: number,
  trackDisposable: (d: { dispose: () => void }) => void
): THREE.Group {
  const group = new THREE.Group();

  const postMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.4,
    metalness: 0.4,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.25,
    roughness: 0.25,
    metalness: 0.75,
  });

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 248, 56);
  ctx.fillStyle = '#FEF08A';
  ctx.font = '800 28px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`CHECKPOINT ${checkpointIndex}`, 128, 33);

  const signTex = new THREE.CanvasTexture(canvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.35,
    roughness: 0.45,
  });

  const postGeo = new THREE.CylinderGeometry(0.11, 0.14, 2.55, 8);
  const capGeo = new THREE.SphereGeometry(0.16, 10, 10);
  const bannerGeo = new THREE.BoxGeometry(2.9, 0.62, 0.18);
  [postMat, goldMat, signTex, signMat, postGeo, capGeo, bannerGeo].forEach(
    trackDisposable
  );

  [-1.42, 1.42].forEach((px) => {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(px, 1.28, 0);
    post.castShadow = true;
    group.add(post);

    const cap = new THREE.Mesh(capGeo, goldMat);
    cap.position.set(px, 2.62, 0);
    group.add(cap);
  });

  const banner = new THREE.Mesh(bannerGeo, signMat);
  banner.position.set(0, 2.45, 0);
  banner.castShadow = true;
  group.add(banner);

  return group;
}

export interface CrocodileProp {
  group: THREE.Group;
  tailPivot: THREE.Group;
  jawPivot: THREE.Group;
}

/**
 * Stylized Cartoon Crocodile sunbathing on the Middle Oasis Island.
 */
export function buildCrocodile(
  trackDisposable: (d: { dispose: () => void }) => void
): CrocodileProp {
  const group = new THREE.Group();

  const scaleMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.6,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xbef264,
    roughness: 0.72,
  });
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.55,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.2,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.1,
  });
  const toothMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
  });

  [scaleMat, bellyMat, ridgeMat, eyeMat, pupilMat, toothMat].forEach(
    trackDisposable
  );

  // Body & Belly
  const bodyGeo = new THREE.CapsuleGeometry(0.32, 0.95, 8, 12);
  const legGeo = new THREE.CapsuleGeometry(0.085, 0.22, 6, 8);
  const snoutGeo = new THREE.BoxGeometry(0.42, 0.16, 0.65);
  const jawGeo = new THREE.BoxGeometry(0.38, 0.1, 0.6);
  const toothGeo = new THREE.ConeGeometry(0.035, 0.09, 5);
  const eyeGeo = new THREE.SphereGeometry(0.075, 10, 10);
  const pupGeo = new THREE.SphereGeometry(0.038, 8, 8);
  const ridgeGeo = new THREE.ConeGeometry(0.08, 0.16, 4);

  [
    bodyGeo,
    legGeo,
    snoutGeo,
    jawGeo,
    toothGeo,
    eyeGeo,
    pupGeo,
    ridgeGeo,
  ].forEach(trackDisposable);

  const body = new THREE.Mesh(bodyGeo, scaleMat);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1.15, 1.0, 0.72);
  body.position.set(0, 0.24, 0);
  body.castShadow = true;
  group.add(body);

  // Back ridges
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(ridgeGeo, ridgeMat);
    r.position.set(0, 0.45, -0.35 + i * 0.24);
    group.add(r);
  }

  // 4 stubby legs
  [
    [-0.36, 0.14, 0.36],
    [0.36, 0.14, 0.36],
    [-0.36, 0.14, -0.36],
    [0.36, 0.14, -0.36],
  ].forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, scaleMat);
    leg.rotation.z = lx < 0 ? 0.9 : -0.9;
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Upper Snout + Eyes
  const upperSnout = new THREE.Mesh(snoutGeo, scaleMat);
  upperSnout.position.set(0, 0.28, 0.85);
  upperSnout.castShadow = true;
  group.add(upperSnout);

  [-0.14, 0.14].forEach((ex) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ex, 0.41, 0.65);
    group.add(eye);
    const pup = new THREE.Mesh(pupGeo, pupilMat);
    pup.position.set(ex, 0.42, 0.71);
    group.add(pup);
  });

  // Teeth along upper snout
  for (let i = 0; i < 3; i++) {
    [-0.17, 0.17].forEach((tx) => {
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.rotation.x = Math.PI;
      tooth.position.set(tx, 0.18, 0.75 + i * 0.17);
      group.add(tooth);
    });
  }

  // Hinged Lower Jaw
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0.18, 0.56);
  group.add(jawPivot);
  const lowerJaw = new THREE.Mesh(jawGeo, bellyMat);
  lowerJaw.position.set(0, -0.02, 0.28);
  jawPivot.add(lowerJaw);

  // Articulated Segmented Tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.22, -0.62);
  group.add(tailPivot);
  const tailGeo = new THREE.ConeGeometry(0.24, 1.05, 8);
  trackDisposable(tailGeo);
  const tailMesh = new THREE.Mesh(tailGeo, scaleMat);
  tailMesh.rotation.x = -Math.PI / 2;
  tailMesh.position.set(0, 0, -0.45);
  tailMesh.castShadow = true;
  tailPivot.add(tailMesh);

  return { group, tailPivot, jawPivot };
}

export interface ParrotProp {
  group: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
}

/**
 * Colorful Flying Tropical Parrot circling above the oasis.
 */
export function buildFlyingParrot(
  trackDisposable: (d: { dispose: () => void }) => void
): ParrotProp {
  const group = new THREE.Group();

  const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });
  [redMat, blueMat, goldMat, beakMat, eyeMat].forEach(trackDisposable);

  const bodyGeo = new THREE.CapsuleGeometry(0.18, 0.42, 8, 10);
  const headGeo = new THREE.SphereGeometry(0.17, 10, 10);
  const beakGeo = new THREE.ConeGeometry(0.08, 0.22, 6);
  const tailGeo = new THREE.BoxGeometry(0.16, 0.04, 0.56);
  const wingGeo = new THREE.BoxGeometry(0.62, 0.045, 0.3);
  const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
  [bodyGeo, headGeo, beakGeo, tailGeo, wingGeo, eyeGeo].forEach(trackDisposable);

  const body = new THREE.Mesh(bodyGeo, redMat);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(headGeo, redMat);
  head.position.set(0, 0.08, 0.34);
  group.add(head);

  const beak = new THREE.Mesh(beakGeo, beakMat);
  beak.rotation.x = Math.PI / 2 + 0.35;
  beak.position.set(0, 0.04, 0.52);
  group.add(beak);

  [-0.12, 0.12].forEach((ex) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ex, 0.12, 0.42);
    group.add(eye);
  });

  const tail = new THREE.Mesh(tailGeo, blueMat);
  tail.position.set(0, -0.02, -0.48);
  group.add(tail);

  const wingL = new THREE.Group();
  wingL.position.set(-0.15, 0.05, 0.05);
  const wingMeshL = new THREE.Mesh(wingGeo, blueMat);
  wingMeshL.position.set(-0.31, 0, 0);
  wingMeshL.castShadow = true;
  wingL.add(wingMeshL);
  const tipL = new THREE.Mesh(wingGeo, goldMat);
  tipL.scale.set(0.45, 0.9, 0.8);
  tipL.position.set(-0.55, 0, -0.02);
  wingL.add(tipL);
  group.add(wingL);

  const wingR = new THREE.Group();
  wingR.position.set(0.15, 0.05, 0.05);
  const wingMeshR = new THREE.Mesh(wingGeo, blueMat);
  wingMeshR.position.set(0.31, 0, 0);
  wingMeshR.castShadow = true;
  wingR.add(wingMeshR);
  const tipR = new THREE.Mesh(wingGeo, goldMat);
  tipR.scale.set(0.45, 0.9, 0.8);
  tipR.position.set(0.55, 0, -0.02);
  wingR.add(tipR);
  group.add(wingR);

  return { group, wingL, wingR };
}

export interface SailShipProp {
  group: THREE.Group;
  lanternMat: THREE.MeshStandardMaterial;
}

/**
 * Desert Lagoon Sail Ship (stylized wooden dhow with billowing sail & bow lantern).
 */
export function buildSailShip(
  trackDisposable: (d: { dispose: () => void }) => void
): SailShipProp {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.72 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xffb74d,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });

  [hullMat, deckMat, sailMat, stripeMat, lanternMat].forEach(trackDisposable);

  const hullGeo = new THREE.CylinderGeometry(0.65, 0.42, 2.4, 10);
  const bowGeo = new THREE.ConeGeometry(0.62, 0.95, 8);
  const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.9, 8);
  const yardGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
  const sailGeo = new THREE.ConeGeometry(0.95, 2.25, 3);
  const flagGeo = new THREE.BoxGeometry(0.04, 0.24, 0.45);
  const lanternGeo = new THREE.SphereGeometry(0.14, 10, 10);

  [hullGeo, bowGeo, mastGeo, yardGeo, sailGeo, flagGeo, lanternGeo].forEach(
    trackDisposable
  );

  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1.0, 1.0, 0.52);
  hull.position.y = 0.22;
  hull.castShadow = true;
  group.add(hull);

  const bow = new THREE.Mesh(bowGeo, deckMat);
  bow.rotation.x = Math.PI / 2;
  bow.scale.set(1.0, 1.0, 0.52);
  bow.position.set(0, 0.26, 1.55);
  group.add(bow);

  const mast = new THREE.Mesh(mastGeo, deckMat);
  mast.position.set(0, 1.65, 0.1);
  mast.castShadow = true;
  group.add(mast);

  const yard = new THREE.Mesh(yardGeo, deckMat);
  yard.rotation.x = 1.05;
  yard.position.set(0, 2.25, 0.25);
  group.add(yard);

  const sail = new THREE.Mesh(sailGeo, sailMat);
  sail.scale.set(0.18, 1.0, 0.95);
  sail.position.set(0, 1.65, 0.28);
  sail.castShadow = true;
  group.add(sail);

  const flag = new THREE.Mesh(flagGeo, stripeMat);
  flag.position.set(0, 3.05, -0.15);
  group.add(flag);

  const bowLantern = new THREE.Mesh(lanternGeo, lanternMat);
  bowLantern.position.set(0, 0.65, 1.9);
  group.add(bowLantern);

  return { group, lanternMat };
}

export interface DesertTentProp {
  group: THREE.Group;
  lanternMat: THREE.MeshStandardMaterial;
}

/**
 * Striped Desert Nomad / Bazaar Tent with glowing camp lantern.
 */
export function buildDesertTent(
  primaryHex: number,
  accentHex: number,
  trackDisposable: (d: { dispose: () => void }) => void
): DesertTentProp {
  const group = new THREE.Group();

  const fabricMat = new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.85 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.85 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.3,
    metalness: 0.7,
  });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xffa726,
    emissiveIntensity: 0.3,
    roughness: 0.2,
  });

  [fabricMat, accentMat, poleMat, goldMat, lanternMat].forEach(trackDisposable);

  const baseGeo = new THREE.CylinderGeometry(1.75, 2.05, 1.25, 8);
  const roofGeo = new THREE.ConeGeometry(2.15, 1.55, 8);
  const capGeo = new THREE.ConeGeometry(1.05, 0.8, 8);
  const spireGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.75, 6);
  const lanternGeo = new THREE.SphereGeometry(0.18, 10, 10);

  [baseGeo, roofGeo, capGeo, spireGeo, postGeo, lanternGeo].forEach(
    trackDisposable
  );

  const base = new THREE.Mesh(baseGeo, fabricMat);
  base.position.y = 0.62;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const roof = new THREE.Mesh(roofGeo, accentMat);
  roof.position.y = 1.98;
  roof.castShadow = true;
  group.add(roof);

  const cap = new THREE.Mesh(capGeo, fabricMat);
  cap.position.y = 2.48;
  group.add(cap);

  const spire = new THREE.Mesh(spireGeo, goldMat);
  spire.position.y = 2.95;
  group.add(spire);

  // Camp lantern by tent entrance
  const post = new THREE.Mesh(postGeo, poleMat);
  post.position.set(1.4, 0.86, 1.5);
  group.add(post);

  const lantern = new THREE.Mesh(lanternGeo, lanternMat);
  lantern.position.set(1.4, 1.72, 1.5);
  group.add(lantern);

  return { group, lanternMat };
}

export interface DesertTrainSystem {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  cars: THREE.Group[];
  headlightMat: THREE.MeshStandardMaterial;
  windowMat: THREE.MeshStandardMaterial;
  smokePuffs: THREE.Mesh[];
}

/**
 * Outer-Dune Winding Railway Track, 2 Dune Tube/Tunnels, and 3-Car Articulated Desert Express Train!
 */
export function buildDesertTrainSystem(
  orbitRadius: number,
  trackDisposable: (d: { dispose: () => void }) => void
): DesertTrainSystem {
  const group = new THREE.Group();

  // Build wavy railway loop nestled between outer dunes
  const pts: THREE.Vector3[] = [];
  const numPts = 28;
  for (let i = 0; i < numPts; i++) {
    const a = (i / numPts) * Math.PI * 2;
    const wave = Math.sin(a * 4) * 3.8 + Math.cos(a * 2) * 2.5;
    const r = orbitRadius + wave;
    // Keep north view corridor slightly lower/clear of distant city
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0.25, Math.sin(a) * r));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);

  // Rail bed + twin steel rails
  const bedGeo = new THREE.TubeGeometry(curve, 140, 0.95, 6, true);
  bedGeo.scale(1, 0.24, 1);
  const bedMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.9,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.8,
  });
  trackDisposable(bedGeo);
  trackDisposable(bedMat);
  trackDisposable(railMat);

  const bedMesh = new THREE.Mesh(bedGeo, bedMat);
  bedMesh.position.y = 0.08;
  bedMesh.receiveShadow = true;
  group.add(bedMesh);

  // Wooden sleepers along the rail
  const sleeperGeo = new THREE.BoxGeometry(1.65, 0.1, 0.28);
  trackDisposable(sleeperGeo);
  const sleeperCount = 96;
  const _p = new THREE.Vector3();
  const _tan = new THREE.Vector3();
  for (let i = 0; i < sleeperCount; i++) {
    const u = i / sleeperCount;
    curve.getPointAt(u, _p);
    curve.getTangentAt(u, _tan);
    const sleeper = new THREE.Mesh(sleeperGeo, bedMat);
    sleeper.position.set(_p.x, 0.22, _p.z);
    sleeper.rotation.y = Math.atan2(_tan.x, _tan.z);
    group.add(sleeper);
  }

  // Two Dune Tubes / Tunnels built around opposite segments of the railway spline!
  const tunnelStoneMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.85,
  });
  const tunnelInnerMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const duneCoverMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.9,
  });
  const tunnelRingGeo = new THREE.TorusGeometry(1.75, 0.28, 8, 14, Math.PI);
  const archShellGeo = new THREE.CylinderGeometry(
    1.72,
    1.82,
    2.4,
    12,
    1,
    true,
    -Math.PI / 2,
    Math.PI
  );
  const tunnelMoundGeo = new THREE.SphereGeometry(
    4.6,
    14,
    10,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.48
  );

  [
    tunnelStoneMat,
    tunnelInnerMat,
    duneCoverMat,
    tunnelRingGeo,
    archShellGeo,
    tunnelMoundGeo,
  ].forEach(trackDisposable);

  const tunnelCenters = [0.14, 0.64];
  for (const centerU of tunnelCenters) {
    // 5 curved arch segments forming a continuous tunnel tube along the track
    for (let s = -2; s <= 2; s++) {
      const u = (centerU + s * 0.014 + 1) % 1;
      curve.getPointAt(u, _p);
      curve.getTangentAt(u, _tan);
      const yaw = Math.atan2(_tan.x, _tan.z);

      const segGroup = new THREE.Group();
      segGroup.position.set(_p.x, 0.1, _p.z);
      segGroup.rotation.y = yaw;

      const shell = new THREE.Mesh(archShellGeo, tunnelInnerMat);
      shell.rotation.x = Math.PI / 2;
      shell.castShadow = true;
      shell.receiveShadow = true;
      segGroup.add(shell);

      if (s === -2 || s === 2) {
        const portal = new THREE.Mesh(tunnelRingGeo, tunnelStoneMat);
        portal.position.set(0, 0, s === 2 ? 1.15 : -1.15);
        portal.castShadow = true;
        segGroup.add(portal);
      }

      group.add(segGroup);
    }

    // Sand dune mound covering the middle of the tunnel tube
    curve.getPointAt(centerU, _p);
    curve.getTangentAt(centerU, _tan);
    const mound = new THREE.Mesh(tunnelMoundGeo, duneCoverMat);
    mound.scale.set(1.25, 0.72, 2.0);
    mound.position.set(_p.x, -0.35, _p.z);
    mound.rotation.y = Math.atan2(_tan.x, _tan.z);
    mound.receiveShadow = true;
    group.add(mound);
  }

  // 3-Car Articulated Desert Express Train (Locomotive + 2 Passenger Cars)
  const locoRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.4,
    metalness: 0.6,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.25,
    metalness: 0.8,
  });
  const coachMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.55 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.6,
    roughness: 0.15,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });

  [locoRedMat, darkIronMat, brassMat, coachMat, headlightMat, windowMat].forEach(
    trackDisposable
  );

  const cars: THREE.Group[] = [];

  // Car 0: Steam Locomotive
  const loco = new THREE.Group();
  const chassisGeo = new THREE.BoxGeometry(1.15, 0.32, 2.5);
  const boilerGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.5, 12);
  const cabGeo = new THREE.BoxGeometry(1.1, 1.05, 0.95);
  const stackGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.65, 10);
  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 10);
  const lampGeo = new THREE.SphereGeometry(0.18, 10, 10);
  [chassisGeo, boilerGeo, cabGeo, stackGeo, wheelGeo, lampGeo].forEach(
    trackDisposable
  );

  const chassis = new THREE.Mesh(chassisGeo, darkIronMat);
  chassis.position.y = 0.42;
  chassis.castShadow = true;
  loco.add(chassis);

  const boiler = new THREE.Mesh(boilerGeo, locoRedMat);
  boiler.rotation.x = Math.PI / 2;
  boiler.position.set(0, 0.9, 0.35);
  boiler.castShadow = true;
  loco.add(boiler);

  const cab = new THREE.Mesh(cabGeo, brassMat);
  cab.position.set(0, 1.05, -0.68);
  cab.castShadow = true;
  loco.add(cab);

  const stack = new THREE.Mesh(stackGeo, darkIronMat);
  stack.position.set(0, 1.48, 0.78);
  loco.add(stack);

  const headlight = new THREE.Mesh(lampGeo, headlightMat);
  headlight.position.set(0, 0.95, 1.18);
  loco.add(headlight);

  [-0.6, 0.6].forEach((wx) => {
    [-0.7, 0.1, 0.75].forEach((wz) => {
      const w = new THREE.Mesh(wheelGeo, brassMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.24, wz);
      loco.add(w);
    });
  });

  group.add(loco);
  cars.push(loco);

  // Cars 1 & 2: Passenger Coaches
  const coachBodyGeo = new THREE.BoxGeometry(1.12, 0.95, 2.25);
  const coachRoofGeo = new THREE.BoxGeometry(1.22, 0.16, 2.38);
  const winStripGeo = new THREE.BoxGeometry(1.16, 0.32, 1.65);
  [coachBodyGeo, coachRoofGeo, winStripGeo].forEach(trackDisposable);

  for (let c = 0; c < 2; c++) {
    const coach = new THREE.Group();
    const cChassis = new THREE.Mesh(chassisGeo, darkIronMat);
    cChassis.position.y = 0.42;
    coach.add(cChassis);

    const cBody = new THREE.Mesh(coachBodyGeo, c === 0 ? coachMat : locoRedMat);
    cBody.position.y = 1.02;
    cBody.castShadow = true;
    coach.add(cBody);

    const cRoof = new THREE.Mesh(coachRoofGeo, brassMat);
    cRoof.position.y = 1.54;
    coach.add(cRoof);

    const cWin = new THREE.Mesh(winStripGeo, windowMat);
    cWin.position.y = 1.1;
    coach.add(cWin);

    [-0.6, 0.6].forEach((wx) => {
      [-0.65, 0.65].forEach((wz) => {
        const w = new THREE.Mesh(wheelGeo, brassMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, 0.24, wz);
        coach.add(w);
      });
    });

    group.add(coach);
    cars.push(coach);
  }

  // Rising Smoke Puffs attached above Locomotive
  const smokeGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const smokeMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f4,
    transparent: true,
    opacity: 0.65,
    roughness: 0.95,
  });
  trackDisposable(smokeGeo);
  trackDisposable(smokeMat);
  const smokePuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(smokeGeo, smokeMat);
    puff.userData.phase = i / 4;
    loco.add(puff);
    smokePuffs.push(puff);
  }

  return { group, curve, cars, headlightMat, windowMat, smokePuffs };
}

