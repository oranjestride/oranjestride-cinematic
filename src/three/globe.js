// Wireframe globe (India Tour §5.6) + rotating radial ring grid (Consulting §5.5).
import * as THREE from 'three';

const ORANGE = new THREE.Color('#ff6a00');
const ORANGE2 = new THREE.Color('#f47c20');

export function createGlobe() {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.1, 3),
    new THREE.MeshBasicMaterial({ color: ORANGE, wireframe: true, transparent: true, opacity: 0.28 })
  );
  group.add(mesh);

  const rings = [];
  for (let r = 0; r < 3; r++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.6 + r * 0.5, 0.01, 8, 90),
      new THREE.MeshBasicMaterial({ color: ORANGE2, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2 + r * 0.4;
    ring.rotation.y = r * 0.6;
    group.add(ring);
    rings.push(ring);
  }

  // India marker + pulse
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: ORANGE }));
  marker.position.set(1.4, 0.6, 2.6);
  group.add(marker);

  group.visible = false;
  group.scale.setScalar(0.01);

  function update() {
    group.rotation.y += 0.003;
    rings.forEach((r, i) => (r.rotation.z += 0.003 + i * 0.001));
  }
  return { group, update };
}

export function createRadialGrid() {
  const group = new THREE.Group();
  for (let i = 1; i <= 5; i++) {
    group.add(new THREE.Mesh(
      new THREE.RingGeometry(i * 0.9, i * 0.9 + 0.015, 96),
      new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    ));
  }
  for (let a = 0; a < 12; a++) {
    const spoke = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 0.01),
      new THREE.MeshBasicMaterial({ color: ORANGE2, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
    );
    spoke.rotation.z = (a / 12) * Math.PI * 2;
    spoke.position.set(Math.cos(spoke.rotation.z) * 2.25, Math.sin(spoke.rotation.z) * 2.25, 0);
    group.add(spoke);
  }
  group.visible = false;
  // counter-rotates the tunnel's implied motion (§5.5)
  function update() { group.rotation.z -= 0.0025; }
  return { group, update };
}
