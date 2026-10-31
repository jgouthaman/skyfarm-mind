import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CadGroup, CadMesh, CheckSeverity } from "@/lib/the-hangar/cadViewerTypes";
import { GROUP_COLORS, SKIN_GROUP } from "@/lib/the-hangar/cadViewerData";

// Bay 04 STEP output viewer -- the three.js viewport. The only module that
// imports three; CadModelTab loads it with React.lazy so three.js stays out
// of the main bundle. Z is up and units are mm, straight from the mesh file.
// Colours come from the page's CSS tokens (--hgr-cv-*), re-read when the
// colour scheme changes.

export type CadView = "iso" | "top" | "side" | "front";
export type SkinMode = "solid" | "ghost" | "off";

export interface CadViewportHandle {
  setView(view: CadView): void;
  // Point the camera at the combined bounds of these parts.
  frameParts(names: string[]): void;
}

interface Props {
  mesh: CadMesh;
  skinMode: SkinMode;
  clash: boolean;
  flags: Map<string, CheckSeverity>;
  hiddenGroups: Set<CadGroup>;
  selected: string | null;
  onSelect(name: string | null): void;
  onReady(): void;
  ref?: Ref<CadViewportHandle>;
}

interface Scene3D {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  meshes: Map<string, THREE.Mesh>;
  edges: Map<string, THREE.LineSegments>;
  grid: THREE.GridHelper;
  center: THREE.Vector3;
  distance: number;
}

const GHOST_OPACITY = 0.16;
const DIMMED = "#8894a3";
// Camera directions, from the nose (-X), the left wing (-Y) and above.
const VIEW_DIRS: Record<CadView, [number, number, number]> = {
  iso: [-0.55, -0.75, 0.5],
  top: [0, -0.001, 1],
  side: [0, -1, 0],
  front: [-1, 0, 0.001],
};

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function CadViewport({
  mesh,
  skinMode,
  clash,
  flags,
  hiddenGroups,
  selected,
  onSelect,
  onReady,
  ref,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<Scene3D | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [failed, setFailed] = useState<string | null>(null);
  const [themeTick, setThemeTick] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      setView(view) {
        const s = sceneRef.current;
        if (!s) return;
        const dir = new THREE.Vector3(...VIEW_DIRS[view]).normalize();
        s.camera.position.copy(s.center).addScaledVector(dir, s.distance);
        s.controls.target.copy(s.center);
        s.controls.update();
      },
      frameParts(names) {
        const s = sceneRef.current;
        if (!s) return;
        const box = new THREE.Box3();
        for (const n of names) {
          const m = s.meshes.get(n);
          if (m?.geometry.boundingBox) box.union(m.geometry.boundingBox);
        }
        if (box.isEmpty()) return;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();
        const dir = new THREE.Vector3(...VIEW_DIRS.iso).normalize();
        s.camera.position.copy(center).addScaledVector(dir, Math.max(size * 1.6, 220));
        s.controls.target.copy(center);
        s.controls.update();
      },
    }),
    [],
  );

  // Build the scene once per mesh file.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (!hasWebGL()) {
      setFailed(
        "This browser or device can't start WebGL, so the 3D model can't be shown. The other tabs still work.",
      );
      return;
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(
        "WebGL failed to start, so the 3D model can't be shown. The other tabs still work.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 5, 20000);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-600, -900, 1400);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.9);
    fill.position.set(1200, 800, -300);
    scene.add(fill);

    const meshes = new Map<string, THREE.Mesh>();
    const edges = new Map<string, THREE.LineSegments>();
    const all = new THREE.Box3();
    for (const p of mesh.parts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p.positions, 3));
      g.setIndex(p.indices);
      g.computeVertexNormals();
      g.computeBoundingBox();
      all.union(g.boundingBox!);
      const mat = new THREE.MeshStandardMaterial({
        color: GROUP_COLORS[p.group],
        roughness: 0.55,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(g, mat);
      m.userData = { name: p.name, group: p.group };
      const e = new THREE.LineSegments(
        new THREE.EdgesGeometry(g, 30),
        new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 }),
      );
      m.add(e);
      scene.add(m);
      meshes.set(p.name, m);
      edges.set(p.name, e);
    }

    const center = all.getCenter(new THREE.Vector3());
    const span = all.getSize(new THREE.Vector3());
    const distance = all.getBoundingSphere(new THREE.Sphere()).radius * 2.2;
    const gridSize = Math.ceil((Math.max(span.x, span.y) * 1.35) / 50) * 50;
    const grid = new THREE.GridHelper(gridSize, Math.round(gridSize / 50));
    grid.rotation.x = Math.PI / 2;
    grid.position.set(center.x, center.y, all.min.z - 40);
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.45;
    scene.add(grid);

    sceneRef.current = { camera, controls, meshes, edges, grid, center, distance };
    const dir = new THREE.Vector3(...VIEW_DIRS.iso).normalize();
    camera.position.copy(center).addScaledVector(dir, distance);
    controls.target.copy(center);
    controls.update();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    // Click to pick; a drag (orbit) is not a click.
    let down: [number, number] = [0, 0];
    const onDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
      const r = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(
        [...meshes.values()].filter((m) => m.visible),
        false,
      );
      const isGhost = (o: THREE.Object3D) =>
        o.userData.group === SKIN_GROUP &&
        (o as THREE.Mesh<THREE.BufferGeometry, THREE.Material>).material.transparent;
      const hit = hits.find((h) => !isGhost(h.object)) ?? hits[0];
      onSelectRef.current(hit ? (hit.object.userData.name as string) : null);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => setThemeTick((t) => t + 1);
    scheme.addEventListener("change", onScheme);

    setThemeTick((t) => t + 1);
    onReadyRef.current();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scheme.removeEventListener("change", onScheme);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      for (const m of meshes.values()) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      for (const e of edges.values()) {
        e.geometry.dispose();
        (e.material as THREE.Material).dispose();
      }
      grid.geometry.dispose();
      gridMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, [mesh]);

  // Colours, opacity and visibility from the current toolbar/tree state.
  useEffect(() => {
    const s = sceneRef.current;
    const mount = mountRef.current;
    if (!s || !mount) return;
    const css = getComputedStyle(mount);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const selC = new THREE.Color(token("--hgr-cv-sel", "#0f9fa8"));
    const critC = new THREE.Color(token("--hgr-cv-crit", "#c0392b"));
    const warnC = new THREE.Color(token("--hgr-cv-warn", "#b4690e"));
    const edgeC = new THREE.Color(token("--hgr-cv-edge", "#223344"));
    const gridC = new THREE.Color(token("--hgr-cv-grid", "#aab6c4"));
    (s.grid.material as THREE.LineBasicMaterial).color.copy(gridC);

    for (const [name, m] of s.meshes) {
      const group = m.userData.group as CadGroup;
      const isSkin = group === SKIN_GROUP;
      const mat = m.material as THREE.MeshStandardMaterial;
      let color = new THREE.Color(GROUP_COLORS[group]);
      let opacity = isSkin && skinMode === "ghost" ? GHOST_OPACITY : 1;
      if (clash) {
        const f = flags.get(name);
        if (f === "critical") color = critC;
        else if (f === "warning") color = warnC;
        else if (!isSkin) {
          color = new THREE.Color(DIMMED);
          opacity = 0.35;
        }
        if (f === "critical" || f === "warning") opacity = Math.max(opacity, isSkin ? 0.45 : 1);
      }
      if (selected === name) {
        color = selC;
        opacity = Math.max(opacity, isSkin ? 0.55 : 1);
      }
      mat.color.copy(color);
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
      mat.depthWrite = opacity >= 1;
      mat.needsUpdate = true;
      const edgeMat = s.edges.get(name)!.material as THREE.LineBasicMaterial;
      edgeMat.color.copy(edgeC);
      edgeMat.opacity = opacity < 1 ? opacity * 0.8 : 0.35;
      m.visible = !hiddenGroups.has(group) && !(isSkin && skinMode === "off");
      m.renderOrder = opacity < 1 ? 2 : 1;
    }
  }, [skinMode, clash, flags, hiddenGroups, selected, themeTick]);

  return (
    <div ref={mountRef} className="hgr-cv-canvas" aria-label="3D view of the CAD assembly">
      {failed && (
        <div className="hgr-cv-vp-msg" role="alert">
          {failed}
        </div>
      )}
    </div>
  );
}

export default CadViewport;
