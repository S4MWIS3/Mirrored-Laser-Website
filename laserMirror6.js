// ============================================
// LASER MIRROR 6 - 3D Grid Reflections (Three.js)
// Self-contained Three.js toy that mounts/unmounts
// into #canvas-container alongside the p5 toys.
// ============================================

const LaserMirror6 = (() => {

  // ── Internal state ────────────────────────────────────────────────────────
  let renderer, scene, camera, animFrameId;
  let mirrorGroup, laserGroup, groundGroup, skeletonGroup;
  let mounted = false;

  let lm6_mirrorSize = 0.7;
  let lm6_gridSpacing = 2.5;
  let lm6_gridN = 3;

  // ── Orbit ────────────────────────────────────────────────────────────────
  const orb = {
    theta: 0.6, phi: 1.05, radius: 22,
    target: { x: 0, y: 0, z: 0 },
    dragging: false, rightDrag: false, lastX: 0, lastY: 0,
  };

  function applyOrbit() {
    const { theta, phi, radius, target } = orb;
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(new THREE.Vector3(target.x, target.y, target.z));
  }

  function onMouseDown(e) {
    orb.dragging = true; orb.rightDrag = e.button === 2;
    orb.lastX = e.clientX; orb.lastY = e.clientY;
  }
  function onMouseMove(e) {
    if (!orb.dragging) return;
    const dx = e.clientX - orb.lastX, dy = e.clientY - orb.lastY;
    orb.lastX = e.clientX; orb.lastY = e.clientY;
    if (orb.rightDrag) {
      const right = new THREE.Vector3();
      camera.getWorldDirection(right);
      right.cross(camera.up).normalize();
      orb.target.x -= right.x * dx * 0.008; orb.target.y += dy * 0.008; orb.target.z -= right.z * dx * 0.008;
    } else {
      orb.theta -= dx * 0.007;
      orb.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orb.phi + dy * 0.007));
    }
    applyOrbit();
  }
  function onMouseUp() { orb.dragging = false; }
  function onWheel(e) {
    orb.radius = Math.max(3, Math.min(120, orb.radius + e.deltaY * 0.02));
    applyOrbit(); e.preventDefault();
  }
  function onContextMenu(e) { e.preventDefault(); }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function gridPositions(spacing) {
    const pts = [], offset = (lm6_gridN - 1) / 2;
    for (let ix = 0; ix < lm6_gridN; ix++)
    for (let iy = 0; iy < lm6_gridN; iy++)
    for (let iz = 0; iz < lm6_gridN; iz++)
      pts.push(new THREE.Vector3(
        (ix - offset) * spacing,
        (iy - offset) * spacing,
        (iz - offset) * spacing
      ));
    return pts;
  }

  function solveNormal(inDir, outDir) {
    const a = inDir.clone().negate().normalize();
    const b = outDir.clone().normalize();
    const n = a.clone().add(b);
    if (n.length() < 1e-6) {
      const perp = new THREE.Vector3(1, 0, 0);
      if (Math.abs(inDir.dot(perp)) > 0.99) perp.set(0, 1, 0);
      return perp.cross(inDir).normalize();
    }
    return n.normalize();
  }

  // Returns true if point P lies too close to any segment in laserPts
  // (i.e. the laser would pass through this mirror position)
  function laserPassesThrough(P, laserPts, clearance) {
    for (let i = 0; i < laserPts.length - 1; i++) {
      const A = laserPts[i];
      const B = laserPts[i + 1];
      const AB = B.clone().sub(A);
      const len = AB.length();
      if (len < 1e-6) continue;
      const dir = AB.clone().divideScalar(len);
      const AP = P.clone().sub(A);
      const t = Math.max(0, Math.min(len, AP.dot(dir)));
      const closest = A.clone().addScaledVector(dir, t);
      if (closest.distanceTo(P) < clearance) return true;
    }
    return false;
  }

  // ── Build fns ─────────────────────────────────────────────────────────────
  function buildGround() {
    if (groundGroup) scene.remove(groundGroup);
    groundGroup = new THREE.Group();
    scene.add(groundGroup);

    const gridExtent = (lm6_gridN - 1) * lm6_gridSpacing;
    const groundY = -(gridExtent / 2) - lm6_gridSpacing * 0.9;
    const step = lm6_gridSpacing * 0.5;
    const extent = gridExtent * 1.8 + lm6_gridSpacing;

    const lineMat = new THREE.LineBasicMaterial({ color: 0xc8c6c0, transparent: true, opacity: 0.8 });
    const gridMesh = new THREE.Group();
    for (let x = -extent; x <= extent + 0.001; x += step) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, -extent), new THREE.Vector3(x, 0, extent)]);
      gridMesh.add(new THREE.Line(g, lineMat));
    }
    for (let z = -extent; z <= extent + 0.001; z += step) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-extent, 0, z), new THREE.Vector3(extent, 0, z)]);
      gridMesh.add(new THREE.Line(g, lineMat));
    }
    gridMesh.position.y = groundY;
    groundGroup.add(gridMesh);

    const planeMat = new THREE.MeshBasicMaterial({ color: 0xe8e6e0, side: THREE.FrontSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(extent * 2, extent * 2), planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = groundY - 0.002;
    groundGroup.add(plane);
  }

  function buildGridSkeleton() {
    const pts = gridPositions(lm6_gridSpacing);
    const skMat = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.3 });
    const grp = new THREE.Group();
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        if (Math.abs(pts[i].distanceTo(pts[j]) - lm6_gridSpacing) < 0.01) {
          grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([pts[i], pts[j]]), skMat));
        }
    return grp;
  }

  function getLaserColor() {
    try {
      if (typeof laserColor !== 'undefined') {
        const r = Math.round(red(laserColor)).toString(16).padStart(2, '0');
        const g = Math.round(green(laserColor)).toString(16).padStart(2, '0');
        const b = Math.round(blue(laserColor)).toString(16).padStart(2, '0');
        return new THREE.Color(`#${r}${g}${b}`);
      }
    } catch(e) {}
    return new THREE.Color('#e63412');
  }

  function buildMirrorsAndLaser() {
    if (mirrorGroup) scene.remove(mirrorGroup);
    if (laserGroup) scene.remove(laserGroup);
    mirrorGroup = new THREE.Group();
    laserGroup = new THREE.Group();
    scene.add(mirrorGroup);
    scene.add(laserGroup);

    const allPositions = shuffle(gridPositions(lm6_gridSpacing));
    // clearance: laser must not pass within half a grid spacing of a mirror
    const clearance = lm6_gridSpacing * 0.45;

    // Build the laser path greedily, skipping mirrors the laser would pass through
    // laserPts[0] = entryOrigin (off-grid)
    // laserPts[1..n] = visited mirror positions
    // laserPts[n+1] = exit point (off-grid)

    const visitedPositions = [];  // mirror positions actually visited
    const skippedPositions = [];  // mirrors not visited (hidden)

    // We need at least 1 mirror to start. Pick first as anchor.
    // Build path incrementally: at each step, check if the segment
    // from current point to candidate passes through any already-placed mirror.
    // We also check the entry segment from off-grid origin.

    // First pass: determine entry direction from first two candidates
    // We try up to allPositions.length for a valid first pair
    let startIdx = 0;
    const laserPts = [];

    // Find first valid mirror
    const first = allPositions[0];
    // Entry: come from outside the grid
    // We'll determine entry direction after picking second mirror
    // For now collect visited in order, checking as we go
    const tempVisited = [first];

    for (let i = 1; i < allPositions.length; i++) {
      tempVisited.push(allPositions[i]);
    }

    // Now build laserPts with no-pass-through checking
    // Start: entry origin based on first two visited positions
    const p0 = tempVisited[0];
    const p1 = tempVisited[1] || tempVisited[0].clone().add(new THREE.Vector3(1, 0, 0));
    const entryDir = p0.clone().sub(p1).normalize(); // come from opposite side
    const entryOrigin = p0.clone().addScaledVector(entryDir, lm6_gridSpacing * 3.5);

    // Build path: start with [entryOrigin, p0]
    // For each subsequent candidate, check if segment from previous pt to candidate
    // passes through any already-committed mirror (excluding the one we're heading to)
    const committed = [entryOrigin, p0.clone()];
    const visitedSet = [p0];
    const hiddenSet = [];

    for (let i = 1; i < tempVisited.length; i++) {
      const candidate = tempVisited[i];
      const prevPt = committed[committed.length - 1];

      // Build a temporary segment [prevPt -> candidate] and check against
      // all already-committed mirror positions (not counting prevPt itself which is a mirror vertex)
      const tempSeg = [prevPt, candidate];

      let blocked = false;
      // Check this new segment against all previously visited mirror positions
      // (skip index 0 = entryOrigin which isn't a mirror, skip the last = prevPt which is the current mirror)
      for (let v = 1; v < committed.length - 1; v++) {
        const mirrorPos = committed[v];
        // distance from mirrorPos to segment [prevPt -> candidate]
        const A = prevPt, B = candidate;
        const AB = B.clone().sub(A);
        const len = AB.length();
        if (len < 1e-6) continue;
        const dir = AB.clone().divideScalar(len);
        const AP = mirrorPos.clone().sub(A);
        const t = Math.max(0, Math.min(len, AP.dot(dir)));
        const closest = A.clone().addScaledVector(dir, t);
        if (closest.distanceTo(mirrorPos) < clearance) {
          blocked = true;
          break;
        }
      }

      if (blocked) {
        hiddenSet.push(candidate);
      } else {
        committed.push(candidate.clone());
        visitedSet.push(candidate);
      }
    }

    // Add exit point
    const lastMirror = committed[committed.length - 1];
    const secondLast = committed[committed.length - 2];
    const exitDir = lastMirror.clone().sub(secondLast).normalize();
    committed.push(lastMirror.clone().addScaledVector(exitDir, lm6_gridSpacing * 3.5));

    const finalLaserPts = committed;

    // ── Draw mirrors ──────────────────────────────────────────────────────
    // Visited mirrors: full opacity with normal/edge decoration
    for (let i = 0; i < visitedSet.length; i++) {
      const curr = finalLaserPts[i + 1]; // i+1 because [0] is entryOrigin
      const prev = finalLaserPts[i];
      const next = finalLaserPts[i + 2];
      const inDir = curr.clone().sub(prev).normalize();
      const outDir = next.clone().sub(curr).normalize();
      const normal = solveNormal(inDir, outDir);

      const geo = new THREE.PlaneGeometry(lm6_mirrorSize, lm6_mirrorSize);
      const mat = new THREE.MeshBasicMaterial({ color: 0x0d0d0d, side: THREE.DoubleSide, transparent: true, opacity: 0.80 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(curr);
      mesh.lookAt(curr.clone().add(normal));
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x333333 })));

      const stubPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, lm6_mirrorSize * 0.45)];
      mesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(stubPts), new THREE.LineBasicMaterial({ color: 0x888880, transparent: true, opacity: 0.45 })));

      mirrorGroup.add(mesh);

      // Small grey dot at mirror position (no large red spheres)
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0xbbbbbb }));
      dot.position.copy(curr);
      mirrorGroup.add(dot);
    }

    // Hidden mirrors: very faint ghost, no decoration
    for (const pos of hiddenSet) {
      const geo = new THREE.PlaneGeometry(lm6_mirrorSize * 0.8, lm6_mirrorSize * 0.8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide, transparent: true, opacity: 0.10 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      // Face a default direction (arbitrary)
      mesh.lookAt(pos.clone().add(new THREE.Vector3(0, 1, 0.5)));
      mirrorGroup.add(mesh);
    }

    // ── Draw laser ────────────────────────────────────────────────────────
    const laserCol = getLaserColor();

    // Main line
    laserGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(finalLaserPts),
      new THREE.LineBasicMaterial({ color: laserCol })
    ));

    // Glow tubes
    const glowMat = new THREE.MeshBasicMaterial({ color: laserCol, transparent: true, opacity: 0.10 });
    for (let i = 0; i < finalLaserPts.length - 1; i++) {
      const a = finalLaserPts[i], b = finalLaserPts[i + 1];
      const len = a.distanceTo(b);
      if (len < 0.001) continue;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 8, 1), glowMat);
      tube.position.copy(a.clone().add(b).multiplyScalar(0.5));
      tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      laserGroup.add(tube);
    }

    // Emitter sphere only (no bounce spheres at mirrors)
    const emitter = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color: laserCol })
    );
    emitter.position.copy(entryOrigin);
    laserGroup.add(emitter);
  }

  function lm6_rebuild() {
    buildGround();
    if (skeletonGroup) scene.remove(skeletonGroup);
    skeletonGroup = buildGridSkeleton();
    scene.add(skeletonGroup);
    buildMirrorsAndLaser();
  }

  // ── Mount / Unmount ───────────────────────────────────────────────────────
  function mount(container) {
    if (mounted) return;
    mounted = true;

    const W = () => container.clientWidth;
    const H = () => container.clientHeight;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W(), H());
    renderer.setClearColor(0xf5f4f0, 1);
    renderer.domElement.id = 'lm6-canvas';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, W() / H(), 0.01, 300);

    // Faint axes
    const axisMat = (c) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.07 });
    const mkLine = (a, b, mat) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat);
    const R = 60, ax = new THREE.Group();
    ax.add(mkLine(new THREE.Vector3(-R,0,0), new THREE.Vector3(R,0,0), axisMat(0xdd4444)));
    ax.add(mkLine(new THREE.Vector3(0,-R,0), new THREE.Vector3(0,R,0), axisMat(0x44aa44)));
    ax.add(mkLine(new THREE.Vector3(0,0,-R), new THREE.Vector3(0,0,R), axisMat(0x4466dd)));
    scene.add(ax);

    applyOrbit();
    lm6_rebuild();

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    LaserMirror6._resizeObserver = new ResizeObserver(() => {
      renderer.setSize(W(), H());
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
    });
    LaserMirror6._resizeObserver.observe(container);

    function animate() {
      if (!mounted) return;
      animFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();
  }

  function unmount() {
    if (!mounted) return;
    mounted = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    renderer.domElement.removeEventListener('mousedown', onMouseDown);
    renderer.domElement.removeEventListener('contextmenu', onContextMenu);
    renderer.domElement.removeEventListener('wheel', onWheel);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    if (LaserMirror6._resizeObserver) LaserMirror6._resizeObserver.disconnect();
    renderer.dispose();
    const el = document.getElementById('lm6-canvas');
    if (el) el.remove();
    scene = null; renderer = null; camera = null;
    mirrorGroup = null; laserGroup = null; groundGroup = null; skeletonGroup = null;
  }

  return {
    mount,
    unmount,
    rebuild: () => { if (mounted) lm6_rebuild(); },
    updateLaserColor: () => { if (mounted) buildMirrorsAndLaser(); },
    setMirrorSize: (v) => { lm6_mirrorSize = v; if (mounted) buildMirrorsAndLaser(); },
    setGridSpacing: (v) => { lm6_gridSpacing = v; if (mounted) lm6_rebuild(); },
    setGridN: (v) => {
      lm6_gridN = Math.max(2, Math.min(10, Math.round(v)));
      if (mounted) lm6_rebuild();
    },
    resetView: () => {
      orb.theta = 0.6; orb.phi = 1.05; orb.radius = 22;
      orb.target.x = 0; orb.target.y = 0; orb.target.z = 0;
      if (mounted) applyOrbit();
    },
  };
})();
