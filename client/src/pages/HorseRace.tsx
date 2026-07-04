import { useState, useEffect, useRef, useCallback, useMemo, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ArrowLeft, Trophy, Play, SkipForward, Crown, Timer, Share2, RotateCcw, Send, ChevronRight, ChevronLeft, Zap, Clock, RotateCw } from "lucide-react";

class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("GLB model load error, using procedural fallback:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

type GameScreen = "intro" | "menu" | "select" | "prerace" | "race" | "results" | "leaderboard";

interface HorseConfig {
  id: string;
  name: string;
  color: string;
  jockeyColor: string;
  speed: number;
  stamina: number;
  description: string;
  bodyColor: string;
  maneColor: string;
}

interface RaceResult {
  finishTime: number;
  rank: number;
  horseName: string;
  horseId: string;
  trackType: "short" | "long";
}

interface LeaderboardEntry {
  id: string;
  horseName: string;
  finishTime: number;
  rank: number;
  trackType: string;
  createdAt: string;
}

const LEADERBOARD_STORAGE_KEY = "raceLeaderboard";

function readLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.finishTime === "number")
      .sort((a, b) => a.finishTime - b.finishTime)
      .slice(0, 20);
  } catch {
    return [];
  }
}

function saveLeaderboardEntry(entry: Omit<LeaderboardEntry, "id" | "createdAt">) {
  const scores = readLeaderboard();
  scores.push({
    ...entry,
    id: Math.random().toString(36).substring(2) + Date.now().toString(36),
    createdAt: new Date().toISOString(),
  });
  scores.sort((a, b) => a.finishTime - b.finishTime);
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(scores.slice(0, 20)));
}

const HORSES: HorseConfig[] = [
  {
    id: "rebels_romance",
    name: "Rebel's Romance",
    color: "#1a1a2e",
    jockeyColor: "#2E4A8B",
    speed: 90,
    stamina: 85,
    description: "A powerful dark stallion known for his explosive speed and endurance on the Meydan track.",
    bodyColor: "#1a1a2e",
    maneColor: "#0a0a15",
  },
  {
    id: "muraad",
    name: "Muraad",
    color: "#8B4513",
    jockeyColor: "#8B3A2A",
    speed: 85,
    stamina: 92,
    description: "A chestnut champion with unmatched stamina and a fierce competitive spirit.",
    bodyColor: "#8B4513",
    maneColor: "#5C2D0E",
  },
  {
    id: "commissioner_king",
    name: "Commissioner King",
    color: "#2d2d3d",
    jockeyColor: "#C0C0C0",
    speed: 88,
    stamina: 88,
    description: "A dark bay powerhouse with perfect balance of speed and endurance.",
    bodyColor: "#3d3d4d",
    maneColor: "#1a1a2a",
  },
  {
    id: "el_nasseeb",
    name: "El Nasseeb",
    color: "#f5f0e1",
    jockeyColor: "#2ecc71",
    speed: 82,
    stamina: 95,
    description: "A grey Arabian thoroughbred with legendary endurance and heart.",
    bodyColor: "#d4c8b0",
    maneColor: "#a89880",
  },
];

const BRAND = {
  chocolate: "#5C3D2E",
  camel: "#B89B71",
  terracotta: "#8B3A2A",
  blue: "#2E4A8B",
  sage: "#5A7A5A",
  copper: "#C4883A",
  cream: "#D4C4A8",
};

const HORSE_MODELS: Record<string, string> = {
  rebels_romance: `${import.meta.env.BASE_URL}models/rebels_romance.glb`,
  muraad: `${import.meta.env.BASE_URL}models/muraad.glb`,
  commissioner_king: `${import.meta.env.BASE_URL}models/commissioner_king.glb`,
  el_nasseeb: `${import.meta.env.BASE_URL}models/rebels_romance.glb?v=el_nasseeb`,
};

const HORSE_IMAGES: Record<string, string> = {
  rebels_romance: `${import.meta.env.BASE_URL}images/horses/rebels_romance.png`,
  muraad: `${import.meta.env.BASE_URL}images/horses/muraad.png`,
  commissioner_king: `${import.meta.env.BASE_URL}images/horses/commissioner_king.png`,
  el_nasseeb: `${import.meta.env.BASE_URL}images/horses/el_nasseeb.png`,
};

const HORSE_ROT_Y: Record<string, number> = {
  rebels_romance: -Math.PI / 2,
  muraad: -Math.PI / 2,
  commissioner_king: -Math.PI / 2,
  el_nasseeb: -Math.PI / 2,
};

const SCENE_MODELS: Record<string, string> = {
  spectator_standing: `${import.meta.env.BASE_URL}models/spectator_standing.glb`,
  spectator_cheering: `${import.meta.env.BASE_URL}models/spectator_cheering.glb`,
  spectator_seated: `${import.meta.env.BASE_URL}models/spectator_seated.glb`,
  grandstand: `${import.meta.env.BASE_URL}models/grandstand.glb`,
  start_gate: `${import.meta.env.BASE_URL}models/start_gate.glb`,
  finish_post: `${import.meta.env.BASE_URL}models/finish_post.glb`,
  fence_segment: `${import.meta.env.BASE_URL}models/fence_segment.glb`,
  billboard_frame: `${import.meta.env.BASE_URL}models/billboard_frame.glb`,
  palm_tree: `${import.meta.env.BASE_URL}models/palm_tree.glb`,
  flag_pole: `${import.meta.env.BASE_URL}models/flag_pole.glb`,
  barrier: `${import.meta.env.BASE_URL}models/barrier.glb`,
};

const SPRITE_IMAGES = {
  grandstand: `${import.meta.env.BASE_URL}images/sprites/grandstand.png`,
};

const spriteTextureCache = new Map<string, THREE.Texture>();
function useSpriteTexture(url: string): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(() => spriteTextureCache.get(url) || null);
  useEffect(() => {
    if (spriteTextureCache.has(url)) {
      setTexture(spriteTextureCache.get(url)!);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        if (cancelled) return;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        spriteTextureCache.set(url, tex);
        setTexture(tex);
      },
      undefined,
      () => { if (!cancelled) setTexture(null); }
    );
    return () => { cancelled = true; };
  }, [url]);
  return texture;
}

function useModelAvailable(url: string): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        if (!r.ok) return;
        const ct = (r.headers.get("content-type") || "").toLowerCase();
        const isModel = ct.includes("model") || ct.includes("octet-stream") || ct.includes("gltf") || ct.includes("binary");
        const isHtml = ct.includes("text/html");
        if (isModel || (!isHtml && r.ok)) {
          setAvailable(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [url]);
  return available;
}

function GLBSceneModel({
  modelUrl,
  scale = 1,
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
}: {
  modelUrl: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  return (
    <group scale={[scale, scale, scale]} position={position} rotation={rotation}>
      <primitive object={clonedScene} />
    </group>
  );
}

const SPONSOR_IMAGES = [
  `${import.meta.env.BASE_URL}images/sponsors/longines.png`,
  `${import.meta.env.BASE_URL}images/sponsors/emirates.png`,
  `${import.meta.env.BASE_URL}images/sponsors/dpworld.png`,
  `${import.meta.env.BASE_URL}images/sponsors/nakheel.png`,
  `${import.meta.env.BASE_URL}images/sponsors/derby.png`,
  `${import.meta.env.BASE_URL}images/sponsors/azizi.png`,
  `${import.meta.env.BASE_URL}images/sponsors/emaar.png`,
  `${import.meta.env.BASE_URL}images/sponsors/altayer.png`,
];

function ProceduralHorseFallback({
  bodyColor,
  scale = 2,
  rotY = -Math.PI / 2,
}: {
  bodyColor: string;
  scale?: number;
  rotY?: number;
}) {
  return (
    <group scale={[scale, scale, scale]} position={[0, 0.6, 0]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.5, 0.55, 1.4]} />
        <meshStandardMaterial color={bodyColor} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.2, -0.7]}>
        <boxGeometry args={[0.25, 0.35, 0.5]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      {[[-0.18, -0.45], [0.18, -0.45], [-0.18, 0.45], [0.18, 0.45]].map(([x, z], i) => (
        <mesh key={`leg-${i}`} position={[x, 0.2, z]}>
          <boxGeometry args={[0.12, 0.45, 0.12]} />
          <meshStandardMaterial color={bodyColor} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

let glbInstanceCounter = 0;

interface LegRegion {
  indices: number[];
  pivotY: number;
  pivotZ: number;
}

interface HorseLegData {
  frontLeft: LegRegion;
  frontRight: LegRegion;
  backLeft: LegRegion;
  backRight: LegRegion;
  originalPositions: Float32Array;
}

function analyzeHorseLegs(geometry: THREE.BufferGeometry): HorseLegData | null {
  const posAttr = geometry.getAttribute("position");
  if (!posAttr) return null;

  const positions = posAttr.array as Float32Array;
  const count = posAttr.count;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const height = maxY - minY;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;

  const legCutoffY = minY + height * 0.42;
  const frontBackSplit = minZ + depth * 0.45;

  const frontShoulderY = minY + height * 0.45;
  const frontShoulderZ = minZ + depth * 0.25;
  const backHipY = minY + height * 0.45;
  const backHipZ = minZ + depth * 0.7;

  const fl: number[] = [];
  const fr: number[] = [];
  const bl: number[] = [];
  const br: number[] = [];

  for (let i = 0; i < count; i++) {
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const x = positions[i * 3];

    if (y > legCutoffY) continue;

    if (z < frontBackSplit) {
      if (x < centerX) {
        fl.push(i);
      } else {
        fr.push(i);
      }
    } else {
      if (x < centerX) {
        bl.push(i);
      } else {
        br.push(i);
      }
    }
  }

  const originalPositions = new Float32Array(positions.length);
  originalPositions.set(positions);

  return {
    frontLeft: { indices: fl, pivotY: frontShoulderY, pivotZ: frontShoulderZ },
    frontRight: { indices: fr, pivotY: frontShoulderY, pivotZ: frontShoulderZ },
    backLeft: { indices: bl, pivotY: backHipY, pivotZ: backHipZ },
    backRight: { indices: br, pivotY: backHipY, pivotZ: backHipZ },
    originalPositions,
  };
}

function getGallopLegAngle(phase: number, legOffset: number): number {
  const t = ((phase + legOffset) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const norm = t / (Math.PI * 2);

  if (norm < 0.1) {
    return THREE.MathUtils.lerp(0.4, 0.65, norm / 0.1);
  } else if (norm < 0.2) {
    return THREE.MathUtils.lerp(0.65, 0.5, (norm - 0.1) / 0.1);
  } else if (norm < 0.35) {
    return THREE.MathUtils.lerp(0.5, -0.1, (norm - 0.2) / 0.15);
  } else if (norm < 0.5) {
    return THREE.MathUtils.lerp(-0.1, -0.55, (norm - 0.35) / 0.15);
  } else if (norm < 0.65) {
    return THREE.MathUtils.lerp(-0.55, -0.5, (norm - 0.5) / 0.15);
  } else if (norm < 0.8) {
    return THREE.MathUtils.lerp(-0.5, -0.1, (norm - 0.65) / 0.15);
  } else if (norm < 0.9) {
    return THREE.MathUtils.lerp(-0.1, 0.25, (norm - 0.8) / 0.1);
  } else {
    return THREE.MathUtils.lerp(0.25, 0.4, (norm - 0.9) / 0.1);
  }
}

const GALLOP_LEG_OFFSETS = {
  backLeft: 0,
  backRight: Math.PI * 0.12,
  frontLeft: Math.PI * 0.88,
  frontRight: Math.PI * 1.0,
};

function applyGallopDeformation(
  geometry: THREE.BufferGeometry,
  legData: HorseLegData,
  phase: number,
  intensity: number,
) {
  const posAttr = geometry.getAttribute("position");
  if (!posAttr) return;

  const positions = posAttr.array as Float32Array;
  const orig = legData.originalPositions;

  positions.set(orig);

  if (intensity < 0.01) {
    posAttr.needsUpdate = true;
    return;
  }

  const legs: [LegRegion, number][] = [
    [legData.frontLeft, GALLOP_LEG_OFFSETS.frontLeft],
    [legData.frontRight, GALLOP_LEG_OFFSETS.frontRight],
    [legData.backLeft, GALLOP_LEG_OFFSETS.backLeft],
    [legData.backRight, GALLOP_LEG_OFFSETS.backRight],
  ];

  for (const [leg, offset] of legs) {
    const angle = getGallopLegAngle(phase, offset) * intensity;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (const idx of leg.indices) {
      const oy = orig[idx * 3 + 1] - leg.pivotY;
      const oz = orig[idx * 3 + 2] - leg.pivotZ;

      positions[idx * 3 + 1] = leg.pivotY + (oy * cosA - oz * sinA);
      positions[idx * 3 + 2] = leg.pivotZ + (oy * sinA + oz * cosA);
    }
  }

  posAttr.needsUpdate = true;
}

function GLBHorse({
  modelUrl,
  autoAnimate = false,
  autoSpeed = 3,
  scale = 3,
  yOffset = 1.2,
  rotY = -Math.PI / 2,
  speedNormalized = 1,
  raceStarted = true,
  raceFinished = false,
}: {
  modelUrl: string;
  autoAnimate?: boolean;
  autoSpeed?: number;
  scale?: number;
  yOffset?: number;
  rotY?: number;
  speedNormalized?: number;
  raceStarted?: boolean;
  raceFinished?: boolean;
}) {
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);
  const instanceId = useRef(++glbInstanceCounter);
  const legDataRef = useRef<HorseLegData | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry = mesh.geometry.clone();
        }
        if (mesh.material) {
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map(m => m.clone())
            : mesh.material.clone();
        }
      }
    });
    return clone;
  }, [scene, instanceId.current]);

  useMemo(() => {
    legDataRef.current = null;
    meshRef.current = null;
    clonedScene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh && !legDataRef.current) {
        const mesh = child as THREE.Mesh;
        const data = analyzeHorseLegs(mesh.geometry);
        if (data) {
          legDataRef.current = data;
          meshRef.current = mesh;
        }
      }
    });
  }, [clonedScene]);

  const baseY = useRef(yOffset);
  const internalPhaseRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const isAnimating = autoAnimate || (raceStarted && !raceFinished);

    if (!isAnimating) {
      groupRef.current.position.y = baseY.current;
      groupRef.current.rotation.set(0, rotY, 0);
      if (legDataRef.current && meshRef.current) {
        applyGallopDeformation(meshRef.current.geometry, legDataRef.current, 0, 0);
      }
      return;
    }

    if (autoAnimate) {
      internalPhaseRef.current = state.clock.elapsedTime * autoSpeed;
    } else if (speedNormalized > 0.01) {
      internalPhaseRef.current += delta * speedNormalized * 6;
    }

    const intensity = autoAnimate ? 0.6 : Math.min(1, speedNormalized);
    const gallopCyclePos = internalPhaseRef.current * 2;
    const contactPhase = ((gallopCyclePos % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const blAngle = getGallopLegAngle(contactPhase, GALLOP_LEG_OFFSETS.backLeft);
    const groundContact = Math.max(0, -blAngle);
    const verticalBob = (Math.sin(gallopCyclePos) * 0.05 + groundContact * 0.025) * intensity;
    const forwardTilt = Math.sin(gallopCyclePos) * 0.03 * intensity;
    const lateralRock = Math.sin(gallopCyclePos * 0.5) * 0.01 * intensity;

    groupRef.current.position.y = baseY.current + verticalBob;
    groupRef.current.rotation.set(lateralRock, rotY, forwardTilt);

    if (legDataRef.current && meshRef.current) {
      applyGallopDeformation(meshRef.current.geometry, legDataRef.current, gallopCyclePos, intensity);
    }
  });

  return (
    <group ref={groupRef} scale={[scale, scale, scale]} rotation={[0, rotY, 0]} position={[0, yOffset, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
}

function RaceHorse({
  position,
  horseConfig,
  isPlayer,
  speed,
  raceStarted = true,
  raceFinished = false,
}: {
  position: [number, number, number];
  horseConfig: HorseConfig;
  isPlayer: boolean;
  speed: number;
  raceStarted?: boolean;
  raceFinished?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const modelUrl = HORSE_MODELS[horseConfig.id];

  return (
    <group ref={groupRef} position={position}>
      {modelUrl ? (
        <ModelErrorBoundary fallback={<ProceduralHorseFallback bodyColor={horseConfig.bodyColor} scale={2} />}>
          <Suspense fallback={<ProceduralHorseFallback bodyColor={horseConfig.bodyColor} scale={2} />}>
            <GLBHorse
              modelUrl={modelUrl}
              scale={3}
              yOffset={1.2}
              rotY={HORSE_ROT_Y[horseConfig.id] || -Math.PI / 2}
              speedNormalized={speed}
              raceStarted={raceStarted}
              raceFinished={raceFinished}
            />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <ProceduralHorseFallback
          bodyColor={horseConfig.bodyColor}
          scale={2}
        />
      )}
      {isPlayer && (
        <pointLight
          position={[0, 3, 0]}
          intensity={0.8}
          color={BRAND.copper}
          distance={8}
        />
      )}
    </group>
  );
}

function ProceduralFenceFallback({ x, z }: { x: number; z: number }) {
  return (
    <group>
      <mesh position={[x, 0.35, z]}>
        <cylinderGeometry args={[0.02, 0.025, 0.7, 6]} />
        <meshStandardMaterial color="white" roughness={0.15} metalness={0.8} />
      </mesh>
      <mesh position={[x + 1.5, 0.6, z]}>
        <boxGeometry args={[3, 0.025, 0.04]} />
        <meshStandardMaterial color="white" roughness={0.15} metalness={0.8} />
      </mesh>
      <mesh position={[x + 1.5, 0.45, z]}>
        <boxGeometry args={[3, 0.025, 0.04]} />
        <meshStandardMaterial color="white" roughness={0.15} metalness={0.8} />
      </mesh>
    </group>
  );
}

function InstancedFenceGLB({ modelUrl, positions }: { modelUrl: string; positions: [number, number, number][] }) {
  const { scene } = useGLTF(modelUrl);
  const meshRefs = useRef<THREE.InstancedMesh[]>([]);

  const meshEntries = useMemo(() => {
    const entries: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
    scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat) => {
          entries.push({ geometry: mesh.geometry, material: mat });
        });
      }
    });
    return entries;
  }, [scene]);

  useEffect(() => {
    meshRefs.current.forEach((instancedMesh) => {
      if (!instancedMesh) return;
      const dummy = new THREE.Object3D();
      positions.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(0.7, 0.7, 0.7);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      });
      instancedMesh.instanceMatrix.needsUpdate = true;
    });
  }, [positions, meshEntries]);

  if (meshEntries.length === 0) return null;

  return (
    <group>
      {meshEntries.map((entry, idx) => (
        <instancedMesh
          key={idx}
          ref={(el: THREE.InstancedMesh) => { meshRefs.current[idx] = el; }}
          args={[entry.geometry, entry.material, positions.length]}
        />
      ))}
    </group>
  );
}

function TrackFencing({ trackLength, trackDepth }: { trackLength: number; trackDepth: number }) {
  const fenceModelAvailable = useModelAvailable(SCENE_MODELS.fence_segment);
  const fenceCount = Math.ceil(trackLength / 3) + 4;

  const fencePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    [-(trackDepth / 2 + 0.5), trackDepth / 2 + 0.5].forEach((z) => {
      for (let j = 0; j < fenceCount; j++) {
        positions.push([-5 + j * 3, 0, z]);
      }
    });
    return positions;
  }, [trackDepth, fenceCount]);

  const proceduralFallback = useMemo(() => (
    <>
      {[-(trackDepth / 2 + 0.5), trackDepth / 2 + 0.5].map((z, i) => (
        <group key={`rail-${i}`}>
          {Array.from({ length: fenceCount }).map((_, j) => {
            const x = -5 + j * 3;
            return (
              <group key={`rp-${i}-${j}`}>
                <mesh position={[x, 0.35, z]}>
                  <cylinderGeometry args={[0.02, 0.025, 0.7, 6]} />
                  <meshStandardMaterial color="white" roughness={0.15} metalness={0.8} />
                </mesh>
                {j % 2 === 0 && (
                  <>
                    <mesh position={[x + 1.5, 0.6, z]}>
                      <boxGeometry args={[3, 0.025, 0.04]} />
                      <meshStandardMaterial color="white" roughness={0.15} metalness={0.8} />
                    </mesh>
                    <mesh position={[x + 1.5, 0.45, z]}>
                      <boxGeometry args={[3, 0.025, 0.04]} />
                      <meshStandardMaterial color="white" roughness={0.15} metalness={0.8} />
                    </mesh>
                  </>
                )}
              </group>
            );
          })}
        </group>
      ))}
    </>
  ), [trackDepth, fenceCount]);

  if (fenceModelAvailable) {
    return (
      <ModelErrorBoundary fallback={proceduralFallback}>
        <Suspense fallback={proceduralFallback}>
          <InstancedFenceGLB modelUrl={SCENE_MODELS.fence_segment} positions={fencePositions} />
        </Suspense>
      </ModelErrorBoundary>
    );
  }

  return proceduralFallback;
}

function SideViewTrack({ trackLength }: { trackLength: number }) {
  const laneCount = 4;
  const laneWidth = 3;
  const trackWidth = laneCount * laneWidth;
  const trackDepth = trackWidth + 4;
  const worldSize = 600;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[trackLength / 2, -0.2, 0]} receiveShadow>
        <planeGeometry args={[worldSize, worldSize]} />
        <meshStandardMaterial color="#1e4a16" roughness={0.95} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[trackLength / 2, -0.15, 0]} receiveShadow>
        <planeGeometry args={[worldSize - 50, worldSize - 50]} />
        <meshStandardMaterial color="#2a5e1e" roughness={0.95} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[trackLength / 2, -0.12, 0]} receiveShadow>
        <planeGeometry args={[trackLength + 200, 200]} />
        <meshStandardMaterial color="#3a7a2e" roughness={0.9} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[trackLength / 2, -0.01, 0]} receiveShadow>
        <planeGeometry args={[trackLength + 10, trackDepth]} />
        <meshStandardMaterial color="#c4a055" roughness={0.7} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[trackLength / 2, 0.0, 0]}>
        <planeGeometry args={[trackLength + 10, trackDepth - 0.5]} />
        <meshStandardMaterial color="#b89545" roughness={0.65} />
      </mesh>

      {[-(trackDepth / 2), trackDepth / 2].map((z, i) => (
        <mesh key={`edge-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[trackLength / 2, 0.02, z]}>
          <planeGeometry args={[trackLength + 10, 0.2]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}

      {Array.from({ length: laneCount - 1 }).map((_, i) => {
        const z = -(trackDepth / 2) + (i + 1) * laneWidth + 2;
        return (
          <mesh key={`lane-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[trackLength / 2, 0.02, z]}>
            <planeGeometry args={[trackLength + 10, 0.06]} />
            <meshStandardMaterial color="white" transparent opacity={0.3} />
          </mesh>
        );
      })}

      <TrackFencing trackLength={trackLength} trackDepth={trackDepth} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[trackLength / 2, -0.08, -(trackDepth / 2 + 20)]}>
        <planeGeometry args={[trackLength + 60, 30]} />
        <meshStandardMaterial color="#4a2e1a" roughness={1} />
      </mesh>
    </group>
  );
}

function PalmTreeInstance({ position, scale, rotY }: { position: [number, number, number]; scale: number; rotY: number }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/palm_tree.glb`);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child: any) => {
      if (child.isMesh) {
        child.material = child.material.clone();
      }
    });
    return c;
  }, [scene]);

  return (
    <primitive object={clone} position={position} scale={[scale, scale, scale]} rotation={[0, rotY, 0]} />
  );
}

function DistantScenery({ trackLength }: { trackLength: number }) {
  const palmPositions = useMemo(() => {
    const items: { x: number; z: number; s: number; rotY: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      items.push({
        x: -20 + Math.random() * (trackLength + 80),
        z: side * (30 + Math.random() * 45),
        s: 1.5 + Math.random() * 1.5,
        rotY: Math.random() * Math.PI * 2,
      });
    }
    return items;
  }, [trackLength]);

  const bleachers = useMemo(() => {
    const items: { x: number; z: number; w: number; rot: number }[] = [];
    for (let i = 0; i < 3; i++) {
      items.push({
        x: trackLength * 0.25 + i * (trackLength * 0.25),
        z: -35 - Math.random() * 10,
        w: 10 + Math.random() * 8,
        rot: 0,
      });
    }
    for (let i = 0; i < 2; i++) {
      items.push({
        x: trackLength * 0.35 + i * (trackLength * 0.3),
        z: 35 + Math.random() * 10,
        w: 8 + Math.random() * 10,
        rot: Math.PI,
      });
    }
    return items;
  }, [trackLength]);

  const bleacherMats = useMemo(() => ({
    light: new THREE.MeshLambertMaterial({ color: "#d0c8b8" }),
    dark: new THREE.MeshLambertMaterial({ color: "#c4baa8" }),
    roof: new THREE.MeshLambertMaterial({ color: "#8a7a6a" }),
  }), []);

  return (
    <group>
      {palmPositions.map((p, i) => (
        <PalmTreeInstance key={`palm-${i}`} position={[p.x, 0, p.z]} scale={p.s} rotY={p.rotY} />
      ))}

      {bleachers.map((b, i) => (
        <group key={`bl-${i}`} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          {Array.from({ length: 4 }).map((_, tier) => (
            <mesh key={`bt-${tier}`} position={[0, 0.5 + tier * 1.2, tier * 0.6]} material={tier % 2 === 0 ? bleacherMats.light : bleacherMats.dark}>
              <boxGeometry args={[b.w, 0.3, 2]} />
            </mesh>
          ))}
          <mesh position={[0, 3.5, 2.5]} material={bleacherMats.roof}>
            <boxGeometry args={[b.w + 1, 0.15, 5]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function createPersonTexture(shirtColor: string, skinTone: string, hasHat: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 32, 64);

  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.arc(16, 10, 6, 0, Math.PI * 2);
  ctx.fill();

  if (hasHat) {
    ctx.fillStyle = shirtColor;
    ctx.fillRect(8, 2, 16, 5);
    ctx.fillRect(6, 6, 20, 2);
  }

  ctx.fillStyle = shirtColor;
  ctx.fillRect(8, 16, 16, 20);

  ctx.fillStyle = skinTone;
  ctx.fillRect(4, 18, 4, 14);
  ctx.fillRect(24, 18, 4, 14);

  ctx.fillStyle = "#333";
  ctx.fillRect(10, 36, 5, 18);
  ctx.fillRect(17, 36, 5, 18);

  ctx.fillStyle = "#222";
  ctx.fillRect(9, 52, 7, 6);
  ctx.fillRect(16, 52, 7, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

const CROWD_SHIRT_COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#ffffff", "#e67e22", "#9b59b6", "#ff6b81", "#1abc9c", "#c0392b", "#2980b9", "#f39c12"];
const SKIN_TONES = ["#f5d0a9", "#d4a574", "#c68642", "#8d5524", "#e8beac", "#a0522d"];

const crowdTextureCache = new Map<string, THREE.CanvasTexture>();

function getCachedPersonTexture(shirt: string, skin: string, hasHat: boolean): THREE.CanvasTexture {
  const key = `${shirt}_${skin}_${hasHat ? 1 : 0}`;
  if (!crowdTextureCache.has(key)) {
    crowdTextureCache.set(key, createPersonTexture(shirt, skin, hasHat));
  }
  return crowdTextureCache.get(key)!;
}

const sharedCrowdGeometry = new THREE.PlaneGeometry(0.4, 0.7);

function InstancedCrowdGLB({
  modelUrl,
  crowdData,
}: {
  modelUrl: string;
  crowdData: { x: number; y: number; z: number; phase: number; amplitude: number }[];
}) {
  const { scene } = useGLTF(modelUrl);
  const meshRefs = useRef<THREE.InstancedMesh[]>([]);

  const meshEntries = useMemo(() => {
    const entries: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
    scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat) => {
          entries.push({ geometry: mesh.geometry, material: mat });
        });
      }
    });
    return entries;
  }, [scene]);

  const updateInstances = useCallback((positions: typeof crowdData) => {
    meshRefs.current.forEach((instancedMesh) => {
      if (!instancedMesh) return;
      const dummy = new THREE.Object3D();
      positions.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.set(0.4, 0.4, 0.4);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      });
      instancedMesh.instanceMatrix.needsUpdate = true;
    });
  }, []);

  useEffect(() => {
    if (meshEntries.length === 0) return;
    updateInstances(crowdData);
  }, [crowdData, meshEntries, updateInstances]);

  useFrame((state) => {
    if (meshEntries.length === 0) return;
    const t = state.clock.elapsedTime;
    const animated = crowdData.map((p) => ({
      ...p,
      y: p.y + Math.sin(t * 3 + p.phase) * p.amplitude,
    }));
    meshRefs.current.forEach((instancedMesh) => {
      if (!instancedMesh) return;
      const dummy = new THREE.Object3D();
      animated.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.set(0.4, 0.4, 0.4);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      });
      instancedMesh.instanceMatrix.needsUpdate = true;
    });
  });

  if (meshEntries.length === 0) return null;

  return (
    <group>
      {meshEntries.map((entry, idx) => (
        <instancedMesh
          key={idx}
          ref={(el: THREE.InstancedMesh) => { meshRefs.current[idx] = el; }}
          args={[entry.geometry, entry.material, crowdData.length]}
        />
      ))}
    </group>
  );
}

function AnimatedCrowd({ standLength, baseX, baseY, baseZ, tiers, density }: { standLength: number; baseX: number; baseY: number; baseZ: number; tiers: number; density: number }) {
  const crowdRef = useRef<THREE.Group>(null);
  const spectatorModels = [SCENE_MODELS.spectator_standing, SCENE_MODELS.spectator_cheering, SCENE_MODELS.spectator_seated];
  const modelsAvailable = [
    useModelAvailable(spectatorModels[0]),
    useModelAvailable(spectatorModels[1]),
    useModelAvailable(spectatorModels[2]),
  ];
  const anyModelAvailable = modelsAvailable.some(Boolean);

  const crowdData = useMemo(() => {
    const people: { x: number; y: number; z: number; phase: number; amplitude: number; variant: number; texKey: { shirt: string; skin: string; hat: boolean } }[] = [];
    for (let tier = 0; tier < tiers; tier++) {
      const count = Math.floor(standLength / density);
      for (let pi = 0; pi < count; pi++) {
        const shirtIdx = (tier * 13 + pi * 7) % CROWD_SHIRT_COLORS.length;
        const skinIdx = (tier * 11 + pi * 5) % SKIN_TONES.length;
        people.push({
          x: -standLength / 2 + density * 0.5 + pi * density,
          y: baseY + tier * 1.6,
          z: baseZ - tier * 0.6,
          phase: Math.random() * Math.PI * 2,
          amplitude: 0.1 + Math.random() * 0.2,
          variant: (tier + pi) % 3,
          texKey: { shirt: CROWD_SHIRT_COLORS[shirtIdx], skin: SKIN_TONES[skinIdx], hat: (tier + pi) % 4 === 0 },
        });
      }
    }
    return people;
  }, [standLength, baseY, baseZ, tiers, density]);

  const personMaterials = useMemo(() => {
    if (anyModelAvailable) return [];
    return crowdData.map((p) => {
      const tex = getCachedPersonTexture(p.texKey.shirt, p.texKey.skin, p.texKey.hat);
      return new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
    });
  }, [crowdData, anyModelAvailable]);

  useEffect(() => {
    return () => {
      personMaterials.forEach((m) => m.dispose());
    };
  }, [personMaterials]);

  useFrame((state) => {
    if (!crowdRef.current || anyModelAvailable) return;
    const t = state.clock.elapsedTime;
    crowdRef.current.children.forEach((child, i) => {
      if (i < crowdData.length) {
        const d = crowdData[i];
        child.position.y = d.y + Math.sin(t * 3 + d.phase) * d.amplitude;
      }
    });
  });

  if (anyModelAvailable) {
    const availableModels = spectatorModels.filter((_, i) => modelsAvailable[i]);
    const groupedByVariant = new Map<string, typeof crowdData>();
    crowdData.forEach((p) => {
      const modelUrl = availableModels[p.variant % availableModels.length];
      if (!groupedByVariant.has(modelUrl)) groupedByVariant.set(modelUrl, []);
      groupedByVariant.get(modelUrl)!.push(p);
    });

    const spriteFallback = (
      <group ref={crowdRef}>
        {crowdData.map((p, i) => (
          <mesh key={`crowd-${i}`} position={[p.x, p.y, p.z]} geometry={sharedCrowdGeometry}>
            <meshBasicMaterial color={p.texKey.shirt} />
          </mesh>
        ))}
      </group>
    );

    return (
      <group position={[baseX, 0, 0]}>
        <ModelErrorBoundary fallback={spriteFallback}>
          <Suspense fallback={spriteFallback}>
            {Array.from(groupedByVariant.entries()).map(([url, data]) => (
              <InstancedCrowdGLB key={url} modelUrl={url} crowdData={data} />
            ))}
          </Suspense>
        </ModelErrorBoundary>
      </group>
    );
  }

  return (
    <group ref={crowdRef} position={[baseX, 0, 0]}>
      {crowdData.map((p, i) => (
        <mesh key={`crowd-${i}`} position={[p.x, p.y, p.z]} geometry={sharedCrowdGeometry} material={personMaterials[i]} />
      ))}
    </group>
  );
}

function ProceduralBillboardFallback({ sponsorTexture }: { sponsorTexture: THREE.Texture }) {
  return (
    <group>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[4.5, 1.6, 0.1]} />
        <meshStandardMaterial color="white" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.4, 0.06]}>
        <planeGeometry args={[4, 1.2]} />
        <meshStandardMaterial map={sponsorTexture} transparent />
      </mesh>
      <mesh position={[-2, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 1.2, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[2, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 1.2, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function SponsorBillboards({ trackLength }: { trackLength: number }) {
  const billboardModelAvailable = useModelAvailable(SCENE_MODELS.billboard_frame);
  const sponsorTextures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return SPONSOR_IMAGES.map((src) => loader.load(src));
  }, []);

  const billboardCount = Math.floor(trackLength / 12) + 1;

  return (
    <group>
      {Array.from({ length: billboardCount }).map((_, i) => {
        const x = 5 + i * 12;
        const texIdx = i % sponsorTextures.length;
        return (
          <group key={`bb-${i}`} position={[x, 0, -12]}>
            {billboardModelAvailable ? (
              <ModelErrorBoundary fallback={<ProceduralBillboardFallback sponsorTexture={sponsorTextures[texIdx]} />}>
                <Suspense fallback={<ProceduralBillboardFallback sponsorTexture={sponsorTextures[texIdx]} />}>
                  <GLBSceneModel
                    modelUrl={SCENE_MODELS.billboard_frame}
                    scale={2}
                    position={[0, 0, 0]}
                  />
                  <mesh position={[0, 1.4, 0.06]}>
                    <planeGeometry args={[4, 1.2]} />
                    <meshStandardMaterial map={sponsorTextures[texIdx]} transparent />
                  </mesh>
                </Suspense>
              </ModelErrorBoundary>
            ) : (
              <ProceduralBillboardFallback sponsorTexture={sponsorTextures[texIdx]} />
            )}
          </group>
        );
      })}
    </group>
  );
}

function ProceduralGrandstandFallback({ standLength }: { standLength: number }) {
  return (
    <group>
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[standLength, 8, 5]} />
        <meshStandardMaterial color="#f0ece4" roughness={0.4} metalness={0.1} />
      </mesh>
      {Array.from({ length: Math.floor(standLength / 4) }).map((_, i) => (
        <mesh key={`win-${i}`} position={[-standLength / 2 + 2 + i * 4, 5.5, 2.51]}>
          <planeGeometry args={[2.5, 2]} />
          <meshStandardMaterial color="#6ab4e8" transparent opacity={0.35} metalness={0.9} roughness={0.05} />
        </mesh>
      ))}
      <mesh position={[0, 8.3, 0]}>
        <boxGeometry args={[standLength + 3, 0.2, 7]} />
        <meshStandardMaterial color="white" roughness={0.2} metalness={0.4} />
      </mesh>
      <mesh position={[0, 9, -0.5]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[standLength + 3, 0.1, 8]} />
        <meshStandardMaterial color="white" transparent opacity={0.4} metalness={0.6} roughness={0.1} />
      </mesh>
    </group>
  );
}

function ProceduralSmallStandFallback({ standLength }: { standLength: number }) {
  return (
    <group>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[standLength, 5, 3.5]} />
        <meshStandardMaterial color="#f0ece4" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[standLength + 2, 0.15, 4.5]} />
        <meshStandardMaterial color="white" roughness={0.2} metalness={0.3} />
      </mesh>
    </group>
  );
}

function SpriteGrandstandBackdrop({ standLength, height = 12 }: { standLength: number; height?: number }) {
  const tex = useSpriteTexture(SPRITE_IMAGES.grandstand);
  if (!tex) return null;
  return (
    <mesh position={[0, height / 2, 0]}>
      <planeGeometry args={[standLength, height]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
}

function SideViewGrandstand({ trackLength }: { trackLength: number }) {
  const standLength = trackLength * 0.9;
  const grandstandSpriteTex = useSpriteTexture(SPRITE_IMAGES.grandstand);
  const hasSprite = grandstandSpriteTex !== null;

  return (
    <group>
      <group position={[trackLength * 0.5, 0, -25]}>
        {hasSprite ? (
          <SpriteGrandstandBackdrop standLength={standLength} height={14} />
        ) : (
          <ProceduralGrandstandFallback standLength={standLength} />
        )}

        <AnimatedCrowd standLength={standLength} baseX={0} baseY={1.2} baseZ={2.5} tiers={4} density={1.0} />
      </group>

      <group position={[trackLength * 0.45, 0, 22]}>
        {hasSprite ? (
          <SpriteGrandstandBackdrop standLength={standLength * 0.5} height={8} />
        ) : (
          <ProceduralSmallStandFallback standLength={standLength * 0.5} />
        )}

        <AnimatedCrowd standLength={standLength * 0.5} baseX={0} baseY={0.8} baseZ={-1.5} tiers={2} density={1.3} />
      </group>
    </group>
  );
}

function ProceduralFinishPostFallback() {
  return (
    <group>
      <mesh position={[0, 4, -9]}>
        <cylinderGeometry args={[0.2, 0.25, 8, 8]} />
        <meshStandardMaterial color="white" metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[0, 4, 9]}>
        <cylinderGeometry args={[0.2, 0.25, 8, 8]} />
        <meshStandardMaterial color="white" metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[0, 8.2, 0]}>
        <boxGeometry args={[0.3, 0.4, 18.5]} />
        <meshStandardMaterial color="white" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, 7, -9]}>
        <boxGeometry args={[1.2, 2, 1.2]} />
        <meshStandardMaterial color="#8B3A2A" />
      </mesh>
      <mesh position={[0, 6, -9]}>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0, 8.5, -9]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#C4883A" metalness={0.8} roughness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[2, 18]} />
        <meshStandardMaterial color="white" transparent opacity={0.8} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`fch-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.04, -7 + i * 3]}>
          <planeGeometry args={[0.8, 2.5]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#1a1a1a" : "white"} />
        </mesh>
      ))}
    </group>
  );
}

function FinishPost({ trackLength }: { trackLength: number }) {
  const finishModelAvailable = useModelAvailable(SCENE_MODELS.finish_post);

  return (
    <group position={[trackLength, 0, 0]}>
      {finishModelAvailable ? (
        <ModelErrorBoundary fallback={<ProceduralFinishPostFallback />}>
          <Suspense fallback={<ProceduralFinishPostFallback />}>
            <GLBSceneModel
              modelUrl={SCENE_MODELS.finish_post}
              scale={3}
              position={[0, 0, 0]}
            />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
              <planeGeometry args={[2, 18]} />
              <meshStandardMaterial color="white" transparent opacity={0.8} />
            </mesh>
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={`fch-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.04, -7 + i * 3]}>
                <planeGeometry args={[0.8, 2.5]} />
                <meshStandardMaterial color={i % 2 === 0 ? "#1a1a1a" : "white"} />
              </mesh>
            ))}
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <ProceduralFinishPostFallback />
      )}
    </group>
  );
}

function ProceduralStartGateFallback({ laneCount }: { laneCount: number }) {
  const laneWidth = 3;
  const totalWidth = laneCount * laneWidth + 4;

  return (
    <group>
      {Array.from({ length: laneCount }).map((_, i) => {
        const z = -(totalWidth / 2) + 2 + i * laneWidth + laneWidth / 2;
        return (
          <group key={`gate-${i}`} position={[0, 0, z]}>
            <mesh position={[0, 2, -laneWidth / 2 + 0.1]}>
              <boxGeometry args={[0.06, 4, 0.4]} />
              <meshStandardMaterial color="#e0e0e0" metalness={0.95} roughness={0.1} />
            </mesh>
            <mesh position={[0, 2, laneWidth / 2 - 0.1]}>
              <boxGeometry args={[0.06, 4, 0.4]} />
              <meshStandardMaterial color="#e0e0e0" metalness={0.95} roughness={0.1} />
            </mesh>
            <mesh position={[0, 4, 0]}>
              <boxGeometry args={[0.06, 0.1, laneWidth - 0.2]} />
              <meshStandardMaterial color="#e0e0e0" metalness={0.95} roughness={0.1} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 4.3, 0]}>
        <boxGeometry args={[0.5, 0.12, totalWidth]} />
        <meshStandardMaterial color="#C4883A" metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
  );
}

function StartGate({ laneCount }: { laneCount: number }) {
  const startGateModelAvailable = useModelAvailable(SCENE_MODELS.start_gate);
  const laneWidth = 3;
  const totalWidth = laneCount * laneWidth + 4;

  return (
    <group position={[0, 0, 0]}>
      {startGateModelAvailable ? (
        <ModelErrorBoundary fallback={<ProceduralStartGateFallback laneCount={laneCount} />}>
          <Suspense fallback={<ProceduralStartGateFallback laneCount={laneCount} />}>
            <GLBSceneModel
              modelUrl={SCENE_MODELS.start_gate}
              scale={totalWidth / 5}
              position={[0, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
            />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <ProceduralStartGateFallback laneCount={laneCount} />
      )}
    </group>
  );
}

function ProceduralPalmTreeFallback({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.15, 0.25, 6, 8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        const tilt = 0.6;
        return (
          <group key={`frond-${i}`} position={[0, 6, 0]} rotation={[tilt, angle, 0]}>
            <mesh position={[0, 0, 1.5]}>
              <boxGeometry args={[0.3, 0.05, 3]} />
              <meshStandardMaterial color="#2d6b1e" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ProceduralFlagFallback({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 7, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.4, 6.2, 0]}>
        <planeGeometry args={[0.8, 0.5]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function ProceduralBarrierFallback({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.5, 0.6, 0.4]} />
        <meshStandardMaterial color="#cc3333" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.41]} />
        <meshStandardMaterial color="white" roughness={0.8} />
      </mesh>
    </group>
  );
}

function EnvironmentalProps({ trackLength }: { trackLength: number }) {
  const palmModelAvailable = useModelAvailable(SCENE_MODELS.palm_tree);
  const flagModelAvailable = useModelAvailable(SCENE_MODELS.flag_pole);
  const barrierModelAvailable = useModelAvailable(SCENE_MODELS.barrier);

  const palmPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < Math.floor(trackLength / 15) + 2; i++) {
      positions.push([-5 + i * 15, 0, -35]);
      positions.push([-5 + i * 15, 0, 30]);
    }
    positions.push([trackLength + 10, 0, -15]);
    positions.push([trackLength + 10, 0, 15]);
    positions.push([-10, 0, -15]);
    positions.push([-10, 0, 15]);
    return positions;
  }, [trackLength]);

  const flagPositions = useMemo(() => {
    const positions: { pos: [number, number, number]; color: string }[] = [];
    const colors = ["#cc0000", "#ffffff", "#006600", "#0033aa", "#C4883A"];
    for (let i = 0; i < Math.floor(trackLength / 20) + 1; i++) {
      positions.push({ pos: [i * 20, 0, -18], color: colors[i % colors.length] });
      positions.push({ pos: [i * 20, 0, 18], color: colors[(i + 2) % colors.length] });
    }
    return positions;
  }, [trackLength]);

  const barrierPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 5; i++) {
      positions.push([trackLength + 8 + i * 2, 0, -12 - i * 0.5]);
      positions.push([trackLength + 8 + i * 2, 0, 12 + i * 0.5]);
    }
    return positions;
  }, [trackLength]);

  return (
    <group>
      {palmPositions.map((pos, i) => (
        <group key={`palm-${i}`}>
          {palmModelAvailable ? (
            <ModelErrorBoundary fallback={<ProceduralPalmTreeFallback position={pos} />}>
              <Suspense fallback={<ProceduralPalmTreeFallback position={pos} />}>
                <GLBSceneModel
                  modelUrl={SCENE_MODELS.palm_tree}
                  scale={2}
                  position={pos}
                />
              </Suspense>
            </ModelErrorBoundary>
          ) : (
            <ProceduralPalmTreeFallback position={pos} />
          )}
        </group>
      ))}

      {flagPositions.map((flag, i) => (
        <group key={`flag-${i}`}>
          {flagModelAvailable ? (
            <ModelErrorBoundary fallback={<ProceduralFlagFallback position={flag.pos} color={flag.color} />}>
              <Suspense fallback={<ProceduralFlagFallback position={flag.pos} color={flag.color} />}>
                <GLBSceneModel
                  modelUrl={SCENE_MODELS.flag_pole}
                  scale={1.5}
                  position={flag.pos}
                />
              </Suspense>
            </ModelErrorBoundary>
          ) : (
            <ProceduralFlagFallback position={flag.pos} color={flag.color} />
          )}
        </group>
      ))}

      {barrierPositions.map((pos, i) => (
        <group key={`barrier-${i}`}>
          {barrierModelAvailable ? (
            <ModelErrorBoundary fallback={<ProceduralBarrierFallback position={pos} />}>
              <Suspense fallback={<ProceduralBarrierFallback position={pos} />}>
                <GLBSceneModel
                  modelUrl={SCENE_MODELS.barrier}
                  scale={1}
                  position={pos}
                />
              </Suspense>
            </ModelErrorBoundary>
          ) : (
            <ProceduralBarrierFallback position={pos} />
          )}
        </group>
      ))}
    </group>
  );
}

function DustParticles({ position, speed }: { position: [number, number, number]; speed: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 80;

  const [positionsArr, velocities, lifetimes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2.5;
      pos[i * 3 + 1] = Math.random() * 0.15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.0;
      vel[i * 3] = -(Math.random() * 0.08 + 0.03);
      vel[i * 3 + 1] = Math.random() * 0.025 + 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
      life[i] = Math.random();
    }
    return [pos, vel, life];
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current || speed < 0.05) return;
    const attr = particlesRef.current.geometry.getAttribute("position");
    if (!attr) return;
    const posArr = attr.array as Float32Array;
    const spd = Math.min(speed, 2.0);
    for (let i = 0; i < count; i++) {
      lifetimes[i] += delta * (0.8 + spd * 0.5);
      posArr[i * 3] += velocities[i * 3] * spd;
      posArr[i * 3 + 1] += velocities[i * 3 + 1] * spd;
      posArr[i * 3 + 2] += velocities[i * 3 + 2] * spd;
      if (lifetimes[i] > 1.0 || posArr[i * 3 + 1] > 2.0 || posArr[i * 3] < -5) {
        posArr[i * 3] = (Math.random() - 0.5) * 1.5;
        posArr[i * 3 + 1] = Math.random() * 0.1;
        posArr[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        lifetimes[i] = 0;
        velocities[i * 3] = -(Math.random() * 0.08 + 0.03);
        velocities[i * 3 + 1] = Math.random() * 0.025 + 0.005;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
      }
    }
    attr.needsUpdate = true;
    const mat = particlesRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.min(0.6, spd * 0.5);
  });

  const bufferGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positionsArr, 3));
    return geom;
  }, [positionsArr]);

  return (
    <points ref={particlesRef} position={position} geometry={bufferGeom}>
      <pointsMaterial size={0.12} color="#c4a265" transparent opacity={0.4} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function DistanceMarkers({ trackLength }: { trackLength: number }) {
  const markers = useMemo(() => {
    const furlongMeters = trackLength / 10;
    const items: { x: number; label: string }[] = [];
    for (let i = 1; i <= 9; i++) {
      items.push({ x: i * furlongMeters, label: `${i}F` });
    }
    return items;
  }, [trackLength]);

  return (
    <group>
      {markers.map((m, i) => (
        <group key={`dm-${i}`} position={[m.x, 0, -10]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 1.2, 6]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#cc0000" : "white"} roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[0.25, 0.25, 0.05]} />
            <meshStandardMaterial color={i % 2 === 0 ? "white" : "#cc0000"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function JudgesTowerr({ trackLength }: { trackLength: number }) {
  return (
    <group position={[trackLength + 8, 0, -28]}>
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[3, 12, 3]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 11, 0]}>
        <boxGeometry args={[3.5, 1.5, 3.5]} />
        <meshStandardMaterial color="#2E4A8B" roughness={0.4} metalness={0.3} />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`tw-${i}`} position={[0, 3 + i * 2.5, 1.51]}>
          <planeGeometry args={[1.8, 1.2]} />
          <meshStandardMaterial color="#6ec6f0" transparent opacity={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 12.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

function InfieldDecoration({ trackLength }: { trackLength: number }) {
  const flowers = useMemo(() => {
    const items: { x: number; z: number; color: string; s: number }[] = [];
    const colors = ["#ff6b8a", "#ffb347", "#87d68d", "#c490d1", "#ff4757"];
    for (let i = 0; i < 40; i++) {
      items.push({
        x: 10 + Math.random() * (trackLength * 0.8),
        z: 14 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        s: 0.15 + Math.random() * 0.2,
      });
    }
    return items;
  }, [trackLength]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[trackLength * 0.4, -0.05, 17]} receiveShadow>
        <planeGeometry args={[trackLength * 0.6, 8]} />
        <meshStandardMaterial color="#2d8c1e" roughness={0.95} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[trackLength * 0.3, -0.04, 17]}>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#3a9ecc" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[trackLength * 0.3, 0.3, 17]}>
        <torusGeometry args={[3, 0.08, 8, 32]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.6} />
      </mesh>

      {flowers.map((f, i) => (
        <mesh key={`fl-${i}`} position={[f.x, 0.05, f.z]}>
          <sphereGeometry args={[f.s, 6, 6]} />
          <meshStandardMaterial color={f.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function TrackHoofMarks({ trackLength }: { trackLength: number }) {
  const marks = useMemo(() => {
    const items: { x: number; z: number; r: number; s: number }[] = [];
    for (let i = 0; i < 60; i++) {
      items.push({
        x: Math.random() * trackLength,
        z: -7 + Math.random() * 14,
        r: Math.random() * Math.PI,
        s: 0.2 + Math.random() * 0.3,
      });
    }
    return items;
  }, [trackLength]);

  return (
    <group>
      {marks.map((m, i) => (
        <mesh key={`hm-${i}`} rotation={[-Math.PI / 2, m.r, 0]} position={[m.x, 0.005, m.z]}>
          <circleGeometry args={[m.s, 6]} />
          <meshStandardMaterial color="#9a8550" transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function DubaiSkyline({ trackLength }: { trackLength: number }) {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}images/dubai_skyline_panorama.jpg`);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const farX = trackLength + 120;
  const panelWidth = 250;
  const panelHeight = 55;

  return (
    <group>
      <mesh position={[farX, panelHeight / 2 + 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

function AnimatedFlags({ trackLength }: { trackLength: number }) {
  const flagsRef = useRef<THREE.Group>(null);
  const flagData = useMemo(() => {
    const items: { x: number; z: number; color: string }[] = [];
    const colors = ["#cc0000", "#006600", "#ffffff", "#2E4A8B", "#C4883A", "#8B3A2A"];
    for (let i = 0; i < Math.floor(trackLength / 12); i++) {
      items.push({ x: 5 + i * 12, z: -27, color: colors[i % colors.length] });
    }
    return items;
  }, [trackLength]);

  useFrame(({ clock }) => {
    if (!flagsRef.current) return;
    flagsRef.current.children.forEach((grp, i) => {
      const flagMesh = grp.children[1];
      if (flagMesh) {
        flagMesh.rotation.z = Math.sin(clock.elapsedTime * 2.5 + i * 0.7) * 0.15;
        flagMesh.rotation.y = Math.sin(clock.elapsedTime * 1.8 + i * 0.5) * 0.1;
      }
    });
  });

  return (
    <group ref={flagsRef}>
      {flagData.map((f, i) => (
        <group key={`af-${i}`} position={[f.x, 0, f.z]}>
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 10, 6]} />
            <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.6, 9.2, 0]}>
            <planeGeometry args={[1.2, 0.7]} />
            <meshStandardMaterial color={f.color} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function VIPMarquees({ trackLength }: { trackLength: number }) {
  const tents = useMemo(() => {
    const items: { x: number; z: number; w: number; color: string }[] = [];
    const colors = ["#e8ddd0", "#d4c4a8", "#f0e8d8"];
    for (let i = 0; i < 3; i++) {
      items.push({
        x: trackLength * 0.25 + i * 20,
        z: 28,
        w: 8 + Math.random() * 4,
        color: colors[i],
      });
    }
    return items;
  }, [trackLength]);

  return (
    <group>
      {tents.map((t, i) => (
        <group key={`vip-${i}`} position={[t.x, 0, t.z]}>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[t.w, 4, 5]} />
            <meshStandardMaterial color={t.color} roughness={0.8} />
          </mesh>
          <mesh position={[0, 4.3, 0]}>
            <boxGeometry args={[t.w + 1, 0.15, 5.5]} />
            <meshStandardMaterial color="#8B3A2A" roughness={0.6} />
          </mesh>
          <mesh position={[0, 4.5, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[t.w * 0.4, 1.5, 4]} />
            <meshStandardMaterial color={t.color} roughness={0.7} />
          </mesh>
          {Array.from({ length: Math.floor(t.w / 2) }).map((_, j) => (
            <mesh key={`td-${j}`} position={[-t.w / 2 + 1.5 + j * 2, 2.5, 2.51]}>
              <planeGeometry args={[1.2, 2]} />
              <meshStandardMaterial color="#5C3D2E" transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function PhotoFinishTower({ trackLength }: { trackLength: number }) {
  return (
    <group position={[trackLength + 8, 0, 28]}>
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[2, 8, 2]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 8.5, 0]}>
        <boxGeometry args={[2.5, 1, 2.5]} />
        <meshStandardMaterial color="#333" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 9.5, -0.8]}>
        <boxGeometry args={[0.8, 0.5, 0.3]} />
        <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 9.5, 0.8]}>
        <boxGeometry args={[0.8, 0.5, 0.3]} />
        <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function FinishAreaDecor({ trackLength }: { trackLength: number }) {
  const bx = trackLength + 15;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bx + 10, 0.02, 0]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#3a7d44" roughness={0.9} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bx + 5, 0.04, 0]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#c8b898" roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bx + 5, 0.05, 0]}>
        <ringGeometry args={[4.2, 4.5, 32]} />
        <meshStandardMaterial color="#C4883A" roughness={0.3} metalness={0.5} />
      </mesh>

      <group position={[bx + 5, 0, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[1.8, 2, 1.2, 8]} />
          <meshStandardMaterial color="#d4c4a8" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[1.2, 1.4, 0.4, 8]} />
          <meshStandardMaterial color="#C4883A" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.5, 6]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {[
        [bx + 2, 0, -6], [bx + 8, 0, -6],
        [bx + 2, 0, 6], [bx + 8, 0, 6],
        [bx + 14, 0, -4], [bx + 14, 0, 4],
        [bx + 18, 0, 0],
      ].map(([x, y, z], i) => (
        <PalmTreeInstance key={`ft-${i}`} position={[x as number, y as number, z as number]} scale={1.8 + (i % 3) * 0.3} rotY={i * 0.9} />
      ))}

      {[
        [bx, 0, -4], [bx, 0, 4],
        [bx + 10, 0, -6], [bx + 10, 0, 6],
      ].map(([x, y, z], i) => (
        <group key={`fb-${i}`} position={[x, y, z]}>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[1.2, 0.5, 1.2]} />
            <meshStandardMaterial color="#8B4513" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshStandardMaterial color="#d44" roughness={0.8} />
          </mesh>
        </group>
      ))}

      <group position={[bx + 20, 0, 0]}>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[4, 3, 6]} />
          <meshStandardMaterial color="#d8d0c0" roughness={0.7} />
        </mesh>
        <mesh position={[0, 3.2, 0]}>
          <boxGeometry args={[4.5, 0.3, 6.5]} />
          <meshStandardMaterial color="#5C3D2E" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 3.5, -2.8]}>
          <boxGeometry args={[3.5, 1.5, 0.1]} />
          <meshStandardMaterial color="#2E4A8B" roughness={0.5} />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bx + 5, 0.06, 0]}>
        <ringGeometry args={[3.5, 3.7, 32]} />
        <meshStandardMaterial color="white" roughness={0.3} metalness={0.4} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function TrackLightPoles({ trackLength }: { trackLength: number }) {
  const poles = useMemo(() => {
    const items: [number, number, number][] = [];
    for (let i = 0; i < Math.floor(trackLength / 25) + 1; i++) {
      items.push([i * 25, 0, -20]);
      items.push([i * 25, 0, 25]);
    }
    return items;
  }, [trackLength]);

  return (
    <group>
      {poles.map((pos, i) => (
        <group key={`lp-${i}`} position={pos}>
          <mesh position={[0, 8, 0]}>
            <cylinderGeometry args={[0.08, 0.15, 16, 6]} />
            <meshStandardMaterial color="#777" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 16, pos[2] > 0 ? -1 : 1]}>
            <boxGeometry args={[0.6, 0.3, 2]} />
            <meshStandardMaterial color="#666" metalness={0.7} roughness={0.3} />
          </mesh>
          <pointLight position={[0, 15.5, pos[2] > 0 ? -0.5 : 0.5]} intensity={0.3} color="#ffe8c0" distance={30} />
        </group>
      ))}
    </group>
  );
}

function DaylightSky() {
  const cloudData = useMemo(() => {
    const clouds: { x: number; y: number; z: number; s: number; o: number }[] = [];
    for (let i = 0; i < 35; i++) {
      clouds.push({
        x: (Math.random() - 0.5) * 400,
        y: 30 + Math.random() * 30,
        z: -20 - Math.random() * 80,
        s: 3 + Math.random() * 8,
        o: 0.5 + Math.random() * 0.35,
      });
    }
    return clouds;
  }, []);

  const horizonHazeColor = "#b8d4e8";

  return (
    <group>
      <mesh>
        <sphereGeometry args={[250, 32, 32]} />
        <meshBasicMaterial color="#4a9be0" side={THREE.BackSide} />
      </mesh>

      <mesh>
        <sphereGeometry args={[249, 32, 16]} />
        <meshBasicMaterial color="#7ec0ee" side={THREE.BackSide} transparent opacity={0.6} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
        <cylinderGeometry args={[248, 248, 30, 32, 1, true]} />
        <meshBasicMaterial color={horizonHazeColor} side={THREE.BackSide} transparent opacity={0.7} />
      </mesh>

      <mesh position={[80, 55, -90]}>
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial color="#FFF8E0" />
      </mesh>
      <mesh position={[80, 55, -90]}>
        <sphereGeometry args={[10, 16, 16]} />
        <meshBasicMaterial color="#FFE8A0" transparent opacity={0.2} />
      </mesh>
      <pointLight position={[80, 55, -90]} intensity={2.5} color="#FFE4B5" distance={400} />

      {cloudData.map((c, i) => (
        <group key={`cg-${i}`} position={[c.x, c.y, c.z]}>
          <mesh>
            <sphereGeometry args={[c.s, 8, 8]} />
            <meshBasicMaterial color="white" transparent opacity={c.o} />
          </mesh>
          <mesh position={[c.s * 0.7, -c.s * 0.1, 0]}>
            <sphereGeometry args={[c.s * 0.6, 8, 8]} />
            <meshBasicMaterial color="white" transparent opacity={c.o * 0.85} />
          </mesh>
          <mesh position={[-c.s * 0.5, -c.s * 0.15, c.s * 0.3]}>
            <sphereGeometry args={[c.s * 0.45, 8, 8]} />
            <meshBasicMaterial color="#f0f0f0" transparent opacity={c.o * 0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RaceLighting({ trackLength }: { trackLength: number }) {
  return (
    <group>
      <ambientLight intensity={1.0} color="#fffbe6" />
      <directionalLight
        position={[trackLength / 2, 35, -15]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        color="#fff8f0"
      />
      <directionalLight
        position={[trackLength / 2, 20, 25]}
        intensity={0.8}
        color="#e8f0ff"
      />
      <hemisphereLight args={["#87CEEB", "#4a8a3a", 0.6]} />
    </group>
  );
}

function SideViewCamera({ leadX, trackLength, raceStarted, raceFinished }: { leadX: number; trackLength: number; raceStarted: boolean; raceFinished: boolean }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 5, 18));
  const targetLook = useRef(new THREE.Vector3(0, 1.5, 0));
  const phaseRef = useRef<"intro" | "chase" | "finish">("intro");
  const finishTimeRef = useRef(0);

  useFrame((state) => {
    if (!raceStarted && phaseRef.current === "intro") {
      targetPos.current.lerp(new THREE.Vector3(leadX - 10, 5, 6), 0.03);
      camera.position.copy(targetPos.current);
      targetLook.current.lerp(new THREE.Vector3(leadX + 2, 2, 0), 0.03);
      camera.lookAt(targetLook.current);
      return;
    }

    if (raceStarted && phaseRef.current === "intro") {
      phaseRef.current = "chase";
    }

    if (raceFinished && phaseRef.current === "chase") {
      phaseRef.current = "finish";
      finishTimeRef.current = state.clock.elapsedTime;
    }

    if (phaseRef.current === "finish") {
      const elapsed = state.clock.elapsedTime - finishTimeRef.current;
      const zoomProgress = Math.min(elapsed / 2, 1);
      const eased = 1 - Math.pow(1 - zoomProgress, 3);

      const fx = THREE.MathUtils.lerp(leadX - 8, leadX - 5, eased);
      const fy = THREE.MathUtils.lerp(5, 4, eased);
      const fz = THREE.MathUtils.lerp(6, 5, eased);

      targetPos.current.lerp(new THREE.Vector3(fx, fy, fz), 0.06);
      camera.position.copy(targetPos.current);
      targetLook.current.lerp(new THREE.Vector3(leadX + 2, 2, 0), 0.06);
      camera.lookAt(targetLook.current);
      return;
    }

    const shake = Math.sin(state.clock.elapsedTime * 20) * 0.01;
    const idealX = leadX - 10;
    const idealY = 5 + shake;
    const idealZ = 6;

    targetPos.current.lerp(new THREE.Vector3(idealX, idealY, idealZ), 0.05);
    camera.position.copy(targetPos.current);
    targetLook.current.lerp(new THREE.Vector3(leadX + 2, 2, 0), 0.06);
    camera.lookAt(targetLook.current);
  });

  return null;
}

function RaceScene({
  selectedHorse,
  trackType,
  onRaceEnd,
  onTimeUpdate,
  onPositionUpdate,
  onProgressUpdate,
  onSpeedUpdate,
  onCountdownUpdate,
}: {
  selectedHorse: HorseConfig;
  trackType: "short" | "long";
  onRaceEnd: (result: RaceResult, horseName: string) => void;
  onTimeUpdate?: (time: number) => void;
  onPositionUpdate?: (pos: number) => void;
  onProgressUpdate?: (pct: number) => void;
  onSpeedUpdate?: (spd: number) => void;
  onCountdownUpdate?: (val: number) => void;
}) {
  const trackLength = trackType === "short" ? 60 : 100;
  const targetTime = trackType === "short" ? 10000 : 15000;

  const [raceStarted, setRaceStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [playerProgress, setPlayerProgress] = useState(0);
  const aiCount = HORSES.length - 1;
  const [aiProgress, setAiProgress] = useState(() => new Array(aiCount).fill(0));
  const [finished, setFinished] = useState(false);

  const raceStartTimeRef = useRef(0);
  const lastTapRef = useRef(0);
  const playerSpeedRef = useRef(0);
  const playerProgressRef = useRef(0);
  const aiProgressRef = useRef(new Array(aiCount).fill(0));
  const finishedRef = useRef(false);
  const aiSpeedsRef = useRef(
    Array.from({ length: aiCount }, (_, i) => 0.80 + Math.random() * 0.20)
  );

  const baseSpeed = trackLength / (targetTime / 1000);

  useEffect(() => {
    onCountdownUpdate?.(countdown);
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !raceStarted) {
      setRaceStarted(true);
      raceStartTimeRef.current = Date.now();
    }
  }, [countdown, raceStarted]);

  const handleTap = useCallback(() => {
    if (!raceStarted || finishedRef.current) return;
    lastTapRef.current = Date.now();
  }, [raceStarted]);

  useEffect(() => {
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleTap();
    };
    const onClick = () => handleTap();

    window.addEventListener("touchstart", onTouch, { passive: false });
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("click", onClick);
    };
  }, [handleTap]);

  useFrame((_, delta) => {
    if (!raceStarted || finishedRef.current) return;

    const now = Date.now();
    const elapsed = now - raceStartTimeRef.current;
    onTimeUpdate?.(elapsed);

    const timeSinceLastTap = now - lastTapRef.current;
    const tapBoost = timeSinceLastTap < 300 ? 1.4 : timeSinceLastTap < 600 ? 1.1 : 0.7;

    const targetSpeed = baseSpeed * tapBoost;
    playerSpeedRef.current += (targetSpeed - playerSpeedRef.current) * 0.1;

    playerProgressRef.current += playerSpeedRef.current * delta;
    setPlayerProgress(playerProgressRef.current);
    onProgressUpdate?.(Math.min(playerProgressRef.current / trackLength, 1));
    onSpeedUpdate?.(playerSpeedRef.current / baseSpeed);

    const newAiProgress = aiProgressRef.current.map((prog, i) => {
      const aiBaseSpeed = baseSpeed * aiSpeedsRef.current[i];
      const variation = Math.sin(elapsed / 1000 * (1 + i * 0.3)) * 0.15 * aiBaseSpeed;
      const sprintBoost = prog > trackLength * 0.8 ? 1.1 : 1;
      return prog + (aiBaseSpeed + variation) * sprintBoost * delta;
    });
    aiProgressRef.current = newAiProgress;
    setAiProgress([...newAiProgress]);

    const allProgress = [playerProgressRef.current, ...newAiProgress];
    const sorted = allProgress
      .map((p, i) => ({ index: i, progress: p }))
      .sort((a, b) => b.progress - a.progress);
    const playerRank = sorted.findIndex(s => s.index === 0) + 1;
    onPositionUpdate?.(playerRank);

    if (allProgress.some(p => p >= trackLength) && !finishedRef.current) {
      finishedRef.current = true;
      setFinished(true);

      const finalTime = Date.now() - raceStartTimeRef.current;
      onRaceEnd({
        finishTime: finalTime,
        rank: playerRank,
        horseName: selectedHorse.name,
        horseId: selectedHorse.id,
        trackType,
      }, selectedHorse.name);
    }
  });

  const laneWidth = 3;
  const totalLanes = HORSES.length;
  const trackDepth = totalLanes * laneWidth + 4;

  const centerLaneIndex = Math.floor(totalLanes / 2);
  const laneZForIndex = (idx: number) => -(trackDepth / 2) + 2 + idx * laneWidth + laneWidth / 2;

  const playerLaneZ = laneZForIndex(centerLaneIndex);
  const playerX = playerProgress;

  const aiHorses = HORSES.filter(h => h.id !== selectedHorse.id);
  const aiLaneIndices = Array.from({ length: totalLanes }, (_, i) => i).filter(i => i !== centerLaneIndex);

  const allPositions = [playerProgress, ...aiProgress];
  const leadX = Math.max(...allPositions);

  return (
    <>
      <RaceLighting trackLength={trackLength} />
      <fog attach="fog" args={["#b8d4e8", 40, 200]} />
      <DaylightSky />
      <DubaiSkyline trackLength={trackLength} />
      <SideViewTrack trackLength={trackLength} />
      <TrackHoofMarks trackLength={trackLength} />
      <SideViewGrandstand trackLength={trackLength} />
      <SponsorBillboards trackLength={trackLength} />
      <FinishPost trackLength={trackLength} />
      <StartGate laneCount={totalLanes} />
      <EnvironmentalProps trackLength={trackLength} />
      <DistanceMarkers trackLength={trackLength} />
      <JudgesTowerr trackLength={trackLength} />
      <InfieldDecoration trackLength={trackLength} />
      <AnimatedFlags trackLength={trackLength} />
      <VIPMarquees trackLength={trackLength} />
      <PhotoFinishTower trackLength={trackLength} />
      <FinishAreaDecor trackLength={trackLength} />
      <TrackLightPoles trackLength={trackLength} />
      <DistantScenery trackLength={trackLength} />
      <SideViewCamera leadX={leadX} trackLength={trackLength} raceStarted={raceStarted} raceFinished={finished} />

      <RaceHorse
        position={[playerX, 0, playerLaneZ]}
        horseConfig={selectedHorse}
        isPlayer={true}
        speed={playerSpeedRef.current / baseSpeed}
        raceStarted={raceStarted}
        raceFinished={finished}
      />
      <DustParticles position={[playerX - 1.5, 0.1, playerLaneZ]} speed={playerSpeedRef.current / baseSpeed} />

      {aiHorses.map((horse, i) => {
        const laneZ = laneZForIndex(aiLaneIndices[i] ?? i);
        const aiX = aiProgress[i];
        return (
          <group key={horse.id}>
            <RaceHorse
              position={[aiX, 0, laneZ]}
              horseConfig={horse}
              isPlayer={false}
              speed={aiSpeedsRef.current[i]}
              raceStarted={raceStarted}
              raceFinished={finished}
            />
            <DustParticles position={[aiX - 1.5, 0.1, laneZ]} speed={0.8} />
          </group>
        );
      })}

      <color attach="background" args={["#b8d4e8"]} />

    </>
  );
}

function IntroScreen({ onSkip }: { onSkip: () => void }) {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 1000);
    const autoSkip = setTimeout(() => onSkip(), 4000);
    return () => {
      clearTimeout(timer);
      clearTimeout(autoSkip);
    };
  }, [onSkip]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        src={`${import.meta.env.BASE_URL}videos/night_race.mp4`}
      />

      <div className="relative z-10 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="text-center"
        >
        </motion.div>
      </div>

      <AnimatePresence>
        {showSkip && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={onSkip}
            className="absolute bottom-12 right-6 z-10 px-6 py-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-semibold flex items-center gap-2"
            data-testid="button-skip-intro"
          >
            <SkipForward size={16} />
            Skip
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuScreen({ onBeginRace, onLeaderboard }: { onBeginRace: () => void; onLeaderboard: () => void }) {
  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        src={`${import.meta.env.BASE_URL}videos/night_race.mp4`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/40" />

      <div className="relative z-10 flex flex-col items-center justify-between h-full py-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center mt-2"
        >
          <img src={`${import.meta.env.BASE_URL}images/dwc-30th-logo.png`} alt="DWC 30th Anniversary" className="w-[260px] max-w-[80vw] object-contain" style={{ filter: 'brightness(0)' }} />
        </motion.div>

        <div className="flex flex-col items-center">

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <motion.button
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={onBeginRace}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#C4883A] to-[#B89B71] rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#C4883A]/30 active:scale-95 transition-transform"
              data-testid="button-begin-race"
            >
              <Play size={22} />
              Begin Race
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={onLeaderboard}
              className="w-full py-4 px-6 bg-white/60 border border-[#C4883A]/30 backdrop-blur-md rounded-xl text-[#5C3D2E] font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
              data-testid="button-leaderboard"
            >
              <Trophy size={22} className="text-[#C4883A]" />
              Leaderboard
            </motion.button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <img src={`${import.meta.env.BASE_URL}images/dubai-culture-logo.png`} alt="Dubai Culture" className="h-8 object-contain" style={{ filter: "invert(1)" }} />
          <div className="flex items-center gap-2 text-[#5C3D2E]/50 text-xs">
            <Crown size={12} />
            <span>30th Anniversary Edition</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function HorsePreview({ horse }: { horse: HorseConfig }) {
  const modelUrl = HORSE_MODELS[horse.id];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[4, 64]} />
        <meshStandardMaterial color="#c8b898" roughness={0.9} metalness={0.0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[3.2, 3.5, 64]} />
        <meshStandardMaterial color="#C4883A" roughness={0.4} metalness={0.3} transparent opacity={0.5} />
      </mesh>
      <group rotation={[0, -Math.PI / 6, 0]}>
        {modelUrl ? (
          <ModelErrorBoundary fallback={
            <ProceduralHorseFallback bodyColor={horse.bodyColor} scale={2.5} />
          }>
            <Suspense fallback={
              <ProceduralHorseFallback bodyColor={horse.bodyColor} scale={2.5} />
            }>
              <GLBHorse
                modelUrl={modelUrl}
                autoAnimate={true}
                autoSpeed={2}
                scale={3.2}
                yOffset={0.8}
              />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <ProceduralHorseFallback bodyColor={horse.bodyColor} scale={2.5} />
        )}
      </group>
    </group>
  );
}

function HorseInspectView({ horse }: { horse: HorseConfig }) {
  const modelUrl = HORSE_MODELS[horse.id];
  return (
    <>
      <ambientLight intensity={1.4} color="#fff5e6" />
      <directionalLight position={[8, 12, 6]} intensity={2.8} castShadow color="#fff8f0" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-5, 8, -3]} intensity={1.2} color="#e8d4b8" />
      <spotLight position={[0, 10, 0]} intensity={2} angle={0.5} color="#fff0d6" penumbra={0.5} />
      <pointLight position={[4, 2, 5]} intensity={1} color="#C4883A" distance={15} />
      <pointLight position={[-4, 3, -3]} intensity={0.6} color="#B89B71" distance={12} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[5, 64]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.9} metalness={0.0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[4, 4.2, 64]} />
        <meshStandardMaterial color="#C4883A" roughness={0.4} metalness={0.3} transparent opacity={0.4} />
      </mesh>

      {modelUrl ? (
        <ModelErrorBoundary fallback={<ProceduralHorseFallback bodyColor={horse.bodyColor} scale={3} />}>
          <Suspense fallback={<ProceduralHorseFallback bodyColor={horse.bodyColor} scale={3} />}>
            <GLBHorse modelUrl={modelUrl} autoAnimate={true} autoSpeed={1.5} scale={3.5} yOffset={0.8} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <ProceduralHorseFallback bodyColor={horse.bodyColor} scale={3} />
      )}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate
        autoRotateSpeed={1.5}
        target={[0, 1.5, 0]}
      />
      <color attach="background" args={["#e8dcc8"]} />
      <fog attach="fog" args={["#e8dcc8", 12, 25]} />
    </>
  );
}

function HorseSelectScreen({ onSelect, onBack }: { onSelect: (horse: HorseConfig) => void; onBack: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const horse = HORSES[selectedIndex];

  const goNext = () => setSelectedIndex((i) => (i + 1) % HORSES.length);
  const goPrev = () => setSelectedIndex((i) => (i - 1 + HORSES.length) % HORSES.length);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#f0e8d8] via-[#e8dcc8] to-[#d4c4a8] flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button onClick={onBack} className="p-2 text-[#5C3D2E]/70 hover:text-[#5C3D2E]" data-testid="button-back-select">
          <ArrowLeft size={24} />
        </button>
        <div className="text-[#5C3D2E] text-sm font-semibold tracking-wider uppercase">Choose Your Horse</div>
        <div className="w-10" />
      </div>

      <div className="flex-1 relative flex flex-col">
        <div className="h-[45vh] w-full relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.img
              key={horse.id}
              src={HORSE_IMAGES[horse.id]}
              alt={horse.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="h-[85%] max-h-[320px] object-contain drop-shadow-2xl"
              data-testid="img-horse-select"
            />
          </AnimatePresence>

          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/70 backdrop-blur-sm border border-[#C4883A]/30 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            data-testid="button-horse-prev"
          >
            <ChevronLeft size={22} className="text-[#5C3D2E]" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/70 backdrop-blur-sm border border-[#C4883A]/30 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            data-testid="button-horse-next"
          >
            <ChevronRight size={22} className="text-[#5C3D2E]" />
          </button>
        </div>

        <div className="flex-1 flex flex-col px-6 pb-6 -mt-2">
          <div className="flex justify-center gap-2.5 mb-4">
            {HORSES.map((h, i) => (
              <button
                key={h.id}
                onClick={() => setSelectedIndex(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === selectedIndex
                    ? "w-8 h-2.5 bg-[#C4883A]"
                    : "w-2.5 h-2.5 bg-[#5C3D2E]/20 hover:bg-[#5C3D2E]/40"
                }`}
                data-testid={`button-horse-dot-${i}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={horse.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-2xl font-bold text-[#5C3D2E] text-center mb-1" style={{ fontFamily: "'Georgia', serif" }} data-testid="text-horse-name">{horse.name}</h2>
              <p className="text-[#5C3D2E]/55 text-sm text-center mb-4 leading-relaxed max-w-[280px] mx-auto">{horse.description}</p>

              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/40">
                <div className="flex justify-between gap-6">
                  <div className="flex-1">
                    <div className="text-[10px] text-[#8B3A2A] mb-1.5 flex items-center gap-1 font-semibold uppercase tracking-wider">
                      <Zap size={11} /> Speed
                    </div>
                    <div className="w-full h-2 bg-[#5C3D2E]/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#8B3A2A] to-[#C4883A] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${horse.speed}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                    <div className="text-[#5C3D2E] text-sm mt-1 font-bold">{horse.speed}</div>
                  </div>
                  <div className="w-px bg-[#5C3D2E]/10" />
                  <div className="flex-1">
                    <div className="text-[10px] text-[#2E4A8B] mb-1.5 flex items-center gap-1 font-semibold uppercase tracking-wider">
                      <Clock size={11} /> Stamina
                    </div>
                    <div className="w-full h-2 bg-[#5C3D2E]/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#2E4A8B] to-[#5A7AB5] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${horse.stamina}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                    <div className="text-[#5C3D2E] text-sm mt-1 font-bold">{horse.stamina}</div>
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => onSelect(horse)}
                  className="w-full py-4 bg-gradient-to-r from-[#5C3D2E] to-[#8B3A2A] rounded-2xl text-[#D4C4A8] font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-[#5C3D2E]/30 active:scale-[0.97] transition-transform border border-[#C4883A]/30"
                  data-testid="button-select-horse"
                >
                  Select {horse.name}
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PreRaceScreen({
  horse,
  onStart,
  onBack,
}: {
  horse: HorseConfig;
  onStart: (horseName: string, trackType: "short" | "long") => void;
  onBack: () => void;
}) {
  const [horseName, setHorseName] = useState("");
  const [trackType, setTrackType] = useState<"short" | "long">("short");
  const [showNameError, setShowNameError] = useState(false);
  const nameValid = horseName.trim().length >= 2;

  const handleStart = () => {
    if (!nameValid) {
      setShowNameError(true);
      return;
    }
    onStart(horseName.trim(), trackType);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#f0e8d8] via-[#e8dcc8] to-[#d4c4a8] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <button onClick={onBack} className="p-2 text-[#5C3D2E]/70" data-testid="button-back-prerace">
          <ArrowLeft size={22} />
        </button>
        <div className="text-[#5C3D2E] text-xs font-semibold tracking-wider uppercase">Race Setup</div>
        <div className="w-9" />
      </div>

      <div className="h-[22vh] w-full flex-shrink-0 relative">
        <Canvas camera={{ position: [4, 2.5, 5], fov: 35 }} shadows>
          <ambientLight intensity={1.4} color="#fff5e6" />
          <directionalLight position={[6, 10, 5]} intensity={2.5} castShadow color="#fff8f0" />
          <directionalLight position={[-4, 6, -2]} intensity={1} color="#e8d4b8" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
            <circleGeometry args={[3, 64]} />
            <meshStandardMaterial color="#d4c4a8" roughness={0.9} />
          </mesh>
          {HORSE_MODELS[horse.id] ? (
            <ModelErrorBoundary fallback={<ProceduralHorseFallback bodyColor={horse.bodyColor} scale={2.2} />}>
              <Suspense fallback={<ProceduralHorseFallback bodyColor={horse.bodyColor} scale={2.2} />}>
                <GLBHorse modelUrl={HORSE_MODELS[horse.id]} autoAnimate={true} autoSpeed={1.5} scale={2.8} yOffset={0.8} />
              </Suspense>
            </ModelErrorBoundary>
          ) : (
            <ProceduralHorseFallback bodyColor={horse.bodyColor} scale={2.2} />
          )}
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={2} target={[0, 1.2, 0]} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2.2} />
          <color attach="background" args={["#e8dcc8"]} />
          <fog attach="fog" args={["#e8dcc8", 10, 20]} />
        </Canvas>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#e8dcc8] to-transparent pointer-events-none" />
      </div>

      <div className="flex-1 flex flex-col px-5 pb-5">
        <div className="text-center mb-3">
          <div className="text-[#8B3A2A] text-[9px] tracking-[0.4em] uppercase mb-0.5 font-semibold">Your Champion</div>
          <h2 className="text-xl font-bold text-[#5C3D2E]" style={{ fontFamily: "'Georgia', serif" }}>{horse.name}</h2>
        </div>

        <div className="mb-3">
          <label className="block text-[#5C3D2E]/70 text-[10px] mb-1.5 font-semibold uppercase tracking-wider">
            Name Your Horse <span className="text-[#8B3A2A]">*</span>
          </label>
          <input
            type="text"
            value={horseName}
            onChange={(e) => {
              setHorseName(e.target.value);
              if (e.target.value.trim().length >= 2) setShowNameError(false);
            }}
            placeholder="Give your champion a name..."
            maxLength={20}
            className={`w-full px-4 py-3 bg-white/60 backdrop-blur-sm border-2 rounded-xl text-[#5C3D2E] text-sm placeholder-[#5C3D2E]/30 focus:outline-none transition-colors ${
              showNameError ? "border-[#8B3A2A] bg-[#8B3A2A]/5" : "border-white/40 focus:border-[#C4883A]"
            }`}
            data-testid="input-horse-name"
          />
          {showNameError && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#8B3A2A] text-[10px] mt-1 font-medium"
            >
              Please name your horse (at least 2 characters)
            </motion.p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-[#5C3D2E]/70 text-[10px] mb-2 font-semibold uppercase tracking-wider">Race Distance</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setTrackType("short")}
              className={`px-3 py-3 rounded-xl border-2 transition-all flex items-center gap-2.5 ${
                trackType === "short"
                  ? "border-[#C4883A] bg-[#C4883A]/15"
                  : "border-[#5C3D2E]/10 bg-white/40"
              }`}
              data-testid="button-track-short"
            >
              <Zap size={16} className={trackType === "short" ? "text-[#C4883A]" : "text-[#5C3D2E]/30"} />
              <div>
                <div className={`text-xs font-bold ${trackType === "short" ? "text-[#5C3D2E]" : "text-[#5C3D2E]/50"}`}>Short Sprint</div>
                <div className="text-[9px] text-[#5C3D2E]/40">8-12 sec</div>
              </div>
            </button>
            <button
              onClick={() => setTrackType("long")}
              className={`px-3 py-3 rounded-xl border-2 transition-all flex items-center gap-2.5 ${
                trackType === "long"
                  ? "border-[#C4883A] bg-[#C4883A]/15"
                  : "border-[#5C3D2E]/10 bg-white/40"
              }`}
              data-testid="button-track-long"
            >
              <Timer size={16} className={trackType === "long" ? "text-[#C4883A]" : "text-[#5C3D2E]/30"} />
              <div>
                <div className={`text-xs font-bold ${trackType === "long" ? "text-[#5C3D2E]" : "text-[#5C3D2E]/50"}`}>Long Sprint</div>
                <div className="text-[9px] text-[#5C3D2E]/40">12-18 sec</div>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={handleStart}
            className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-all ${
              nameValid
                ? "bg-gradient-to-r from-[#5C3D2E] to-[#8B3A2A] text-[#D4C4A8] shadow-xl shadow-[#5C3D2E]/30 border border-[#C4883A]/30"
                : "bg-[#5C3D2E]/30 text-[#5C3D2E]/40"
            }`}
            data-testid="button-start-race"
          >
            <Play size={20} />
            Start Race
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfettiEffect() {
  const particles = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: ["#FFD700", "#C4883A", "#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6"][Math.floor(Math.random() * 7)],
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{
            y: "110vh",
            rotate: p.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "linear",
            repeat: Infinity,
          }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

function RaceScreen({
  selectedHorse,
  trackType,
  horseName,
  onRaceEnd,
}: {
  selectedHorse: HorseConfig;
  trackType: "short" | "long";
  horseName: string;
  onRaceEnd: (result: RaceResult) => void;
}) {
  const [raceTime, setRaceTime] = useState(0);
  const [position, setPosition] = useState(1);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [countdown, setCountdown] = useState(3);

  const positionLabels = ["1st", "2nd", "3rd", "4th"];
  const positionColors = ["#FFD700", "#C0C0C0", "#CD7F32", "#666666"];

  return (
    <div className="fixed inset-0 bg-black" data-testid="race-screen">
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <RaceScene
          selectedHorse={selectedHorse}
          trackType={trackType}
          onRaceEnd={(result) => {
            onRaceEnd({ ...result, horseName });
          }}
          onTimeUpdate={setRaceTime}
          onPositionUpdate={setPosition}
          onProgressUpdate={setProgress}
          onSpeedUpdate={setSpeed}
          onCountdownUpdate={setCountdown}
        />
      </Canvas>

      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            key={`countdown-${countdown}`}
            initial={{ scale: 2.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            data-testid="countdown-overlay"
          >
            <div
              className="text-[120px] font-bold text-white"
              style={{
                fontFamily: "monospace",
                textShadow: "0 0 60px rgba(196,136,58,0.9), 0 0 120px rgba(196,136,58,0.5), 0 4px 20px rgba(0,0,0,0.5)",
              }}
            >
              {countdown}
            </div>
          </motion.div>
        )}
        {countdown === 0 && progress < 0.05 && (
          <motion.div
            key="go"
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            data-testid="go-overlay"
          >
            <div
              className="text-[100px] font-bold text-[#C4883A]"
              style={{
                fontFamily: "monospace",
                textShadow: "0 0 60px rgba(196,136,58,0.9), 0 0 120px rgba(196,136,58,0.5), 0 4px 20px rgba(0,0,0,0.5)",
              }}
            >
              GO!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ paddingTop: "env(safe-area-inset-top, 8px)" }}>
        <div className="mx-3 mt-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 p-2.5">
          <div className="grid grid-cols-4 gap-2 items-center">
            <div className="flex flex-col items-center justify-center">
              <span className="text-white/40 text-[9px] uppercase tracking-wider mb-0.5">Pos</span>
              <div
                className="text-2xl font-black leading-none"
                style={{ color: positionColors[position - 1] }}
                data-testid="text-race-position"
              >
                {positionLabels[position - 1]}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="text-white/40 text-[9px] uppercase tracking-wider mb-0.5">Speed</span>
              <div className="flex items-center gap-1.5">
                <Zap size={14} className={speed > 1.2 ? "text-[#FFD700]" : speed > 0.9 ? "text-[#C4883A]" : "text-white/30"} />
                <div className="w-12 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${Math.min(speed * 70, 100)}%`,
                      background: speed > 1.2 ? "linear-gradient(90deg, #C4883A, #FFD700)" : speed > 0.9 ? "#C4883A" : "#555",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="text-white/40 text-[9px] uppercase tracking-wider mb-0.5">Progress</span>
              <span className="text-white font-mono text-lg font-bold leading-none">{Math.round(progress * 100)}%</span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="text-white/40 text-[9px] uppercase tracking-wider mb-0.5">Time</span>
              <div className="flex items-center gap-1">
                <Timer size={12} className="text-[#C4883A]" />
                <span className="text-white font-mono text-lg font-bold leading-none" data-testid="text-race-time">
                  {(raceTime / 1000).toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(progress * 100, 100)}%`,
                background: "linear-gradient(90deg, #C4883A, #FFD700)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 0.4 }}
          className="bg-[#C4883A]/30 backdrop-blur-md rounded-2xl px-10 py-4 border-2 border-[#C4883A]/50"
          data-testid="tap-zone"
        >
          <span className="text-white text-base font-bold tracking-wider">TAP TO GALLOP</span>
        </motion.div>
      </div>
    </div>
  );
}

function ResultsScreen({
  result,
  onTryAgain,
  onSubmitScore,
  onShare,
  onBack,
}: {
  result: RaceResult;
  onTryAgain: () => void;
  onSubmitScore: () => void;
  onShare: () => void;
  onBack: () => void;
}) {
  const rankLabels = ["1st", "2nd", "3rd", "4th"];
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32", "#666666"];

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#050810] via-[#0a1020] to-[#0d0a15] flex flex-col items-center justify-center p-6">
      {result.rank === 1 && <ConfettiEffect />}

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center mb-8"
      >
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="text-7xl mb-4"
        >
          {result.rank === 1 ? "🏆" : result.rank === 2 ? "🥈" : result.rank === 3 ? "🥉" : "🏁"}
        </motion.div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
        >
          <div
            className="text-6xl font-bold mb-2"
            style={{ color: rankColors[result.rank - 1] }}
            data-testid="text-result-rank"
          >
            {rankLabels[result.rank - 1]}
          </div>
          <div className="text-white/40 text-sm uppercase tracking-widest">Place</div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-sm mb-8"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-white/40 text-xs uppercase">Horse</div>
            <div className="text-white font-bold text-lg" data-testid="text-result-horse">{result.horseName}</div>
          </div>
          <div className="text-right">
            <div className="text-white/40 text-xs uppercase">Time</div>
            <div className="text-[#C4883A] font-bold font-mono text-2xl" data-testid="text-result-time">
              {(result.finishTime / 1000).toFixed(2)}s
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-white/40 text-xs uppercase">Track</div>
            <div className="text-white/70 text-sm capitalize">{result.trackType} Sprint</div>
          </div>
          <div className="text-right">
            <div className="text-white/40 text-xs uppercase">Horse Type</div>
            <div className="text-white/70 text-sm">{result.horseId.replace(/_/g, " ")}</div>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9 }}
          onClick={onSubmitScore}
          className="w-full py-3 px-6 bg-gradient-to-r from-[#C4883A] to-[#B89B71] rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#C4883A]/20 active:scale-95 transition-transform"
          data-testid="button-submit-score"
        >
          <Send size={18} />
          Submit Score
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.0 }}
          onClick={onTryAgain}
          className="w-full py-3 px-6 bg-white/5 border border-white/10 rounded-xl text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          data-testid="button-try-again"
        >
          <RotateCcw size={18} />
          Race Again
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1 }}
          onClick={onShare}
          className="w-full py-3 px-6 bg-white/5 border border-white/10 rounded-xl text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          data-testid="button-share-result"
        >
          <Share2 size={18} />
          Share Result
        </motion.button>
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        onClick={onBack}
        className="mt-6 text-white/30 text-sm"
        data-testid="button-back-menu"
      >
        Back to Menu
      </motion.button>
    </div>
  );
}

function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setScores(readLeaderboard());
    setLoading(false);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#050810] via-[#0a1020] to-[#0d0a15] flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button onClick={onBack} className="p-2 text-white/60" data-testid="button-back-leaderboard">
          <ArrowLeft size={24} />
        </button>
        <div className="text-white text-lg font-bold flex items-center gap-2">
          <Trophy size={18} className="text-[#C4883A]" />
          Leaderboard
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-[#C4883A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center text-white/40 mt-20">
            <Trophy size={48} className="mx-auto mb-4 opacity-30" />
            <p>No scores yet. Be the first to race!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scores.map((score, i) => (
              <motion.div
                key={score.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 rounded-xl p-3 ${
                  i < 3 ? "bg-white/8 border border-white/10" : "bg-white/5 border border-white/5"
                }`}
                data-testid={`leaderboard-entry-${i}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                    i === 1 ? "bg-gray-400/20 text-gray-400" :
                    i === 2 ? "bg-orange-600/20 text-orange-600" :
                    "bg-white/5 text-white/40"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">{score.horseName}</div>
                  <div className="text-white/30 text-xs capitalize">{score.trackType} sprint</div>
                </div>
                <div className="text-[#C4883A] font-mono font-bold">
                  {(score.finishTime / 1000).toFixed(2)}s
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HorseRace() {
  const [screen, setScreen] = useState<GameScreen>("intro");
  const [selectedHorse, setSelectedHorse] = useState<HorseConfig | null>(null);
  const [horseName, setHorseName] = useState("");
  const [trackType, setTrackType] = useState<"short" | "long">("short");
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [, navigate] = useLocation();

  const handleRaceEnd = useCallback((result: RaceResult) => {
    setRaceResult(result);
    setScreen("results");
  }, []);

  const handleSubmitScore = useCallback(async () => {
    if (!raceResult || scoreSubmitted) return;
    saveLeaderboardEntry({
      horseName: raceResult.horseName,
      finishTime: raceResult.finishTime,
      rank: raceResult.rank,
      trackType: raceResult.trackType,
    });
    setScoreSubmitted(true);
    setScreen("leaderboard");
  }, [raceResult, scoreSubmitted]);

  const handleShare = useCallback(async () => {
    if (!raceResult) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, "#050810");
    gradient.addColorStop(0.5, "#0a1020");
    gradient.addColorStop(1, "#0d0a15");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = "#C4883A";
    ctx.font = "bold 32px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("DUBAI RACING CARNIVAL", 540, 180);

    ctx.fillStyle = "#ffffff60";
    ctx.font = "18px Arial";
    ctx.fillText("Meydan Cup • 30th Anniversary", 540, 220);

    const rankLabels = ["1st Place", "2nd Place", "3rd Place", "4th Place"];
    const rankEmojis = ["🏆", "🥈", "🥉", "🏁"];
    ctx.font = "120px serif";
    ctx.fillText(rankEmojis[raceResult.rank - 1], 540, 480);

    ctx.fillStyle = raceResult.rank === 1 ? "#FFD700" : raceResult.rank === 2 ? "#C0C0C0" : raceResult.rank === 3 ? "#CD7F32" : "#666";
    ctx.font = "bold 72px Georgia";
    ctx.fillText(rankLabels[raceResult.rank - 1], 540, 600);

    ctx.strokeStyle = "#C4883A30";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(140, 680, 800, 380, 20);
    ctx.stroke();

    ctx.fillStyle = "#ffffff80";
    ctx.font = "22px Arial";
    ctx.fillText("HORSE", 540, 740);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px Georgia";
    ctx.fillText(raceResult.horseName, 540, 800);

    ctx.fillStyle = "#ffffff80";
    ctx.font = "22px Arial";
    ctx.fillText("FINISH TIME", 540, 880);
    ctx.fillStyle = "#C4883A";
    ctx.font = "bold 64px monospace";
    ctx.fillText(`${(raceResult.finishTime / 1000).toFixed(2)}s`, 540, 960);

    ctx.fillStyle = "#ffffff60";
    ctx.font = "20px Arial";
    ctx.fillText(`${raceResult.trackType.toUpperCase()} SPRINT`, 540, 1020);

    ctx.fillStyle = "#ffffff15";
    ctx.font = "14px Arial";
    ctx.fillText("dubaiworldcup.com", 540, 1800);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "race-result.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: "Dubai Racing Carnival - Race Result",
            text: `I finished ${rankLabels[raceResult.rank - 1]} with ${raceResult.horseName} in ${(raceResult.finishTime / 1000).toFixed(2)}s!`,
            files: [file],
          });
        } catch {}
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "race-result.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    }, "image/png");
  }, [raceResult]);

  return (
    <div className="fixed inset-0 overflow-hidden" data-testid="horse-race-page">
      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <motion.div key="intro" exit={{ opacity: 0 }}>
            <IntroScreen onSkip={() => setScreen("menu")} />
          </motion.div>
        )}

        {screen === "menu" && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <MenuScreen
              onBeginRace={() => setScreen("select")}
              onLeaderboard={() => setScreen("leaderboard")}
            />
          </motion.div>
        )}

        {screen === "select" && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <HorseSelectScreen
              onSelect={(horse) => {
                setSelectedHorse(horse);
                setScreen("prerace");
              }}
              onBack={() => setScreen("menu")}
            />
          </motion.div>
        )}

        {screen === "prerace" && selectedHorse && (
          <motion.div key="prerace" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <PreRaceScreen
              horse={selectedHorse}
              onStart={(name, type) => {
                setHorseName(name);
                setTrackType(type);
                setScoreSubmitted(false);
                setScreen("race");
              }}
              onBack={() => setScreen("select")}
            />
          </motion.div>
        )}

        {screen === "race" && selectedHorse && (
          <motion.div key="race" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <RaceScreen
              selectedHorse={selectedHorse}
              trackType={trackType}
              horseName={horseName}
              onRaceEnd={handleRaceEnd}
            />
          </motion.div>
        )}

        {screen === "results" && raceResult && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultsScreen
              result={raceResult}
              onTryAgain={() => {
                setRaceResult(null);
                setScoreSubmitted(false);
                setScreen("prerace");
              }}
              onSubmitScore={handleSubmitScore}
              onShare={handleShare}
              onBack={() => setScreen("menu")}
            />
          </motion.div>
        )}

        {screen === "leaderboard" && (
          <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <LeaderboardScreen onBack={() => setScreen("menu")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

Object.values(HORSE_MODELS).forEach((url) => {
  useGLTF.preload(url);
});
Object.values(SCENE_MODELS).forEach((url) => {
  useGLTF.preload(url);
});
