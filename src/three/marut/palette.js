// Marut's color language, sampled from the reference turnaround boards
// (reference/marut-boards/). One material set shared by every mesh —
// programs compile once. All MeshStandardMaterial (single shader family).
//
// The boards are a vinyl-toy product shot: blacks never crush (charcoal
// floor ~#1b1d22), sheen is differentiated per surface family (matte knit →
// satin skin/panels → gloss shoes/tail). Emissives are calibrated for
// ACES 1.15 + the UnrealBloomPass in scene.js (threshold 0.9 in linear):
// intensities that push linear luminance past ~0.9 grow a halo, the rest
// stay flat glows — that's the selective-bloom line, tune with care.
import * as THREE from 'three';

export const COLORS = {
  skin: 0xe8944f,
  jacket: 0x24262c,       // charcoal — lit facets rise to ~#3a3e46
  jacketOrange: 0xf5761c, // satin shoulder/side panels, zip trim
  ribbing: 0x1b1d22,      // collar/cuffs/hem knit — most matte on the figure
  circuit: 0xffb066,
  hair: 0x1a1c21,           // blue-black blades + base cap (vertex color)
  hairOrange: 0xed7420,     // solid orange blades (vertex color)
  hairOrangeDeep: 0xa8500f, // burnt-orange variant on ~30% of orange blades
  pants: 0x232630,        // slightly bluer/lighter than the jacket
  trimCyan: 0x35e0ff,
  shoe: 0xf5821e,
  sole: 0x2a2119,
  tail: 0xf97a1c,         // lit glossy vinyl — NOT a glow blob
  tailGlyph: 0xffd27f,    // etched circuit glyphs + arrowhead glow
  iris: 0x7a4322,
  chipFrame: 0xc9ccd3,    // silver metal bezel
  chipGlow: 0xff8c2a,
  mouth: 0x5b2f1a,
};

let cached = null;

export function makeMaterials() {
  if (cached) return cached;
  // sheen is per-family — no blanket envMapIntensity (uniform sheen is what
  // made matte fabric look plastic AND gloss look dull at the same time)
  const M = (p) => new THREE.MeshStandardMaterial({ envMapIntensity: 0.6, ...p });
  cached = {
    // satin skin + faint warm emissive floor so the shadow side survives the
    // dark site background (fake bounce/SSS)
    skin: M({ color: COLORS.skin, roughness: 0.52, envMapIntensity: 0.75,
              emissive: 0x361703, emissiveIntensity: 0.18 }),
    skinFlat: M({ color: COLORS.skin, roughness: 0.52, envMapIntensity: 0.75,
                  emissive: 0x361703, emissiveIntensity: 0.18, flatShading: true }),
    jacket: M({ color: COLORS.jacket, roughness: 0.74 }), // map/emissiveMap attached by textures.js
    // faceted jacket panels read as crisp value steps
    jacketFacet: M({ color: COLORS.jacket, roughness: 0.74, flatShading: true }),
    jacketTrim: M({ color: COLORS.jacketOrange, roughness: 0.42, envMapIntensity: 1.0 }),
    jacketTrimFacet: M({ color: COLORS.jacketOrange, roughness: 0.42, envMapIntensity: 1.0, flatShading: true }),
    ribbing: M({ color: COLORS.ribbing, roughness: 0.88, envMapIntensity: 0.4 }),
    // corrugated knit cuffs read via flat-shaded rib columns
    cuffRib: M({ color: 0x171921, roughness: 0.85, envMapIntensity: 0.4, flatShading: true }),
    // faceted jogger legs — hard normal breaks carry the low-poly read
    pantsFacet: M({ color: 0x14161d, roughness: 0.65, envMapIntensity: 0.5, flatShading: true }),
    hair: M({ vertexColors: true, flatShading: true, roughness: 0.45, envMapIntensity: 1.0 }),
    pants: M({ color: COLORS.pants, roughness: 0.8, envMapIntensity: 0.5 }),
    // white-hot core on the seam piping; 1.8 puts it just over the bloom
    // threshold so the cyan strips grow a slim neon halo (breachbunny trim)
    trimCyan: M({ color: 0x0a2530, emissive: 0x5fd8ff, emissiveIntensity: 2.6, roughness: 0.5 }),
    // env kept moderate — at 1.25 the IBL specular on the bright orange
    // pushed the whole shoe past the bloom threshold (glowed like a lamp)
    shoe: M({ color: COLORS.shoe, roughness: 0.42, envMapIntensity: 0.85 }),
    sole: M({ color: COLORS.sole, roughness: 0.9, envMapIntensity: 0.35 }),
    // lit vinyl tube with faint inner warmth; the GLYPHS carry the glow
    tail: M({ color: COLORS.tail, roughness: 0.3, envMapIntensity: 1.3,
              emissive: 0xff8a2a, emissiveIntensity: 0.35 }),
    tailGlyph: M({ color: 0x381505, emissive: COLORS.tailGlyph, emissiveIntensity: 2.4, roughness: 0.3 }),
    chipFrame: M({ color: COLORS.chipFrame, metalness: 0.85, roughness: 0.35, envMapIntensity: 1.0 }),
    // hero glow — deep into bloom range: white-hot core + wide orange halo
    chipCore: M({ color: 0x381505, emissive: COLORS.chipGlow, emissiveIntensity: 2.4,
                  roughness: 0.12, envMapIntensity: 1.5 }),
    eyeWhite: M({ color: 0xf7f2e9, roughness: 0.25, envMapIntensity: 1.0 }),
    iris: M({ color: COLORS.iris, roughness: 0.25 }),
    pupil: M({ color: 0x08080a, roughness: 0.2 }),
    brow: M({ color: 0x17130f, roughness: 0.8 }),
    mouth: M({ color: COLORS.mouth, roughness: 0.7 }),
  };
  return cached;
}
