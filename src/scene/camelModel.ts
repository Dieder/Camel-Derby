import * as THREE from 'three';
import { CAMEL_PALETTES } from '../game/constants';
import { CamelColor } from '../game/types';
import { createSaddleTexture } from './textures';

export interface CamelRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Group;
  shieldDome: THREE.Mesh;
  speedRing: THREE.Mesh;
  blockadeGroup: THREE.Group;
  dizzyGroup: THREE.Group;
  eyebrows: [THREE.Mesh, THREE.Mesh];
  pupils: [THREE.Mesh, THREE.Mesh];
  setStatus: (opts: {
    hasShield: boolean;
    speedActive: boolean;
    blockaded: boolean;
    stunned: boolean;
    isMoving: boolean;
  }) => void;
  animate: (elapsed: number, isMoving: boolean, isStunned: boolean) => void;
  dispose: () => void;
}

export function createCamelModel(color: CamelColor): CamelRig {
  const pal = CAMEL_PALETTES[color];
  const root = new THREE.Group();

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Materials with clear roughness/metalness contrast
  const bodyMat = track(
    new THREE.MeshStandardMaterial({
      color: pal.hex,
      roughness: 0.62,
      metalness: 0.04,
    })
  );
  const snoutMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(pal.hex).lerp(new THREE.Color(0xfff1d6), 0.42),
      roughness: 0.72,
      metalness: 0.02,
    })
  );
  const hoofMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.4,
      metalness: 0.15,
    })
  );
  const baseMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.35,
      metalness: 0.45,
    })
  );
  const rimMat = track(
    new THREE.MeshStandardMaterial({
      color: pal.hex,
      roughness: 0.25,
      metalness: 0.65,
    })
  );

  const saddleTex = track(
    createSaddleTexture(
      `#${pal.saddleHex.toString(16).padStart(6, '0')}`,
      `#${pal.accentHex.toString(16).padStart(6, '0')}`
    )
  );
  const saddleMat = track(
    new THREE.MeshStandardMaterial({
      map: saddleTex,
      roughness: 0.85,
      metalness: 0.0,
    })
  );

  // 1. Pedestal Base (sits flush at y = 0)
  const baseGeo = track(new THREE.CylinderGeometry(0.68, 0.75, 0.14, 16));
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.07;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  root.add(baseMesh);

  const rimGeo = track(new THREE.TorusGeometry(0.69, 0.045, 10, 24));
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 0.14;
  root.add(rimMesh);

  // 2. Body Pivot (for bouncy trot & tilt)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.14;
  root.add(bodyPivot);

  // 3. Articulated 4 Legs
  const legs: THREE.Group[] = [];
  const legGeo = track(new THREE.CylinderGeometry(0.085, 0.075, 0.48, 10));
  const hoofGeo = track(new THREE.CylinderGeometry(0.095, 0.11, 0.1, 10));
  const legCoords: Array<[number, number]> = [
    [-0.22, 0.32],
    [0.22, 0.32],
    [-0.22, -0.32],
    [0.22, -0.32],
  ];

  for (const [lx, lz] of legCoords) {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 0.5, lz);

    const legMesh = new THREE.Mesh(legGeo, bodyMat);
    legMesh.position.y = -0.22;
    legMesh.castShadow = true;
    legPivot.add(legMesh);

    const hoofMesh = new THREE.Mesh(hoofGeo, hoofMat);
    hoofMesh.position.y = -0.45;
    hoofMesh.castShadow = true;
    legPivot.add(hoofMesh);

    bodyPivot.add(legPivot);
    legs.push(legPivot);
  }

  // 4. Cartoon Barrel Torso
  const torsoGeo = track(new THREE.CapsuleGeometry(0.34, 0.44, 10, 16));
  const torsoMesh = new THREE.Mesh(torsoGeo, bodyMat);
  torsoMesh.rotation.x = Math.PI / 2;
  torsoMesh.position.set(0, 0.72, 0);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyPivot.add(torsoMesh);

  // 5. Prominent Camel Hump + Woven Saddle Blanket
  const humpGeo = track(new THREE.SphereGeometry(0.32, 16, 14));
  const humpMesh = new THREE.Mesh(humpGeo, bodyMat);
  humpMesh.scale.set(0.95, 1.15, 1.1);
  humpMesh.position.set(0, 1.02, -0.04);
  humpMesh.castShadow = true;
  bodyPivot.add(humpMesh);

  const saddleGeo = track(
    new THREE.CylinderGeometry(0.36, 0.38, 0.46, 16, 1, false, -Math.PI * 0.65, Math.PI * 1.3)
  );
  const saddleMesh = new THREE.Mesh(saddleGeo, saddleMat);
  saddleMesh.rotation.z = Math.PI / 2;
  saddleMesh.rotation.y = Math.PI / 2;
  saddleMesh.position.set(0, 0.84, -0.02);
  saddleMesh.castShadow = true;
  bodyPivot.add(saddleMesh);

  // 6. Tail with playful tuft
  const tail = new THREE.Group();
  tail.position.set(0, 0.8, -0.48);
  const tailCordGeo = track(new THREE.CylinderGeometry(0.03, 0.025, 0.32, 8));
  const tailCord = new THREE.Mesh(tailCordGeo, bodyMat);
  tailCord.rotation.x = -0.45;
  tailCord.position.set(0, -0.1, -0.08);
  tail.add(tailCord);
  const tuftGeo = track(new THREE.SphereGeometry(0.08, 10, 10));
  const tuft = new THREE.Mesh(tuftGeo, hoofMat);
  tuft.position.set(0, -0.23, -0.16);
  tail.add(tuft);
  bodyPivot.add(tail);

  // 7. Curved Neck (TubeGeometry)
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.78, 0.36),
    new THREE.Vector3(0, 1.02, 0.56),
    new THREE.Vector3(0, 1.34, 0.52),
  ]);
  const neckGeo = track(new THREE.TubeGeometry(neckCurve, 12, 0.145, 12, false));
  const neckMesh = new THREE.Mesh(neckGeo, bodyMat);
  neckMesh.castShadow = true;
  bodyPivot.add(neckMesh);

  // 8. Expressive Cartoon Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.4, 0.54);
  bodyPivot.add(headGroup);

  const craniumGeo = track(new THREE.SphereGeometry(0.22, 16, 14));
  const cranium = new THREE.Mesh(craniumGeo, bodyMat);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const snoutGeo = track(new THREE.CapsuleGeometry(0.14, 0.18, 8, 12));
  const snout = new THREE.Mesh(snoutGeo, snoutMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.04, 0.22);
  snout.castShadow = true;
  headGroup.add(snout);

  // Floppy Ears
  const earGeo = track(new THREE.CapsuleGeometry(0.055, 0.12, 6, 8));
  const earL = new THREE.Mesh(earGeo, bodyMat);
  earL.position.set(-0.18, 0.16, -0.02);
  earL.rotation.z = 0.65;
  headGroup.add(earL);
  const earR = new THREE.Mesh(earGeo, bodyMat);
  earR.position.set(0.18, 0.16, -0.02);
  earR.rotation.z = -0.65;
  headGroup.add(earR);

  // Big Googly Cartoon Eyes + Eyebrows
  const whiteMat = track(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
  );
  const pupilMat = track(
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 })
  );
  const browMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.7 })
  );

  const eyeGeo = track(new THREE.SphereGeometry(0.075, 12, 12));
  const pupilGeo = track(new THREE.SphereGeometry(0.04, 10, 10));
  const browGeo = track(new THREE.BoxGeometry(0.12, 0.03, 0.03));

  const eyeL = new THREE.Mesh(eyeGeo, whiteMat);
  eyeL.position.set(-0.11, 0.09, 0.16);
  headGroup.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, whiteMat);
  eyeR.position.set(0.11, 0.09, 0.16);
  headGroup.add(eyeR);

  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(-0.11, 0.09, 0.225);
  headGroup.add(pupilL);
  const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
  pupilR.position.set(0.11, 0.09, 0.225);
  headGroup.add(pupilR);

  const browL = new THREE.Mesh(browGeo, browMat);
  browL.position.set(-0.11, 0.18, 0.18);
  headGroup.add(browL);
  const browR = new THREE.Mesh(browGeo, browMat);
  browR.position.set(0.11, 0.18, 0.18);
  headGroup.add(browR);

  // 9. Active Power-Up Base Indicators
  // Shield Bubble
  const shieldGeo = track(new THREE.SphereGeometry(0.82, 20, 16));
  const shieldMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.28,
      roughness: 0.15,
      depthWrite: false,
    })
  );
  const shieldDome = new THREE.Mesh(shieldGeo, shieldMat);
  shieldDome.position.y = 0.82;
  shieldDome.visible = false;
  root.add(shieldDome);

  // Speed Boost Glowing Ring around Base
  const speedGeo = track(new THREE.TorusGeometry(0.84, 0.05, 8, 24));
  const speedMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    })
  );
  const speedRing = new THREE.Mesh(speedGeo, speedMat);
  speedRing.rotation.x = Math.PI / 2;
  speedRing.position.y = 0.18;
  speedRing.visible = false;
  root.add(speedRing);

  // Blockade Wooden Barricade Posts around Base
  const blockadeGroup = new THREE.Group();
  const woodMat = track(
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 })
  );
  const postGeo = track(new THREE.BoxGeometry(0.1, 0.65, 0.1));
  const barGeo = track(new THREE.BoxGeometry(1.1, 0.1, 0.08));
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(Math.cos(angle) * 0.72, 0.35, Math.sin(angle) * 0.72);
    blockadeGroup.add(post);
  }
  const barFront = new THREE.Mesh(barGeo, woodMat);
  barFront.position.set(0, 0.45, 0.72);
  blockadeGroup.add(barFront);
  const barBack = new THREE.Mesh(barGeo, woodMat);
  barBack.position.set(0, 0.45, -0.72);
  blockadeGroup.add(barBack);
  blockadeGroup.visible = false;
  root.add(blockadeGroup);

  // Stunned Orbiting Stars
  const dizzyGroup = new THREE.Group();
  dizzyGroup.position.y = 1.85;
  const starGeo = track(new THREE.OctahedronGeometry(0.09, 0));
  const starMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.8,
    })
  );
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34);
    dizzyGroup.add(star);
  }
  dizzyGroup.visible = false;
  root.add(dizzyGroup);

  const seed = Math.random() * 10;

  return {
    root,
    bodyPivot,
    headGroup,
    legs,
    tail,
    shieldDome,
    speedRing,
    blockadeGroup,
    dizzyGroup,
    eyebrows: [browL, browR],
    pupils: [pupilL, pupilR],
    setStatus({ hasShield, speedActive, blockaded, stunned, isMoving }) {
      shieldDome.visible = hasShield;
      speedRing.visible = speedActive;
      blockadeGroup.visible = blockaded;
      dizzyGroup.visible = stunned;

      // Expressive eyebrows & pupils
      if (stunned || blockaded) {
        browL.rotation.z = -0.35;
        browR.rotation.z = 0.35;
        pupilL.position.y = 0.11;
        pupilR.position.y = 0.07;
      } else if (speedActive || isMoving) {
        browL.rotation.z = 0.32;
        browR.rotation.z = -0.32;
        pupilL.position.y = 0.09;
        pupilR.position.y = 0.09;
      } else {
        browL.rotation.z = 0.08;
        browR.rotation.z = -0.08;
        pupilL.position.y = 0.09;
        pupilR.position.y = 0.09;
      }
    },
    animate(elapsed, isMoving, isStunned) {
      const t = elapsed + seed;
      if (isMoving) {
        // Energetic cartoon camel gallop!
        bodyPivot.position.y = 0.14 + Math.abs(Math.sin(t * 14)) * 0.14;
        bodyPivot.rotation.x = Math.sin(t * 14) * 0.12;
        headGroup.rotation.x = Math.sin(t * 14 + 0.6) * 0.16;
        headGroup.rotation.z = Math.cos(t * 7) * 0.08;
        legs[0].rotation.x = Math.sin(t * 14) * 0.65;
        legs[1].rotation.x = -Math.sin(t * 14) * 0.65;
        legs[2].rotation.x = -Math.sin(t * 14) * 0.65;
        legs[3].rotation.x = Math.sin(t * 14) * 0.65;
        tail.rotation.z = Math.sin(t * 12) * 0.3;
      } else if (isStunned) {
        bodyPivot.position.y = 0.14;
        bodyPivot.rotation.x = 0.08;
        headGroup.rotation.z = Math.sin(t * 5) * 0.22;
        headGroup.rotation.x = 0.15;
        dizzyGroup.rotation.y = t * 4.5;
        legs.forEach((l) => (l.rotation.x = 0));
      } else {
        // Quirky idle breathing + curious head look
        bodyPivot.position.y = 0.14 + Math.sin(t * 2.5) * 0.025;
        bodyPivot.rotation.x = 0;
        headGroup.rotation.y = Math.sin(t * 1.4) * 0.2;
        headGroup.rotation.x = Math.sin(t * 2.5) * 0.05;
        headGroup.rotation.z = 0;
        legs.forEach((l) => (l.rotation.x = 0));
        tail.rotation.z = Math.sin(t * 3.5) * 0.18;
      }

      if (speedRing.visible) {
        speedRing.scale.setScalar(1 + Math.sin(t * 6) * 0.07);
      }
      if (shieldDome.visible) {
        shieldDome.rotation.y = t * 0.8;
      }
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
