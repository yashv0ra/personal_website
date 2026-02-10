"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type GameMode = "start" | "playing" | "won" | "lost";
type Axis = "x" | "y" | "z";

type Obstacle = {
  label: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
};

type Enemy = {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  half: THREE.Vector3;
  minX: number;
  maxX: number;
  speed: number;
  direction: 1 | -1;
};

type HudState = {
  mode: GameMode;
  paused: boolean;
  score: number;
  elapsedSec: number;
  fullscreen: boolean;
};

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const playerHalf = new THREE.Vector3(0.5, 0.5, 0.5);
const goalHalf = new THREE.Vector3(0.35, 0.35, 0.35);
const fixedDelta = 1 / 60;
const gravity = 18;
const moveSpeed = 4.8;
const jumpVelocity = 7.2;
const reverseSpeedScale = 0.72;
const turnSpeed = 1.65;
const initialFacing = new THREE.Vector3(0.72, 0, 0.69).normalize();
const cameraFollowDistance = 4.1;
const cameraFollowHeight = 2.2;
const cameraShoulderOffset = 0.85;
const cameraLookHeight = 1.2;
const cameraLookAhead = 2.5;
const cameraFollowLerp = 0.14;
const cameraLookLerp = 0.2;

const handledKeys = new Set([
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "w",
  "a",
  "s",
  "d",
  "f",
  "p",
  "r",
  "enter",
  " ",
]);

function makeObstacle(label: string, center: THREE.Vector3, size: THREE.Vector3): Obstacle {
  const half = size.clone().multiplyScalar(0.5);
  return {
    label,
    min: center.clone().sub(half),
    max: center.clone().add(half),
  };
}

function intersects(position: THREE.Vector3, half: THREE.Vector3, obstacle: Obstacle): boolean {
  return (
    position.x + half.x > obstacle.min.x &&
    position.x - half.x < obstacle.max.x &&
    position.y + half.y > obstacle.min.y &&
    position.y - half.y < obstacle.max.y &&
    position.z + half.z > obstacle.min.z &&
    position.z - half.z < obstacle.max.z
  );
}

export default function BlockGame3D() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const playerMeshRef = useRef<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null>(null);
  const goalMeshRef = useRef<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null>(null);
  const enemyRef = useRef<Enemy | null>(null);
  const obstaclesRef = useRef<Obstacle[]>([]);

  const playerPositionRef = useRef(new THREE.Vector3(-7, 0.5, -7));
  const playerVelocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const onGroundRef = useRef(true);
  const jumpQueuedRef = useRef(false);
  const elapsedRef = useRef(0);
  const scoreRef = useRef(0);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const playerFacingRef = useRef(initialFacing.clone());
  const facingTargetRef = useRef(new THREE.Vector3());
  const cameraLookTargetRef = useRef(new THREE.Vector3(-7, cameraLookHeight, -7));
  const cameraDesiredPositionRef = useRef(new THREE.Vector3());
  const cameraDesiredLookRef = useRef(new THREE.Vector3());

  const startRunRef = useRef<() => void>(() => {});

  const [hud, setHud] = useState<HudState>({
    mode: "start",
    paused: false,
    score: 0,
    elapsedSec: 0,
    fullscreen: false,
  });
  const hudRef = useRef(hud);

  useEffect(() => {
    hudRef.current = hud;
  }, [hud]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#9fd4ff");
    scene.fog = new THREE.Fog("#9fd4ff", 18, 42);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 120);
    camera.position.set(-11, 3, -11);
    camera.lookAt(-7, cameraLookHeight, -7);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x8db6a0, 0.9);
    scene.add(ambient);

    const sunlight = new THREE.DirectionalLight(0xffffff, 0.95);
    sunlight.position.set(8, 18, 12);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 60;
    sunlight.shadow.camera.left = -18;
    sunlight.shadow.camera.right = 18;
    sunlight.shadow.camera.top = 18;
    sunlight.shadow.camera.bottom = -18;
    scene.add(sunlight);

    const grid = new THREE.GridHelper(20, 20, "#3f6c95", "#5d8ab3");
    grid.position.y = 0.01;
    scene.add(grid);

    const obstacleList: Obstacle[] = [];
    const addBlock = (
      label: string,
      center: THREE.Vector3,
      size: THREE.Vector3,
      color: string,
      roughness = 0.72
    ) => {
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.08 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(center);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      obstacleList.push(makeObstacle(label, center, size));
      return mesh;
    };

    addBlock("ground", new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(20, 1, 20), "#84c08b", 0.9);
    addBlock("stepA", new THREE.Vector3(-2.8, 0.45, -2.0), new THREE.Vector3(3.2, 0.9, 3.2), "#f3b37d");
    addBlock("stepB", new THREE.Vector3(1.2, 0.9, 1.0), new THREE.Vector3(3.0, 1.8, 3.0), "#ee9360");
    addBlock("stepC", new THREE.Vector3(4.8, 1.3, 3.6), new THREE.Vector3(2.4, 2.6, 2.4), "#d77447");
    obstaclesRef.current = obstacleList;

    const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const playerMaterial = new THREE.MeshStandardMaterial({
      color: "#3b67d8",
      emissive: "#1a2c5f",
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.24,
    });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
    scene.add(playerMesh);
    playerMeshRef.current = playerMesh;

    const goalGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const goalMaterial = new THREE.MeshStandardMaterial({
      color: "#f5d45f",
      emissive: "#7f6500",
      roughness: 0.3,
      metalness: 0.25,
    });
    const goalMesh = new THREE.Mesh(goalGeometry, goalMaterial);
    goalMesh.castShadow = true;
    goalMesh.position.set(4.8, 3.15, 3.6);
    scene.add(goalMesh);
    goalMeshRef.current = goalMesh;

    const enemyGeometry = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const enemyMaterial = new THREE.MeshStandardMaterial({
      color: "#c93e3e",
      roughness: 0.4,
      metalness: 0.15,
    });
    const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    enemyMesh.castShadow = true;
    enemyMesh.position.set(-4.2, 1.45, -2.0);
    scene.add(enemyMesh);
    enemyRef.current = {
      mesh: enemyMesh,
      half: new THREE.Vector3(0.55, 0.55, 0.55),
      minX: -4.6,
      maxX: -1.0,
      speed: 1.8,
      direction: 1,
    };

    const updateHud = (patch: Partial<HudState>) => {
      const next = { ...hudRef.current, ...patch };
      hudRef.current = next;
      setHud(next);
    };

    const resetWorld = () => {
      playerPositionRef.current.set(-7, 0.5, -7);
      playerVelocityRef.current.set(0, 0, 0);
      onGroundRef.current = true;
      jumpQueuedRef.current = false;
      elapsedRef.current = 0;
      scoreRef.current = 0;
      activeKeysRef.current.clear();
      playerFacingRef.current.copy(initialFacing);
      cameraLookTargetRef.current.set(-7, cameraLookHeight, -7);

      if (playerMeshRef.current) {
        playerMeshRef.current.position.copy(playerPositionRef.current);
        playerMeshRef.current.rotation.y = Math.atan2(playerFacingRef.current.x, playerFacingRef.current.z);
      }
      if (goalMeshRef.current) {
        goalMeshRef.current.position.set(4.8, 3.15, 3.6);
      }
      if (enemyRef.current) {
        enemyRef.current.mesh.position.set(-4.2, 1.45, -2.0);
        enemyRef.current.direction = 1;
      }

      updateHud({ paused: false, score: 0, elapsedSec: 0 });
    };

    const updateCamera = (snap = false) => {
      if (!cameraRef.current) return;
      const player = playerPositionRef.current;
      const facing = playerFacingRef.current;
      if (facing.lengthSq() < 0.0001) {
        facing.copy(initialFacing);
      }
      facing.y = 0;
      facing.normalize();
      const shoulder = facingTargetRef.current.set(facing.z, 0, -facing.x).normalize();

      const desiredPosition = cameraDesiredPositionRef.current;
      desiredPosition.copy(player).addScaledVector(facing, -cameraFollowDistance);
      desiredPosition.addScaledVector(shoulder, cameraShoulderOffset);
      desiredPosition.y += cameraFollowHeight;

      const desiredLook = cameraDesiredLookRef.current;
      desiredLook.copy(player).addScaledVector(facing, cameraLookAhead);
      desiredLook.y += cameraLookHeight;

      if (snap) {
        cameraRef.current.position.copy(desiredPosition);
        cameraLookTargetRef.current.copy(desiredLook);
      } else {
        cameraRef.current.position.lerp(desiredPosition, cameraFollowLerp);
        cameraLookTargetRef.current.lerp(desiredLook, cameraLookLerp);
      }

      cameraRef.current.lookAt(cameraLookTargetRef.current);
    };

    const renderScene = (snapCamera = false) => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      updateCamera(snapCamera);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    const moveAlongAxis = (axis: Axis, delta: number): boolean => {
      if (delta === 0) return false;
      const playerPosition = playerPositionRef.current;
      playerPosition[axis] += delta;
      let collided = false;

      for (const obstacle of obstaclesRef.current) {
        if (!intersects(playerPosition, playerHalf, obstacle)) continue;
        collided = true;
        const offset = playerHalf[axis];
        if (delta > 0) {
          playerPosition[axis] = obstacle.min[axis] - offset;
        } else {
          playerPosition[axis] = obstacle.max[axis] + offset;
        }
      }

      return collided;
    };

    const loseRun = () => {
      playerVelocityRef.current.set(0, 0, 0);
      updateHud({ mode: "lost", paused: false });
    };

    const winRun = () => {
      playerVelocityRef.current.set(0, 0, 0);
      const score = Math.max(20, Math.round(300 - elapsedRef.current * 40));
      scoreRef.current = score;
      updateHud({ mode: "won", paused: false, score });
    };

    const stepSimulation = (dt: number) => {
      if (hudRef.current.mode !== "playing" || hudRef.current.paused) return;

      elapsedRef.current += dt;
      const elapsedRounded = Number(elapsedRef.current.toFixed(1));
      if (elapsedRounded !== hudRef.current.elapsedSec) {
        updateHud({ elapsedSec: elapsedRounded });
      }

      const keys = activeKeysRef.current;
      const turnDirection = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      const forwardDirection = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);

      if (turnDirection !== 0) {
        const turnAngle = turnDirection * turnSpeed * dt;
        const facing = playerFacingRef.current;
        const cos = Math.cos(turnAngle);
        const sin = Math.sin(turnAngle);
        const nextX = facing.x * cos - facing.z * sin;
        const nextZ = facing.x * sin + facing.z * cos;
        facingTargetRef.current.set(nextX, 0, nextZ).normalize();
        facing.copy(facingTargetRef.current);
      }

      if (forwardDirection !== 0) {
        const forwardSpeed = forwardDirection > 0 ? moveSpeed : moveSpeed * reverseSpeedScale;
        playerVelocityRef.current.x = playerFacingRef.current.x * forwardSpeed * forwardDirection;
        playerVelocityRef.current.z = playerFacingRef.current.z * forwardSpeed * forwardDirection;
      } else {
        playerVelocityRef.current.x = 0;
        playerVelocityRef.current.z = 0;
      }

      if (jumpQueuedRef.current && onGroundRef.current) {
        playerVelocityRef.current.y = jumpVelocity;
        onGroundRef.current = false;
      }
      jumpQueuedRef.current = false;

      playerVelocityRef.current.y -= gravity * dt;
      moveAlongAxis("x", playerVelocityRef.current.x * dt);
      moveAlongAxis("z", playerVelocityRef.current.z * dt);

      const hitY = moveAlongAxis("y", playerVelocityRef.current.y * dt);
      if (hitY) {
        if (playerVelocityRef.current.y < 0) {
          onGroundRef.current = true;
        }
        playerVelocityRef.current.y = 0;
      } else {
        onGroundRef.current = false;
      }

      if (playerPositionRef.current.y < -6) {
        loseRun();
      }

      const enemy = enemyRef.current;
      if (enemy && hudRef.current.mode === "playing") {
        enemy.mesh.position.x += enemy.speed * enemy.direction * dt;
        if (enemy.mesh.position.x > enemy.maxX) {
          enemy.mesh.position.x = enemy.maxX;
          enemy.direction = -1;
        }
        if (enemy.mesh.position.x < enemy.minX) {
          enemy.mesh.position.x = enemy.minX;
          enemy.direction = 1;
        }

        const enemyObstacle = {
          label: "enemy",
          min: enemy.mesh.position.clone().sub(enemy.half),
          max: enemy.mesh.position.clone().add(enemy.half),
        };
        if (intersects(playerPositionRef.current, playerHalf, enemyObstacle)) {
          loseRun();
        }
      }

      const goalMesh = goalMeshRef.current;
      if (goalMesh && hudRef.current.mode === "playing") {
        const goalObstacle = {
          label: "goal",
          min: goalMesh.position.clone().sub(goalHalf),
          max: goalMesh.position.clone().add(goalHalf),
        };
        if (intersects(playerPositionRef.current, playerHalf, goalObstacle)) {
          winRun();
        }
      }

      if (playerMeshRef.current) {
        playerMeshRef.current.position.copy(playerPositionRef.current);
        playerMeshRef.current.rotation.y = Math.atan2(playerFacingRef.current.x, playerFacingRef.current.z);
      }
    };

    const resetToStart = () => {
      resetWorld();
      updateHud({ mode: "start" });
      renderScene(true);
    };

    const startRun = () => {
      resetWorld();
      updateHud({ mode: "playing", paused: false });
      renderScene(true);
    };
    startRunRef.current = startRun;

    const toggleFullscreen = async () => {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    };

    const renderTextState = () =>
      JSON.stringify({
        coordinateSystem:
          "Origin at arena center, +x right, +y up, +z toward the far-right platform from spawn.",
        mode: hudRef.current.mode,
        paused: hudRef.current.paused,
        score: scoreRef.current,
        elapsedSec: Number(elapsedRef.current.toFixed(2)),
        player: {
          x: Number(playerPositionRef.current.x.toFixed(2)),
          y: Number(playerPositionRef.current.y.toFixed(2)),
          z: Number(playerPositionRef.current.z.toFixed(2)),
          vx: Number(playerVelocityRef.current.x.toFixed(2)),
          vy: Number(playerVelocityRef.current.y.toFixed(2)),
          vz: Number(playerVelocityRef.current.z.toFixed(2)),
          facing: {
            x: Number(playerFacingRef.current.x.toFixed(2)),
            z: Number(playerFacingRef.current.z.toFixed(2)),
          },
          onGround: onGroundRef.current,
          size: { x: 1, y: 1, z: 1 },
        },
        enemy: enemyRef.current
          ? {
              x: Number(enemyRef.current.mesh.position.x.toFixed(2)),
              y: Number(enemyRef.current.mesh.position.y.toFixed(2)),
              z: Number(enemyRef.current.mesh.position.z.toFixed(2)),
              patrolRange: [enemyRef.current.minX, enemyRef.current.maxX],
            }
          : null,
        goal: goalMeshRef.current
          ? {
              x: Number(goalMeshRef.current.position.x.toFixed(2)),
              y: Number(goalMeshRef.current.position.y.toFixed(2)),
              z: Number(goalMeshRef.current.position.z.toFixed(2)),
            }
          : null,
        obstacles: obstaclesRef.current.map((obstacle) => ({
          label: obstacle.label,
          min: {
            x: Number(obstacle.min.x.toFixed(2)),
            y: Number(obstacle.min.y.toFixed(2)),
            z: Number(obstacle.min.z.toFixed(2)),
          },
          max: {
            x: Number(obstacle.max.x.toFixed(2)),
            y: Number(obstacle.max.y.toFixed(2)),
            z: Number(obstacle.max.z.toFixed(2)),
          },
        })),
        camera: cameraRef.current
          ? {
              x: Number(cameraRef.current.position.x.toFixed(2)),
              y: Number(cameraRef.current.position.y.toFixed(2)),
              z: Number(cameraRef.current.position.z.toFixed(2)),
              lookX: Number(cameraLookTargetRef.current.x.toFixed(2)),
              lookY: Number(cameraLookTargetRef.current.y.toFixed(2)),
              lookZ: Number(cameraLookTargetRef.current.z.toFixed(2)),
            }
          : null,
      });

    window.render_game_to_text = renderTextState;
    const advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps; i++) {
        stepSimulation(fixedDelta);
      }
      renderScene();
    };
    window.advanceTime = advanceTime;

    const resize = () => {
      if (!rendererRef.current || !cameraRef.current || !containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      rendererRef.current.setSize(width, height, false);
      cameraRef.current.aspect = width / Math.max(height, 1);
      cameraRef.current.updateProjectionMatrix();
      renderScene(true);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (handledKeys.has(key)) {
        event.preventDefault();
      }

      if (key === " ") {
        jumpQueuedRef.current = true;
      }
      if (key === "enter" && hudRef.current.mode === "start") {
        startRun();
      }
      if (key === "p" && hudRef.current.mode === "playing") {
        updateHud({ paused: !hudRef.current.paused });
      }
      if (key === "r" && (hudRef.current.mode === "won" || hudRef.current.mode === "lost")) {
        startRun();
      }
      if (key === "f") {
        void toggleFullscreen();
      }

      if (key === "w" || key === "arrowup") activeKeysRef.current.add("w");
      if (key === "a" || key === "arrowleft") activeKeysRef.current.add("a");
      if (key === "s" || key === "arrowdown") activeKeysRef.current.add("s");
      if (key === "d" || key === "arrowright") activeKeysRef.current.add("d");
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") activeKeysRef.current.delete("w");
      if (key === "a" || key === "arrowleft") activeKeysRef.current.delete("a");
      if (key === "s" || key === "arrowdown") activeKeysRef.current.delete("s");
      if (key === "d" || key === "arrowright") activeKeysRef.current.delete("d");
    };

    const onFullscreenChange = () => {
      updateHud({ fullscreen: Boolean(document.fullscreenElement) });
      resize();
    };

    const animate = (time: number) => {
      const last = lastFrameTimeRef.current ?? time;
      let delta = (time - last) / 1000;
      lastFrameTimeRef.current = time;
      delta = Math.min(delta, 0.05);

      while (delta > 0) {
        const step = Math.min(delta, fixedDelta);
        stepSimulation(step);
        delta -= step;
      }
      renderScene();

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    resize();
    resetToStart();
    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("fullscreenchange", onFullscreenChange);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (window.render_game_to_text === renderTextState) {
        delete window.render_game_to_text;
      }
      if (window.advanceTime === advanceTime) {
        delete window.advanceTime;
      }
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }

      startRunRef.current = () => {};
      rendererRef.current?.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            for (const material of object.material) material.dispose();
          } else {
            object.material.dispose();
          }
        }
      });
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  return (
    <div className="dot-grid min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Block Summit 3D</h1>
        <p className="max-w-3xl text-sm text-[var(--muted)] sm:text-base">
          Reach the glowing summit block. Avoid the patrol cube, jump across steps, and press <span className="font-semibold text-[var(--foreground)]">R</span> after a win or loss to retry.
        </p>
        <div
          ref={containerRef}
          className="relative mx-auto aspect-video w-full overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[#95cef8] shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
        >
          {hud.mode === "playing" && (
            <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-black/30 px-3 py-1.5 text-xs font-medium text-white sm:text-sm">
              <span>Score {hud.score}</span>
              <span className="ml-4">Time {hud.elapsedSec.toFixed(1)}s</span>
              <span className="ml-4">{hud.paused ? "Paused" : "Live"}</span>
              <span className="ml-4">{hud.fullscreen ? "Fullscreen" : "Windowed"}</span>
            </div>
          )}

          {hud.mode === "start" && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1f2c3bcc]/90 backdrop-blur-[2px]">
              <div className="w-[92%] max-w-lg rounded-xl border border-white/20 bg-[#162234e6] p-6 text-center text-white shadow-xl">
                <h2 className="text-2xl font-semibold">Block Summit 3D</h2>
                <p className="mt-3 text-sm text-white/80 sm:text-base">
                  Controls: W/S move forward/back, A/D turn, arrows mirror WASD, Space jumps, P pauses, F toggles fullscreen.
                </p>
                <p className="mt-2 text-sm text-white/80">
                  Goal: climb the blocks and touch the glowing cube before the red patrol catches you.
                </p>
                <button
                  id="start-btn"
                  type="button"
                  onClick={() => startRunRef.current()}
                  className="mt-5 rounded-full border border-white/30 bg-white px-6 py-2 text-sm font-semibold text-[#1f2c3b] transition-colors hover:bg-[#f7e7b8]"
                >
                  Play
                </button>
              </div>
            </div>
          )}

          {(hud.mode === "won" || hud.mode === "lost") && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1f2c3bcc]/90 backdrop-blur-[2px]">
              <div className="w-[90%] max-w-md rounded-xl border border-white/20 bg-[#162234e6] p-6 text-center text-white shadow-xl">
                <h2 className="text-2xl font-semibold">{hud.mode === "won" ? "You reached the summit" : "You got tagged"}</h2>
                <p className="mt-3 text-sm text-white/80">Score: {hud.score}</p>
                <p className="text-sm text-white/80">Time: {hud.elapsedSec.toFixed(1)}s</p>
                <p className="mt-2 text-sm text-white/80">Press R or tap Restart to run again.</p>
                <button
                  type="button"
                  onClick={() => startRunRef.current()}
                  className="mt-5 rounded-full border border-white/30 bg-white px-6 py-2 text-sm font-semibold text-[#1f2c3b] transition-colors hover:bg-[#f7e7b8]"
                >
                  Restart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
