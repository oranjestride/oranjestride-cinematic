# ============================================================================
# bake-ao.py — Blender headless: bake ambient occlusion over the sculpted
# mascot's existing UVs and multiply it into the base-color texture, so the
# shipped GLB gains crevice shading (eye sockets, nose, hair roots, jacket
# folds) with zero runtime cost. Companion to rig-transfer.py (Blender 5.x).
#
#   blender --background --python scripts/bake-ao.py -- \
#       --in public/models/mascot.glb --out public/models/mascot-ao.glb \
#       [--samples 48] [--strength 0.75] [--size 2048]
#
# Skinning, armature, and animation clips pass through untouched — only the
# image data inside the base-color textures changes.
# ============================================================================
import bpy
import sys
import argparse
from pathlib import Path

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--in", dest="src", required=True)
ap.add_argument("--out", dest="dst", required=True)
ap.add_argument("--samples", type=int, default=48)
ap.add_argument("--strength", type=float, default=0.75)  # 0 = no AO, 1 = full multiply
ap.add_argument("--size", type=int, default=2048)
args = ap.parse_args(argv)

# --- clean slate + import -----------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(args.src).resolve()))

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
if not meshes:
    print("[bake-ao] no meshes found, aborting")
    sys.exit(1)
print(f"[bake-ao] {len(meshes)} mesh object(s)")

# --- Cycles bake setup ----------------------------------------------------
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.render.bake.use_selected_to_active = False
scene.render.bake.margin = 8

# One AO target image per unique base-color image, keyed by name.
ao_images = {}

def base_color_image(mat):
    """The image feeding Base Color on the Principled BSDF (glTF import layout)."""
    if not mat or not mat.use_nodes:
        return None
    for node in mat.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            for link in mat.node_tree.links:
                if link.to_node == node and link.to_socket.name == "Base Color":
                    n = link.from_node
                    if n.type == "TEX_IMAGE" and n.image:
                        return n.image
    return None

# Collect materials + attach a bake-target AO image node (selected node is
# what Cycles bakes INTO).
bake_jobs = []  # (material, base_image, ao_image)
for obj in meshes:
    for slot in obj.material_slots:
        mat = slot.material
        img = base_color_image(mat)
        if not img or mat.name in [m.name for m, _, _ in bake_jobs]:
            continue
        key = img.name
        if key not in ao_images:
            ao = bpy.data.images.new(f"AO_{key}", width=args.size, height=args.size, alpha=False)
            ao.colorspace_settings.name = "Non-Color"
            ao_images[key] = ao
        nodes = mat.node_tree.nodes
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = ao_images[key]
        nodes.active = tex
        tex.select = True
        bake_jobs.append((mat, img, ao_images[key]))

print(f"[bake-ao] baking AO for {len(bake_jobs)} material(s) at {args.size}px, {args.samples} samples")

# Bake all meshes at once (each material writes into its active image node).
bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.bake(type="AO")
print("[bake-ao] bake complete")

# --- multiply AO into each base-color image (numpy for speed) -------------
import numpy as np

done = set()
for mat, img, ao in bake_jobs:
    if img.name in done:
        continue
    done.add(img.name)
    w, h = img.size
    base = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    aw, ah = ao.size
    aopx = np.array(ao.pixels[:], dtype=np.float32).reshape(ah, aw, 4)[:, :, 0]
    if (aw, ah) != (w, h):
        # nearest-neighbour resize to the base image's resolution
        yi = (np.linspace(0, ah - 1, h)).astype(np.int32)
        xi = (np.linspace(0, aw - 1, w)).astype(np.int32)
        aopx = aopx[yi][:, xi]
    # strength-weighted multiply, floor keeps crevices from going pitch black
    ao_term = 1.0 - args.strength * (1.0 - np.clip(aopx, 0.15, 1.0))
    base[:, :, :3] *= ao_term[:, :, None]
    img.pixels[:] = base.ravel().tolist()
    img.pack()
    print(f"[bake-ao] multiplied AO into {img.name} ({w}x{h})")

# Remove the temporary AO nodes so the export material graph stays clean.
for mat, _, ao in bake_jobs:
    for node in list(mat.node_tree.nodes):
        if node.type == "TEX_IMAGE" and node.image and node.image.name.startswith("AO_"):
            mat.node_tree.nodes.remove(node)

# --- export ---------------------------------------------------------------
bpy.ops.export_scene.gltf(
    filepath=str(Path(args.dst).resolve()),
    export_format="GLB",
    export_image_format="WEBP",
    export_image_quality=82,
    export_animations=True,
    export_skins=True,
    export_yup=True,
)
print(f"[bake-ao] exported {args.dst}")
