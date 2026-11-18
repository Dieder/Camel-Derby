import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BoardTile,
  CameraMode,
  PlayerState,
  TimeOfDay,
} from '../game/types';
import { CamelRig, createCamelModel } from './camelModel';
import {
  BanditProp,
  BlowMachineProp,
  buildBanditWithGun,
  buildBlowMachine,
  buildDistantDesertCity,
  buildPowerUpPedestal,
} from './props';
import {
  createContactShadowTexture,
  createDesertTerrainTexture,
  createTileTopTexture,
} from './textures';

// Pre-allocated math helpers (zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _skyColor = new THREE.Color();
const _sunColor = new THREE.Color();
const _hemiSky = new THREE.Color();
const _hemiGround = new THREE.Color();

const TIME_PRESETS: Record<
  TimeOfDay,
  {
    sky: number;
    fogDensity: number;
    sunColor: number;
    sunIntensity: number;
    sunPos: [number, number, number];
    hemiSky: number;
    hemiGround: number;
    hemiIntensity: number;
    exposure: number;
    starsOpacity: number;
    cityGlow: number;
  }
> = {
  day: {
    sky: 0x7dd3fc,
    fogDensity: 0.0038,
    sunColor: 0xfff3d1,
    sunIntensity: 2.1,
    sunPos: [28, 42, 22],
    hemiSky: 0xbae6fd,
    hemiGround: 0xd97706,
    hemiIntensity: 0.85,
    exposure: 1.08,
    starsOpacity: 0,
    cityGlow: 0.15,
  },
  sunset: {
    sky: 0xfb923c,
    fogDensity: 0.0046,
    sunColor: 0xff7b3a,
    sunIntensity: 1.95,
    sunPos: [-36, 16, -24],
    hemiSky: 0xfda4af,
    hemiGround: 0x7c2d12,
    hemiIntensity: 0.78,
    exposure: 1.05,
    starsOpacity: 0.25,
    cityGlow: 0.85,
  },
  night: {
    sky: 0x0f172a,
    fogDensity: 0.0052,
    sunColor: 0x93c5fd,
    sunIntensity: 0.95,
    sunPos: [-20, 36, 26],
    hemiSky: 0x334155,
    hemiGround: 0x1e1b4b,
    hemiIntensity: 0.65,
    exposure: 0.96,
    starsOpacity: 0.95,
    cityGlow: 1.6,
  },
};

export interface BoardSceneHandle {
  syncBoard: (tiles: BoardTile[]) => void;
  syncSandTraps: (tiles: BoardTile[]) => void;
  syncPlayers: (players: PlayerState[], activePlayerId: string | null) => void;
  setCameraMode: (mode: CameraMode, focusTileIndex?: number) => void;
  setTimeOfDay: (tod: TimeOfDay) => void;
  setTileSelectionMode: (enabled: boolean) => void;
  triggerSandstormVisual: () => void;
  dispose: () => void;
}

interface CamelAnimState {
  rig: CamelRig;
  shadow: THREE.Mesh;
  curPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  curYaw: number;
  targetYaw: number;
  hopTimer: number;
  isMoving: boolean;
  isStunned: boolean;
}

export function mountBoardScene(
  container: HTMLElement,
  callbacks: {
    onTileClick?: (tileIndex: number) => void;
    onUserOrbit?: () => void;
    onContextLost?: () => void;
    onContextRestored?: () => void;
  }
): BoardSceneHandle {
  const isSoftwareGl = (() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  })();

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = TIME_PRESETS.day.exposure;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const canvas = renderer.domElement;
  const onCtxLost = (e: Event) => {
    e.preventDefault();
    callbacks.onContextLost?.();
  };
  const onCtxRestored = () => {
    callbacks.onContextRestored?.();
  };
  canvas.addEventListener('webglcontextlost', onCtxLost);
  canvas.addEventListener('webglcontextrestored', onCtxRestored);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(TIME_PRESETS.day.sky);
  scene.fog = new THREE.FogExp2(TIME_PRESETS.day.sky, TIME_PRESETS.day.fogDensity);

  // Mandatory Studio Environment Reflections (RoomEnvironment)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(46, width / height, 0.3, 440);
  camera.position.set(0, 26, 42);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.07;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minDistance = 8;
  controls.maxDistance = 120;
  controls.target.set(0, 0.5, 0);

  let scriptedCamActive = true;
  let currentCameraMode: CameraMode = 'overview';
  let currentTimeOfDay: TimeOfDay = 'day';
  let tileSelectionEnabled = false;
  let sandstormBurstTimer = 0;

  controls.addEventListener('start', () => {
    scriptedCamActive = false;
    callbacks.onUserOrbit?.();
  });

  // 3-Point Warm/Cool Lighting Rig
  const hemiLight = new THREE.HemisphereLight(
    TIME_PRESETS.day.hemiSky,
    TIME_PRESETS.day.hemiGround,
    TIME_PRESETS.day.hemiIntensity
  );
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(
    TIME_PRESETS.day.sunColor,
    TIME_PRESETS.day.sunIntensity
  );
  sunLight.position.set(...TIME_PRESETS.day.sunPos);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -52;
  sunLight.shadow.camera.right = 52;
  sunLight.shadow.camera.top = 52;
  sunLight.shadow.camera.bottom = -52;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 140;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0xfde68a, 0.45);
  rimLight.position.set(-24, 18, -28);
  scene.add(rimLight);

  // Stylized Sun / Moon Disc in Sky
  const celestialMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const celestialOrb = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 20), celestialMat);
  celestialOrb.position.set(55, 58, -75);
  scene.add(celestialOrb);

  // Night Starfield
  const starCount = 320;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.42;
    const r = 135;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) + 12;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xfef9c3,
    size: 1.1,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Expansive Sculpted Desert Terrain (flat circuit basin, outer rolling dunes & mesas)
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const terrainTex = createDesertTerrainTexture(maxAniso);
  const terrainGeo = new THREE.PlaneGeometry(360, 360, 72, 72);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const distFromCenter = Math.hypot(vx, vz);
    // Keep track & inner oasis basin flat, then swell smoothly into outer dunes
    const flatBlend = THREE.MathUtils.smoothstep(distFromCenter, 35, 95);
    const wave =
      Math.sin(vx * 0.06) * 3.2 +
      Math.cos(vz * 0.05) * 3.0 +
      Math.sin((vx + vz) * 0.038) * 2.4;
    posAttr.setY(i, -0.35 + flatBlend * (wave + 3.8));
  }
  terrainGeo.computeVertexNormals();
  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainTex,
    roughness: 0.92,
    metalness: 0.0,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Far-Away Desert City Skyline Framed Between Two Tall Dunes on the North Horizon
  const distantCityDisposables: Array<{ dispose: () => void }> = [];
  const distantCity = buildDistantDesertCity((d) => distantCityDisposables.push(d));
  distantCity.group.position.set(0, -0.3, -122);
  distantCity.group.scale.setScalar(1.15);
  scene.add(distantCity.group);

  // Outer Perimeter Dunes, Mesas & Desert Rock Formations
  const decorGroup = new THREE.Group();
  scene.add(decorGroup);
  const mesaMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.88,
    flatShading: true,
  });
  const outerRockMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.86,
    flatShading: true,
  });
  const outerDuneMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.9,
  });

  // Outer rolling sand dunes circling outside the track (leaving North view corridor open to the distant city!)
  const duneSphereGeo = new THREE.SphereGeometry(14, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    // Leave clear sightline corridor around North (-Z, angle ~ -PI/2) to see the city between two dunes
    const northDist = Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2)));
    if (northDist < 0.36) continue;
    const rad = 54 + (i % 3) * 14;
    const dMesh = new THREE.Mesh(duneSphereGeo, outerDuneMat);
    dMesh.scale.set(1.4 + (i % 2) * 0.4, 0.42 + (i % 3) * 0.12, 1.0);
    dMesh.position.set(Math.cos(angle) * rad, -0.5, Math.sin(angle) * rad);
    dMesh.rotation.y = angle;
    dMesh.receiveShadow = true;
    decorGroup.add(dMesh);
  }

  // Outer rock clusters & distant mesas
  const boulderGeo = new THREE.DodecahedronGeometry(1.6, 0);
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2 + 0.15;
    const northDist = Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2)));
    if (northDist < 0.25) continue;
    const rad = 42 + (i % 4) * 9;
    const rx = Math.cos(angle) * rad;
    const rz = Math.sin(angle) * rad;
    const rock = new THREE.Mesh(boulderGeo, i % 2 === 0 ? outerRockMat : mesaMat);
    rock.scale.set(1.1 + (i % 3) * 0.45, 0.9 + (i % 4) * 0.5, 1.0 + (i % 2) * 0.35);
    rock.position.set(rx, 0.55, rz);
    rock.rotation.set(i * 0.2, angle, i * 0.15);
    rock.castShadow = true;
    rock.receiveShadow = true;
    decorGroup.add(rock);
  }

  // Animated Wind-Blown Sand Particles
  const sandCount = 260;
  const sandPositions = new Float32Array(sandCount * 3);
  for (let i = 0; i < sandCount; i++) {
    sandPositions[i * 3] = (Math.random() - 0.5) * 90;
    sandPositions[i * 3 + 1] = 0.4 + Math.random() * 6.5;
    sandPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  const sandGeo = new THREE.BufferGeometry();
  sandGeo.setAttribute('position', new THREE.BufferAttribute(sandPositions, 3));
  const sandMat = new THREE.PointsMaterial({
    color: 0xfef3c7,
    size: 0.22,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const sandPoints = new THREE.Points(sandGeo, sandMat);
  scene.add(sandPoints);

  // Dynamic Track & Props Groups
  const trackGroup = new THREE.Group();
  scene.add(trackGroup);
  const trackDisposables: Array<{ dispose: () => void }> = [];

  const tileMeshes: THREE.Mesh[] = [];
  const trapMarkers: Map<number, THREE.Group> = new Map();
  const palmCanopies: THREE.Group[] = [];
  const bandits: BanditProp[] = [];
  const blowMachines: BlowMachineProp[] = [];
  const powerCrystals: THREE.Mesh[] = [];
  let oasisWaterMesh: THREE.Mesh | null = null;
  let cachedTiles: BoardTile[] = [];

  // Upcoming 6 Reachable Box Highlight Rings
  const upcomingRings: THREE.Mesh[] = [];
  const upcomingRingGeo = new THREE.RingGeometry(1.36, 1.58, 6);
  upcomingRingGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const rMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const rMesh = new THREE.Mesh(upcomingRingGeo, rMat);
    rMesh.visible = false;
    scene.add(rMesh);
    upcomingRings.push(rMesh);
  }

  // Active Selection Ring for Sand Trap placement
  const hoverRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.08, 10, 24),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  );
  hoverRing.rotation.x = Math.PI / 2;
  hoverRing.visible = false;
  scene.add(hoverRing);

  // Active Turn Spotlight Ring under active camel's tile
  const activeTileRing = new THREE.Mesh(
    new THREE.RingGeometry(1.38, 1.62, 6),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    })
  );
  activeTileRing.rotation.x = -Math.PI / 2;
  activeTileRing.position.y = 0.44;
  activeTileRing.visible = false;
  scene.add(activeTileRing);

  function buildPalmTree(x: number, z: number, scale: number): THREE.Group {
    const palm = new THREE.Group();
    palm.position.set(x, -0.1, z);
    palm.scale.setScalar(scale);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.85,
    });
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const coconutMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.7,
    });
    trackDisposables.push(trunkMat, frondMat, coconutMat);

    // Curved segmented trunk
    let curY = 0;
    let leanX = 0;
    for (let s = 0; s < 5; s++) {
      const segGeo = new THREE.CylinderGeometry(
        0.16 - s * 0.018,
        0.19 - s * 0.018,
        0.58,
        7
      );
      trackDisposables.push(segGeo);
      const seg = new THREE.Mesh(segGeo, trunkMat);
      seg.position.set(leanX, curY + 0.28, 0);
      seg.rotation.z = -0.08 * (s + 1);
      seg.castShadow = true;
      palm.add(seg);
      curY += 0.52;
      leanX += 0.07 * (s + 1);
    }

    const crown = new THREE.Group();
    crown.position.set(leanX, curY, 0);
    palm.add(crown);
    palmCanopies.push(crown);

    const cocoGeo = new THREE.SphereGeometry(0.14, 8, 8);
    trackDisposables.push(cocoGeo);
    for (let c = 0; c < 3; c++) {
      const a = (c / 3) * Math.PI * 2;
      const coco = new THREE.Mesh(cocoGeo, coconutMat);
      coco.position.set(Math.cos(a) * 0.18, -0.05, Math.sin(a) * 0.18);
      crown.add(coco);
    }

    const frondGeo = new THREE.ConeGeometry(0.28, 1.45, 5);
    frondGeo.scale(1, 1, 0.22);
    frondGeo.translate(0, 0.7, 0);
    trackDisposables.push(frondGeo);

    for (let f = 0; f < 6; f++) {
      const frond = new THREE.Mesh(frondGeo, frondMat);
      frond.rotation.y = (f / 6) * Math.PI * 2;
      frond.rotation.x = 1.08 + (f % 2) * 0.15;
      frond.castShadow = true;
      crown.add(frond);
    }

    return palm;
  }

  function buildSandTrapMarker(): THREE.Group {
    const g = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.68, 0.08, 8, 18);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      emissive: 0x92400e,
      emissiveIntensity: 0.35,
      roughness: 0.8,
    });
    const spikeGeo = new THREE.ConeGeometry(0.22, 0.45, 6);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.5,
    });
    trackDisposables.push(ringGeo, ringMat, spikeGeo, spikeMat);

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);

    const cone = new THREE.Mesh(spikeGeo, spikeMat);
    cone.position.y = 0.26;
    cone.rotation.x = Math.PI;
    g.add(cone);
    return g;
  }

  function syncBoard(tiles: BoardTile[]) {
    // Clear previous track meshes safely
    while (trackGroup.children.length > 0) {
      trackGroup.remove(trackGroup.children[0]);
    }
    trackDisposables.forEach((d) => d.dispose());
    trackDisposables.length = 0;
    tileMeshes.length = 0;
    trapMarkers.clear();
    palmCanopies.length = 0;
    bandits.length = 0;
    blowMachines.length = 0;
    powerCrystals.length = 0;
    oasisWaterMesh = null;
    cachedTiles = tiles;

    // 1. Inner Oasis Lagoon (Water + Inner Palms) inside the Round Circuit
    const avgRadius =
      tiles.reduce((acc, t) => acc + Math.hypot(t.x, t.z), 0) /
      Math.max(1, tiles.length);
    const lagoonRadius = Math.max(6.5, avgRadius - 4.4);

    const beachGeo = new THREE.CylinderGeometry(lagoonRadius + 1.4, lagoonRadius + 1.7, 0.22, 32);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.88,
    });
    const lagoonGeo = new THREE.CylinderGeometry(lagoonRadius, lagoonRadius, 0.28, 32);
    const lagoonMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.22,
      roughness: 0.12,
      metalness: 0.18,
    });
    trackDisposables.push(beachGeo, beachMat, lagoonGeo, lagoonMat);

    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.position.set(0, -0.32, 0);
    beach.receiveShadow = true;
    trackGroup.add(beach);

    oasisWaterMesh = new THREE.Mesh(lagoonGeo, lagoonMat);
    oasisWaterMesh.position.set(0, -0.26, 0);
    oasisWaterMesh.receiveShadow = true;
    trackGroup.add(oasisWaterMesh);

    // Central sandy palm island inside the lagoon
    const islandGeo = new THREE.CylinderGeometry(lagoonRadius * 0.34, lagoonRadius * 0.44, 0.48, 16);
    trackDisposables.push(islandGeo);
    const island = new THREE.Mesh(islandGeo, beachMat);
    island.position.set(0, -0.15, 0);
    island.receiveShadow = true;
    trackGroup.add(island);
    trackGroup.add(buildPalmTree(0.4, 0.3, 1.25));
    trackGroup.add(buildPalmTree(-1.1, -0.7, 1.0));

    // Inner ring of swaying palm trees & shore boulders around the water
    const innerPalmCount = tiles.length > 35 ? 12 : 8;
    const shoreRockGeo = new THREE.DodecahedronGeometry(0.65, 0);
    const shoreRockMat = new THREE.MeshStandardMaterial({
      color: 0xa8a29e,
      roughness: 0.85,
      flatShading: true,
    });
    trackDisposables.push(shoreRockGeo, shoreRockMat);

    for (let p = 0; p < innerPalmCount; p++) {
      const a = (p / innerPalmCount) * Math.PI * 2 + 0.22;
      const pr = lagoonRadius + 0.65;
      trackGroup.add(
        buildPalmTree(
          Math.cos(a) * pr,
          Math.sin(a) * pr,
          0.9 + (p % 3) * 0.14
        )
      );
      if (p % 2 === 0) {
        const ra = a + 0.18;
        const rk = new THREE.Mesh(shoreRockGeo, shoreRockMat);
        rk.position.set(Math.cos(ra) * (lagoonRadius + 0.3), -0.05, Math.sin(ra) * (lagoonRadius + 0.3));
        rk.scale.set(1.1, 0.7, 0.9);
        rk.castShadow = true;
        trackGroup.add(rk);
      }
    }

    // 2. Hexagonal Track Tiles & Special Box Props (Bandit with Gun, Blow Machine, Power-Up Crystals)
    const hexSideGeo = new THREE.CylinderGeometry(1.42, 1.5, 0.42, 6);
    const topDiscGeo = new THREE.CylinderGeometry(1.28, 1.28, 0.04, 6);
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.78,
    });
    const obstacleRimMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.45,
    });
    const powerupRimMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      roughness: 0.45,
    });
    const finishMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.45,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c,
      roughness: 0.85,
      flatShading: true,
    });
    const ruinMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.85,
    });
    trackDisposables.push(
      hexSideGeo,
      topDiscGeo,
      sideMat,
      obstacleRimMat,
      powerupRimMat,
      finishMat,
      stoneMat,
      ruinMat
    );

    tiles.forEach((tile) => {
      const baseMat =
        tile.spaceType === 'obstacle'
          ? obstacleRimMat
          : tile.spaceType === 'powerup'
          ? powerupRimMat
          : tile.spaceType === 'finish' || tile.spaceType === 'start'
          ? finishMat
          : sideMat;

      const tileHex = new THREE.Mesh(hexSideGeo, baseMat);
      tileHex.position.set(tile.x, 0.21, tile.z);
      tileHex.castShadow = true;
      tileHex.receiveShadow = true;
      tileHex.userData.tileIndex = tile.index;
      trackGroup.add(tileHex);
      tileMeshes.push(tileHex);

      const topTex = createTileTopTexture(
        tile.index,
        tile.biome,
        tile.spaceType,
        maxAniso,
        tile.obstacleProp
      );
      const topMat = new THREE.MeshStandardMaterial({
        map: topTex,
        roughness: 0.65,
      });
      trackDisposables.push(topTex, topMat);

      const topMesh = new THREE.Mesh(topDiscGeo, topMat);
      topMesh.position.set(tile.x, 0.425, tile.z);
      topMesh.rotation.y = Math.PI / 6;
      topMesh.receiveShadow = true;
      topMesh.userData.tileIndex = tile.index;
      trackGroup.add(topMesh);

      // Compute outward normal from center of circuit for placing props cleanly on the outside rim
      const outLen = Math.max(0.001, Math.hypot(tile.x, tile.z));
      const outX = tile.x / outLen;
      const outZ = tile.z / outLen;

      // Special Obstacle Props: Bandit with Gun OR Wind Blow Machine aiming directly at the tile!
      if (tile.spaceType === 'obstacle') {
        const px = tile.x + outX * 2.25;
        const pz = tile.z + outZ * 2.25;
        const faceTileYaw = Math.atan2(tile.x - px, tile.z - pz);

        if (tile.obstacleProp === 'bandit') {
          const bandit = buildBanditWithGun((d) => trackDisposables.push(d));
          bandit.group.position.set(px, -0.15, pz);
          bandit.group.rotation.y = faceTileYaw;
          bandit.group.scale.setScalar(0.95);
          trackGroup.add(bandit.group);
          bandits.push(bandit);
        } else {
          const blower = buildBlowMachine((d) => trackDisposables.push(d));
          blower.group.position.set(px, -0.15, pz);
          blower.group.rotation.y = faceTileYaw;
          blower.group.scale.setScalar(0.92);
          trackGroup.add(blower.group);
          blowMachines.push(blower);
        }
      } else if (tile.spaceType === 'powerup') {
        // Glowing Golden Crystal Pedestal beside Power-Up tiles
        const px = tile.x + outX * 2.15;
        const pz = tile.z + outZ * 2.15;
        const ped = buildPowerUpPedestal((d) => trackDisposables.push(d));
        ped.group.position.set(px, -0.15, pz);
        trackGroup.add(ped.group);
        powerCrystals.push(ped.crystal);
      } else if (tile.biome === 'canyon' && tile.index % 2 === 1) {
        const rockGeo = new THREE.DodecahedronGeometry(0.85 + (tile.index % 3) * 0.24, 0);
        trackDisposables.push(rockGeo);
        const rock = new THREE.Mesh(rockGeo, stoneMat);
        rock.scale.set(1.2, 1.5, 0.9);
        rock.position.set(tile.x + outX * 2.9, 0.35, tile.z + outZ * 2.9);
        rock.castShadow = true;
        trackGroup.add(rock);
      } else if (tile.biome === 'ruins' && tile.index % 2 === 0) {
        const pillarGeo = new THREE.BoxGeometry(0.45, 1.75, 0.45);
        trackDisposables.push(pillarGeo);
        const pillar = new THREE.Mesh(pillarGeo, ruinMat);
        pillar.position.set(tile.x + outX * 2.8, 0.55, tile.z + outZ * 2.8);
        pillar.rotation.y = tile.index * 0.5;
        pillar.castShadow = true;
        trackGroup.add(pillar);
      }

      // Finish Line Arch!
      if (tile.spaceType === 'finish') {
        const archGroup = new THREE.Group();
        archGroup.position.set(tile.x, 0.42, tile.z);
        archGroup.rotation.y = tile.yaw;

        const postGeo = new THREE.CylinderGeometry(0.16, 0.2, 3.2, 10);
        const bannerGeo = new THREE.BoxGeometry(3.4, 0.72, 0.26);
        const goldMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          roughness: 0.28,
          metalness: 0.72,
        });
        const bannerMat = new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          roughness: 0.5,
        });
        trackDisposables.push(postGeo, bannerGeo, goldMat, bannerMat);

        const pL = new THREE.Mesh(postGeo, goldMat);
        pL.position.set(-1.55, 1.6, 0);
        pL.castShadow = true;
        archGroup.add(pL);

        const pR = new THREE.Mesh(postGeo, goldMat);
        pR.position.set(1.55, 1.6, 0);
        pR.castShadow = true;
        archGroup.add(pR);

        const topBar = new THREE.Mesh(bannerGeo, bannerMat);
        topBar.position.set(0, 3.15, 0);
        topBar.castShadow = true;
        archGroup.add(topBar);

        trackGroup.add(archGroup);
      }

      // Sand Trap Visual Marker
      if (tile.sandTrapOwnerId) {
        const marker = buildSandTrapMarker();
        marker.position.set(tile.x, 0.44, tile.z);
        trackGroup.add(marker);
        trapMarkers.set(tile.index, marker);
      }
    });
  }

  function syncSandTraps(tiles: BoardTile[]) {
    // Sync markers without rebuilding whole track
    for (const [idx, grp] of trapMarkers.entries()) {
      if (!tiles[idx]?.sandTrapOwnerId) {
        trackGroup.remove(grp);
        trapMarkers.delete(idx);
      }
    }
    for (const tile of tiles) {
      if (tile.sandTrapOwnerId && !trapMarkers.has(tile.index)) {
        const marker = buildSandTrapMarker();
        marker.position.set(tile.x, 0.44, tile.z);
        trackGroup.add(marker);
        trapMarkers.set(tile.index, marker);
      }
    }
  }

  // Camel Entities
  const shadowTex = createContactShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(1.55, 1.55);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });

  const camelMap = new Map<string, CamelAnimState>();
  let currentActivePlayerId: string | null = null;
  let currentPlayersSnapshot: PlayerState[] = [];

  function computeCamelTarget(
    player: PlayerState,
    playersAtZero: PlayerState[]
  ): { x: number; y: number; z: number; yaw: number } {
    const tile = cachedTiles[player.position] ?? cachedTiles[0];
    if (!tile) return { x: 0, y: 0.44, z: 0, yaw: 0 };

    if (player.position === 0) {
      // Arrange neatly on Start tile
      const slot = Math.max(0, playersAtZero.findIndex((p) => p.id === player.id));
      const col = (slot % 2) - 0.5;
      const row = Math.floor(slot / 2) - 1;
      const cos = Math.cos(tile.yaw);
      const sin = Math.sin(tile.yaw);
      const localX = col * 0.95;
      const localZ = row * 0.85;
      return {
        x: tile.x + localX * cos + localZ * sin,
        y: 0.44,
        z: tile.z - localX * sin + localZ * cos,
        yaw: tile.yaw,
      };
    }

    // Stacked on track tile!
    return {
      x: tile.x,
      y: 0.44 + player.stackOrder * 1.15,
      z: tile.z,
      yaw: tile.yaw,
    };
  }

  function syncPlayers(players: PlayerState[], activePlayerId: string | null) {
    currentActivePlayerId = activePlayerId;
    currentPlayersSnapshot = players;

    // Also sync sand traps if cachedTiles updated externally
    // (Callers call syncBoard on new race, and we keep trap markers fresh)
    const activeIds = new Set(players.map((p) => p.id));
    for (const [id, entry] of camelMap.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(entry.rig.root);
        scene.remove(entry.shadow);
        entry.rig.dispose();
        camelMap.delete(id);
      }
    }

    const atZero = players
      .filter((p) => p.position === 0 && p.finishedRank === null)
      .sort((a, b) => a.stackOrder - b.stackOrder);

    for (const p of players) {
      const target = computeCamelTarget(p, atZero);
      let entry = camelMap.get(p.id);
      if (!entry) {
        const rig = createCamelModel(p.color);
        rig.root.scale.setScalar(0.76);
        rig.root.position.set(target.x, target.y, target.z);
        rig.root.rotation.y = target.yaw;
        scene.add(rig.root);

        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.position.set(target.x, 0.435, target.z);
        scene.add(shadow);

        entry = {
          rig,
          shadow,
          curPos: new THREE.Vector3(target.x, target.y, target.z),
          targetPos: new THREE.Vector3(target.x, target.y, target.z),
          curYaw: target.yaw,
          targetYaw: target.yaw,
          hopTimer: 0,
          isMoving: false,
          isStunned: false,
        };
        camelMap.set(p.id, entry);
      } else {
        const dist = Math.hypot(
          target.x - entry.targetPos.x,
          target.z - entry.targetPos.z
        );
        if (dist > 0.1 || Math.abs(target.y - entry.targetPos.y) > 0.1) {
          entry.hopTimer = 0.45;
          entry.isMoving = true;
        }
        entry.targetPos.set(target.x, target.y, target.z);
        entry.targetYaw = target.yaw;
      }

      const stunned = p.stunnedTurns > 0;
      const blockaded = p.blockadeTurns > 0;
      entry.isStunned = stunned || blockaded;
      entry.rig.setStatus({
        hasShield: p.hasShield || p.mirageShield,
        speedActive: p.speedBoostQueued || p.sprintActive,
        blockaded,
        stunned,
        isMoving: entry.isMoving,
      });
    }

    // Highlight active player's tile & next 6 reachable boxes ahead!
    if (activePlayerId) {
      const activeP = players.find((p) => p.id === activePlayerId);
      const t = activeP ? cachedTiles[activeP.position] : undefined;
      if (t) {
        activeTileRing.position.set(t.x, 0.445, t.z);
        activeTileRing.visible = true;
      } else {
        activeTileRing.visible = false;
      }

      if (activeP && activeP.finishedRank === null) {
        for (let step = 1; step <= 6; step++) {
          const nextIdx = activeP.position + step;
          const nextTile = cachedTiles[nextIdx];
          const ring = upcomingRings[step - 1];
          if (nextTile && ring) {
            ring.position.set(nextTile.x, 0.45, nextTile.z);
            const mat = ring.material as THREE.MeshBasicMaterial;
            if (nextTile.sandTrapOwnerId || nextTile.spaceType === 'obstacle') {
              mat.color.setHex(0xf87171);
            } else if (nextTile.spaceType === 'powerup') {
              mat.color.setHex(0x2dd4bf);
            } else if (nextTile.spaceType === 'finish') {
              mat.color.setHex(0x4ade80);
            } else {
              mat.color.setHex(0xfef08a);
            }
            ring.visible = true;
          } else if (ring) {
            ring.visible = false;
          }
        }
      } else {
        upcomingRings.forEach((r) => (r.visible = false));
      }
    } else {
      activeTileRing.visible = false;
      upcomingRings.forEach((r) => (r.visible = false));
    }
  }

  // Raycasting for Sand Trap Tile Selection
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredTileIdx: number | null = null;
  let lastMoveTime = 0;

  function onPointerMove(e: PointerEvent) {
    if (!tileSelectionEnabled) {
      hoverRing.visible = false;
      return;
    }
    const now = performance.now();
    if (now - lastMoveTime < 35) return;
    lastMoveTime = now;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(tileMeshes, false);
    if (hits.length > 0) {
      const idx = hits[0].object.userData.tileIndex as number;
      if (idx > 0 && idx < cachedTiles.length - 1) {
        hoveredTileIdx = idx;
        const t = cachedTiles[idx];
        hoverRing.position.set(t.x, 0.48, t.z);
        hoverRing.visible = true;
        canvas.style.cursor = 'pointer';
        return;
      }
    }
    hoveredTileIdx = null;
    hoverRing.visible = false;
    canvas.style.cursor = 'default';
  }

  function onPointerClick(e: MouseEvent) {
    if (!tileSelectionEnabled) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(tileMeshes, false);
    if (hits.length > 0) {
      const idx = hits[0].object.userData.tileIndex as number;
      if (idx > 0 && idx < cachedTiles.length - 1) {
        callbacks.onTileClick?.(idx);
      }
    }
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('click', onPointerClick);

  function setCameraMode(mode: CameraMode) {
    currentCameraMode = mode;
    scriptedCamActive = true;
  }

  function setTimeOfDay(tod: TimeOfDay) {
    currentTimeOfDay = tod;
  }

  function setTileSelectionMode(enabled: boolean) {
    tileSelectionEnabled = enabled;
    if (!enabled) {
      hoverRing.visible = false;
      canvas.style.cursor = 'default';
    }
  }

  function triggerSandstormVisual() {
    sandstormBurstTimer = 2.8;
  }

  // Handle Resize
  function onResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // Pre-warm shaders on GPU
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Animation Loop with Software-WebGL Pacing
  const clock = new THREE.Clock();
  let frameId = 0;
  let disposed = false;

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function tick() {
    if (disposed) return;
    const dt = Math.min(0.05, clock.getDelta());
    const elapsed = clock.elapsedTime;

    // 1. Smooth Day/Sunset/Night Lighting Transition
    const preset = TIME_PRESETS[currentTimeOfDay];
    _skyColor.setHex(preset.sky);
    (scene.background as THREE.Color).lerp(_skyColor, 1 - Math.exp(-3 * dt));
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(scene.background as THREE.Color);
      scene.fog.density = THREE.MathUtils.damp(
        scene.fog.density,
        preset.fogDensity + (sandstormBurstTimer > 0 ? 0.015 : 0),
        3,
        dt
      );
    }
    _sunColor.setHex(preset.sunColor);
    sunLight.color.lerp(_sunColor, 1 - Math.exp(-3 * dt));
    sunLight.intensity = THREE.MathUtils.damp(sunLight.intensity, preset.sunIntensity, 3, dt);
    sunLight.position.x = THREE.MathUtils.damp(sunLight.position.x, preset.sunPos[0], 2.5, dt);
    sunLight.position.y = THREE.MathUtils.damp(sunLight.position.y, preset.sunPos[1], 2.5, dt);
    sunLight.position.z = THREE.MathUtils.damp(sunLight.position.z, preset.sunPos[2], 2.5, dt);

    _hemiSky.setHex(preset.hemiSky);
    _hemiGround.setHex(preset.hemiGround);
    hemiLight.color.lerp(_hemiSky, 1 - Math.exp(-3 * dt));
    hemiLight.groundColor.lerp(_hemiGround, 1 - Math.exp(-3 * dt));
    hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, preset.hemiIntensity, 3, dt);

    renderer.toneMappingExposure = THREE.MathUtils.damp(
      renderer.toneMappingExposure,
      preset.exposure,
      3,
      dt
    );
    starMat.opacity = THREE.MathUtils.damp(starMat.opacity, preset.starsOpacity, 3, dt);
    celestialOrb.position.set(
      preset.sunPos[0] * 1.9,
      Math.max(12, preset.sunPos[1] * 1.4),
      preset.sunPos[2] * 2.2
    );
    celestialMat.color.setHex(currentTimeOfDay === 'night' ? 0xe0f2fe : 0xfef08a);

    // 2. Palm Tree Gentle Sway, Sand Trap Spin, Bandits, Blow Machines & Power-Up Crystals
    for (let i = 0; i < palmCanopies.length; i++) {
      palmCanopies[i].rotation.z = Math.sin(elapsed * 1.4 + i) * 0.05;
    }
    for (const marker of trapMarkers.values()) {
      marker.rotation.y = elapsed * 2.5;
    }
    for (let i = 0; i < bandits.length; i++) {
      const b = bandits[i];
      b.head.rotation.y = Math.sin(elapsed * 1.8 + i) * 0.25;
      b.aimArm.rotation.x = Math.sin(elapsed * 2.4 + i) * 0.08;
    }
    for (let i = 0; i < blowMachines.length; i++) {
      const bm = blowMachines[i];
      bm.fanRotor.rotation.z = elapsed * 10;
      for (const wr of bm.windRings) {
        const phase = ((elapsed * 1.4 + (wr.userData.phase as number)) % 1);
        wr.position.z = 0.85 + phase * 1.5;
        wr.scale.setScalar(0.85 + phase * 0.8);
      }
    }
    for (let i = 0; i < powerCrystals.length; i++) {
      const c = powerCrystals[i];
      c.rotation.y = elapsed * 2.2 + i;
      c.position.y = 0.92 + Math.sin(elapsed * 3.2 + i) * 0.14;
    }
    if (oasisWaterMesh) {
      oasisWaterMesh.position.y = -0.26 + Math.sin(elapsed * 1.6) * 0.02;
    }
    distantCity.windowMat.emissiveIntensity = THREE.MathUtils.damp(
      distantCity.windowMat.emissiveIntensity,
      preset.cityGlow,
      3,
      dt
    );

    // 3. Wind-blown Sand Particles
    if (sandstormBurstTimer > 0) {
      sandstormBurstTimer = Math.max(0, sandstormBurstTimer - dt);
    }
    const windSpeed = sandstormBurstTimer > 0 ? 22 : 4.2;
    const sArr = sandGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < sandCount; i++) {
      sArr[i * 3] += windSpeed * dt;
      sArr[i * 3 + 1] += Math.sin(elapsed * 2 + i) * 0.4 * dt;
      if (sArr[i * 3] > 45) sArr[i * 3] = -45;
    }
    sandGeo.attributes.position.needsUpdate = true;

    // 4. Camel Hop Interpolation & Animations
    for (const entry of camelMap.values()) {
      const dist = entry.curPos.distanceTo(entry.targetPos);
      if (dist > 0.02) {
        entry.curPos.x = THREE.MathUtils.damp(entry.curPos.x, entry.targetPos.x, 8.5, dt);
        entry.curPos.z = THREE.MathUtils.damp(entry.curPos.z, entry.targetPos.z, 8.5, dt);
        entry.curPos.y = THREE.MathUtils.damp(entry.curPos.y, entry.targetPos.y, 10, dt);
        const hopLift = Math.sin(Math.min(1, dist * 0.5) * Math.PI) * 0.75;
        entry.rig.root.position.set(entry.curPos.x, entry.curPos.y + hopLift, entry.curPos.z);
        entry.shadow.position.set(entry.curPos.x, 0.435, entry.curPos.z);
        entry.isMoving = true;
      } else {
        entry.curPos.copy(entry.targetPos);
        entry.rig.root.position.copy(entry.curPos);
        entry.shadow.position.set(entry.curPos.x, 0.435, entry.curPos.z);
        entry.isMoving = false;
      }

      // Smooth yaw alignment
      let diff = entry.targetYaw - entry.curYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      entry.curYaw += diff * (1 - Math.exp(-8 * dt));
      entry.rig.root.rotation.y = entry.curYaw;

      entry.rig.animate(elapsed, entry.isMoving, entry.isStunned);
    }

    // 5. Smooth Camera Tracking Presets
    if (scriptedCamActive && cachedTiles.length > 0) {
      if (currentCameraMode === 'overview') {
        _targetLook.set(0, 1.5, -14);
        const span = cachedTiles.length > 35 ? 46 : 33;
        _targetCamPos.set(0, span * 0.64, span * 1.15);
      } else if (currentCameraMode === 'follow' && currentActivePlayerId) {
        const activeEntry = camelMap.get(currentActivePlayerId);
        if (activeEntry) {
          _v1.copy(activeEntry.curPos);
          const fwdX = Math.sin(activeEntry.curYaw);
          const fwdZ = Math.cos(activeEntry.curYaw);
          const rLen = Math.max(0.001, Math.hypot(_v1.x, _v1.z));
          const outX = _v1.x / rLen;
          const outZ = _v1.z / rLen;
          _targetLook.set(_v1.x + fwdX * 2.5, _v1.y + 0.85, _v1.z + fwdZ * 2.5);
          _targetCamPos.set(
            _v1.x - fwdX * 10.5 + outX * 4.2,
            _v1.y + 9.5,
            _v1.z - fwdZ * 10.5 + outZ * 4.2
          );
        }
      } else if (currentCameraMode === 'leader' && currentPlayersSnapshot.length > 0) {
        const leader = [...currentPlayersSnapshot].sort(
          (a, b) => b.position - a.position
        )[0];
        const leaderEntry = leader ? camelMap.get(leader.id) : undefined;
        if (leaderEntry) {
          _v2.copy(leaderEntry.curPos);
          _targetLook.set(_v2.x, _v2.y + 0.8, _v2.z);
          _targetCamPos.set(_v2.x + 8, _v2.y + 10, _v2.z + 12);
        }
      }

      camera.position.lerp(_targetCamPos, 1 - Math.exp(-4.5 * dt));
      controls.target.lerp(_targetLook, 1 - Math.exp(-5.5 * dt));
    }

    if (tileSelectionEnabled && hoveredTileIdx !== null) {
      hoverRing.scale.setScalar(1 + Math.sin(elapsed * 6) * 0.06);
    }

    controls.update();
    renderer.render(scene, camera);

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);
  }

  tick();

  return {
    syncBoard,
    syncSandTraps,
    syncPlayers(players, activePlayerId) {
      syncPlayers(players, activePlayerId);
    },
    setCameraMode(mode) {
      setCameraMode(mode);
    },
    setTimeOfDay,
    setTileSelectionMode,
    triggerSandstormVisual,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('click', onPointerClick);
      canvas.removeEventListener('webglcontextlost', onCtxLost);
      canvas.removeEventListener('webglcontextrestored', onCtxRestored);
      controls.dispose();
      for (const entry of camelMap.values()) {
        entry.rig.dispose();
      }
      trackDisposables.forEach((d) => d.dispose());
      distantCityDisposables.forEach((d) => d.dispose());
      duneSphereGeo.dispose();
      boulderGeo.dispose();
      mesaMat.dispose();
      outerRockMat.dispose();
      outerDuneMat.dispose();
      upcomingRingGeo.dispose();
      upcomingRings.forEach((r) => (r.material as THREE.Material).dispose());
      terrainTex.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      shadowTex.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      sandGeo.dispose();
      sandMat.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    },
  };
}
