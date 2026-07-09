// ============================================================================
// marut-glb.js — the sculpted Marut. Loads the rigged, Mixamo-animated
// public/models/mascot.glb (Hunyuan/higgsfield sculpt) and wraps it in the
// SAME instance API as the procedural createMarut, so the showcase, intro,
// and mascot-lab chips drive either implementation unchanged.
//
// The procedural mascot (src/three/marut/) remains the fallback: if the GLB
// is missing, malformed, or its rig collapses when posed, mountMarutGLB
// resolves null and main.js builds the code mascot instead.
//
// Recovered + adapted from the pre-showcase loader (git 072b885): clip-name
// regex matching, Mixamo track remapping, the emissive-recovery shader (the
// image-to-3D bake has no emissive map — saturated orange/cyan texels emit
// in-shader), and the posed-bounds validity gate.
// ============================================================================
import * as THREE from 'three';

const GLB_URL = '/models/mascot.glb';
const TARGET_HEIGHT = 1.80; // world units — matches the procedural rig, so
                            // every showcase waypoint frames identically

const CLIP_RE = {
  idle: /idle|breath/i,
  wave: /wave|greet/i,
  run: /run|stride|walk/i,
  cheer: /clap|cheer/i,
};

// Real binary asset, not the SPA index.html a static host returns for 404s.
async function assetExists(url) {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    const type = head.headers.get('content-type') || '';
    return head.ok && !type.includes('text/html');
  } catch (_) {
    return false;
  }
}

// Bridge the Mixamo name mismatch ("mixamorig:Hips" vs "mixamorigHips" vs
// "Hips") — unmatched tracks silently fail to bind otherwise.
function remapClipsToSkeleton(clips, model) {
  const norm = (n) => n.replace(/^mixamorig[:_]?/i, '').replace(/[:_\s]/g, '').toLowerCase();
  const byNorm = new Map();
  model.traverse((o) => { if (o.isBone) byNorm.set(norm(o.name), o.name); });
  if (!byNorm.size) return clips;
  return clips.map((clip) => {
    const c = clip.clone();
    c.tracks = c.tracks.map((tr) => {
      const dot = tr.name.lastIndexOf('.');
      const node = tr.name.slice(0, dot);
      const prop = tr.name.slice(dot);
      const target = byNorm.get(norm(node));
      if (!target || target === node) return tr;
      const t = tr.clone(); t.name = target + prop; return t;
    });
    return c;
  });
}

// World AABB of the POSED skeleton (Box3.setFromObject is degenerate for
// skinned meshes — measure the bones, pad for flesh beyond the bone tips).
const _p = new THREE.Vector3();
function worldSkinnedBox(root) {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3(); box.makeEmpty();
  let bones = 0;
  root.traverse((o) => { if (o.isBone) { o.getWorldPosition(_p); box.expandByPoint(_p); bones++; } });
  if (!bones) return new THREE.Box3().setFromObject(root);
  box.expandByScalar((box.max.y - box.min.y) * 0.08);
  return box;
}

/**
 * Load + wrap the sculpted mascot. Resolves the instance, or null → caller
 * falls back to the procedural mascot.
 */
export async function mountMarutGLB() {
  if (!(await assetExists(GLB_URL))) return null;

  let gltf;
  try {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    gltf = await new GLTFLoader().loadAsync(GLB_URL);
  } catch (err) {
    console.warn('[marut-glb] load failed, falling back to procedural:', err);
    return null;
  }

  const model = gltf.scene;
  model.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.frustumCulled = false; });

  // Emissive recovery: the bake ships one base-color texture, no emissive
  // map. Saturated orange (circuits/tail/trim) and neon-cyan texels emit
  // their own color — intensities sized for the M8 bloom threshold (1.25 in
  // linear HDR) so the trim halos like the reference site's neon.
  model.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh) || !o.material) return;
    const m = o.material;
    m.envMapIntensity = 0.9;
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 c = diffuseColor.rgb;
          // hot saturated orange ONLY (circuit print / trim) — skin is also
          // orange-family but desaturated; the g-channel guard excludes it,
          // otherwise the whole character radiates
          float orange = smoothstep(0.52, 0.85, c.r - c.b)
                       * smoothstep(0.50, 0.90, c.r)
                       * (1.0 - smoothstep(0.62, 0.80, c.g));
          float cyan   = smoothstep(0.18, 0.55, c.b - c.r) * smoothstep(0.35, 0.80, c.b);
          totalEmissiveRadiance += c * (orange * 1.2 + cyan * 1.8);
        }`
      );
    };
    m.needsUpdate = true;
  });

  let clips = gltf.animations || [];
  if (clips.length) clips = remapClipsToSkeleton(clips, model);
  const mixer = clips.length ? new THREE.AnimationMixer(model) : null;
  const findClip = (name) => clips.find((c) => (CLIP_RE[name] || new RegExp(name, 'i')).test(c.name));
  const action = (name) => { const c = findClip(name); return c && mixer ? mixer.clipAction(c) : null; };

  // yaw wrapper (showcase writes) → inner stand-up (authoring orientation)
  const inner = new THREE.Group(); inner.add(model);
  const root = new THREE.Group(); root.name = 'marut-glb'; root.add(inner);

  const idle = action('idle');
  if (idle) idle.play();
  if (mixer) mixer.update(0.15); // settle before measuring

  // Stand up if authored Z-up (lies flat → depth ≫ height).
  let wb = worldSkinnedBox(root);
  let sz = wb.getSize(new THREE.Vector3());
  if (sz.z > sz.y * 1.3) { inner.rotation.x = -Math.PI / 2; wb = worldSkinnedBox(root); sz = wb.getSize(new THREE.Vector3()); }

  // Validity gate: bad bind data collapses the skinned pose to a point.
  const maxDim = Math.max(sz.x, sz.y, sz.z);
  if (!isFinite(maxDim) || maxDim < 1e-5 || sz.y < maxDim * 0.4) {
    console.warn('[marut-glb] rig collapses when posed — falling back to procedural.');
    if (mixer) mixer.stopAllAction();
    return null;
  }

  // Normalize: feet on y=0, centered on x/z, TARGET_HEIGHT tall — the world
  // the showcase waypoints were authored against.
  const s = TARGET_HEIGHT / sz.y;
  inner.scale.setScalar(s);
  inner.updateWorldMatrix(true, true);
  wb = worldSkinnedBox(root);
  inner.position.set(
    -(wb.max.x + wb.min.x) / 2,
    -wb.min.y,
    -(wb.max.z + wb.min.z) / 2,
  );

  const run = action('run');

  // --- yaw / locomotion state (mirrors the procedural animator's contract) --
  let yawTarget = 0, dragYaw = 0, dragging = false;
  let locoTarget = 0, runW = 0;

  const inst = {
    sectionId: '*',
    root,
    active: true,

    setActive(on) {
      this.active = on;
      root.visible = on;
    },

    // wave | cheer | run | point — one-shot on top of the idle loop.
    // 'point' has no clip in the Mixamo set → wave reads as the gesture.
    play(name) {
      const a = action(name === 'point' ? 'wave' : name);
      if (!a || a === idle) return;
      a.reset();
      a.setLoop(THREE.LoopOnce);
      a.clampWhenFinished = false;
      a.setEffectiveWeight(1);
      a.fadeIn(0.2);
      a.play();
    },

    // Base poses are a procedural concept — the sculpt idles through all of
    // them; the camera + one-shots carry the per-section choreography.
    setBasePose() {},
    setYaw(rad) { yawTarget = rad; },
    setLocomotion(v) { locoTarget = v == null ? 0 : THREE.MathUtils.clamp(v, 0, 1); },
    // applied to the root immediately (1:1 finger tracking) — the update()
    // lerp only reconciles toward the same target afterward, so this stays
    // correct even when frames are scarce (software rasterizers)
    addDragYaw(d) { dragYaw += d; root.rotation.y += d; },
    setDragging(on) { dragging = on; },
    setLookEnabled() {},

    update({ dt, scrollVel }) {
      if (mixer) mixer.update(dt);

      const target = yawTarget + dragYaw;
      root.rotation.y += (target - root.rotation.y) * (dragging ? 0.5 : 0.08);

      // scroll velocity blends the run clip in (showcase loco + free scroll)
      if (run) {
        const want = Math.max(locoTarget, Math.min(1, Math.abs(scrollVel) * 40));
        runW += (want - runW) * 0.08;
        run.setEffectiveWeight(runW);
        if (runW > 0.01 && !run.isRunning()) run.play();
      }
    },

    dispose() {
      if (mixer) mixer.stopAllAction();
      root.parent?.remove(root);
      root.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          m.map?.dispose(); m.dispose();
        });
      });
    },
  };

  return inst;
}
