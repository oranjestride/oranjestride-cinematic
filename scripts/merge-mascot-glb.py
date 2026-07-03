"""
merge-mascot-glb.py
--------------------
Run this WITH Blender (not plain python3) to merge the 4 separate Mixamo FBX
downloads (each carrying its own duplicate ~450k-vertex mesh copy) into ONE
decimated, web-ready mascot.glb with three named animation clips: Idle, Wave, Run.

USAGE (macOS, from Terminal, after installing Blender from blender.org):

  /Applications/Blender.app/Contents/MacOS/Blender --background --python merge-mascot-glb.py

Adjust BASE_DIR / OUTPUT_GLB below if your folder names differ. If Blender's
glTF exporter in your installed version rejects `export_nla_strips` (older
API name) vs `export_animation_mode` (newer API name), open Blender's own
File > Export > glTF 2.0 dialog once to see which options are shown for your
version, then adjust the export call at the bottom accordingly.
"""

import bpy
import os

# ---- CONFIG — edit these two paths for your machine ----
BASE_DIR = os.path.expanduser(
    "~/Documents/oranjestride_animated_3d/mascot animations"
)
OUTPUT_GLB = os.path.expanduser(
    "~/Documents/oranjestride_animated_3d/public/models/mascot.glb"
)

# clip name -> source FBX file. First entry becomes the base mesh+armature.
FILES = {
    "Idle": "Breathing Idle.fbx",
    "Wave": "Waving.fbx",
    "Run": "Running.fbx",
    "Clap": "Clapping.fbx",  # embedded too — harmless, useful if you later want a live clap clip
}

# Target ~20-40k triangles from the current ~450k-vertex mesh. Tune if the
# result still looks too dense/sparse after export.
DECIMATE_RATIO = 0.04

# ---------------------------------------------------------------------------

bpy.ops.wm.read_factory_settings(use_empty=True)

main_armature = None
main_mesh_obj = None

for i, (clip_name, filename) in enumerate(FILES.items()):
    path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(path):
        print(f"SKIP: {path} not found")
        continue

    existing = set(bpy.data.objects.keys())
    bpy.ops.import_scene.fbx(filepath=path)
    imported = [o for o in bpy.data.objects if o.name not in existing]

    arm = next((o for o in imported if o.type == 'ARMATURE'), None)
    mesh_obj = next((o for o in imported if o.type == 'MESH'), None)

    if arm is None:
        print(f"WARNING: no armature in {filename}, skipping")
        continue

    action = arm.animation_data.action if arm.animation_data else None
    if action:
        action.name = clip_name

    if main_armature is None:
        # First file: this becomes the one mesh+armature everything else merges onto.
        main_armature = arm
        main_mesh_obj = mesh_obj
    else:
        # Every later file only contributes its ACTION — push it onto the main
        # armature as its own NLA track, then discard the duplicate mesh/armature.
        if action:
            track = main_armature.animation_data.nla_tracks.new()
            track.name = clip_name
            track.strips.new(clip_name, 0, action)
        bpy.data.objects.remove(arm, do_unlink=True)
        if mesh_obj:
            bpy.data.objects.remove(mesh_obj, do_unlink=True)

if main_mesh_obj is None:
    raise SystemExit("No mesh found in any input FBX — check BASE_DIR/FILES above.")

# ---- Decimate the merged mesh for real-time web performance ----
bpy.context.view_layer.objects.active = main_mesh_obj
mod = main_mesh_obj.modifiers.new(name="Decimate", type='DECIMATE')
mod.ratio = DECIMATE_RATIO
bpy.ops.object.modifier_apply(modifier=mod.name)

# ---- Export merged GLB with all clips embedded ----
os.makedirs(os.path.dirname(OUTPUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUTPUT_GLB,
    export_format='GLB',
    export_animations=True,
    export_skins=True,
)

print(f"\nDone. Wrote {OUTPUT_GLB}")
print("Clips embedded:", list(FILES.keys()))
