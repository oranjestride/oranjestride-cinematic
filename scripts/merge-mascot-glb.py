"""
merge-mascot-glb.py
--------------------
Merge the 4 Mixamo FBX downloads (each a full rigged character + one clip) into
ONE web-ready mascot.glb with named clips: Idle, Wave, Run, Clap.

Run WITH Blender:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/merge-mascot-glb.py

Why the earlier export collapsed: the Decimate modifier was applied ON TOP of the
Armature modifier at a very low ratio (0.04), which scrambled the skin weights so
every posed vertex collapsed to a point. Fixes here:
  * DECIMATE_RATIO default 1.0 (no decimation) to get a WORKING rig first.
  * If you do decimate, it's moved to the TOP of the stack and uses COLLAPSE mode
    so vertex-group weights are preserved.
  * A VERIFY step poses the mesh at an Idle frame and prints the deformed bounding
    box, so you can confirm it's a real humanoid (not a collapsed point) before it
    ever reaches the browser.
"""

import bpy, os
from mathutils import Vector

BASE_DIR = os.path.expanduser("~/Documents/oranjestride_animated_3d/mascot animations")
OUTPUT_GLB = os.path.expanduser("~/Documents/oranjestride_animated_3d/public/models/mascot.glb")

FILES = {
    "Idle": "Breathing Idle.fbx",
    "Wave": "Waving.fbx",
    "Run": "Running.fbx",
    "Clap": "Clapping.fbx",
}

# 1.0 = no decimation (safest — the mesh is only ~60k tris, fine for web).
# Lower toward ~0.4 ONLY if the VERIFY bounds still look humanoid afterward.
DECIMATE_RATIO = 1.0

# ---------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)

main_armature = None
main_mesh_obj = None
idle_action = None

for clip_name, filename in FILES.items():
    path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(path):
        print(f"SKIP: {path} not found"); continue

    before = set(bpy.data.objects.keys())
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=True)
    imported = [o for o in bpy.data.objects if o.name not in before]

    arm = next((o for o in imported if o.type == 'ARMATURE'), None)
    mesh_obj = next((o for o in imported if o.type == 'MESH'), None)
    if arm is None:
        print(f"WARNING: no armature in {filename}"); continue

    action = arm.animation_data.action if arm.animation_data else None
    if action:
        action.name = clip_name
        action.use_fake_user = True  # keep it alive for the exporter

    if main_armature is None:
        main_armature, main_mesh_obj, idle_action = arm, mesh_obj, action
    else:
        # contribute only the ACTION as an NLA strip, then drop the duplicate
        if action:
            track = main_armature.animation_data.nla_tracks.new()
            track.name = clip_name
            track.strips.new(clip_name, 0, action)
        bpy.data.objects.remove(arm, do_unlink=True)
        if mesh_obj:
            bpy.data.objects.remove(mesh_obj, do_unlink=True)

if main_mesh_obj is None:
    raise SystemExit("No mesh found — check BASE_DIR/FILES.")

# ---- Optional decimation (weight-preserving, at TOP of the modifier stack) ----
if DECIMATE_RATIO < 1.0:
    bpy.context.view_layer.objects.active = main_mesh_obj
    mod = main_mesh_obj.modifiers.new(name="Decimate", type='DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = DECIMATE_RATIO
    # move Decimate to the top so it applies before the Armature deform
    while main_mesh_obj.modifiers.find("Decimate") > 0:
        bpy.ops.object.modifier_move_up({'object': main_mesh_obj}, modifier="Decimate")
    bpy.ops.object.modifier_apply(modifier="Decimate")

# ---- VERIFY: pose at an Idle frame + RENDER a still so we can see the truth ----
import math
main_armature.animation_data.action = idle_action
bpy.context.scene.frame_set(15)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
ev = main_mesh_obj.evaluated_get(dg)
me = ev.to_mesh()
mw = main_mesh_obj.matrix_world
xs = [(mw @ v.co) for v in me.vertices]
mn = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs)))
mx = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
center = (mn + mx) / 2.0
size = mx - mn
maxd = max(size.x, size.y, size.z) or 1.0
print(f"VERIFY posed local-size=({size.x:.4f},{size.y:.4f},{size.z:.4f}) verts={len(me.vertices)}")
ev.to_mesh_clear()

# frame with a camera along -Y looking at the character (Blender is Z-up)
cam_data = bpy.data.cameras.new("VCam"); cam = bpy.data.objects.new("VCam", cam_data)
bpy.context.scene.collection.objects.link(cam); bpy.context.scene.camera = cam
cam.location = (center.x, center.y - maxd * 2.6, center.z)
cam.rotation_euler = (math.radians(90), 0, 0)
cam_data.clip_start = maxd * 0.001   # tiny near-clip so the ~0.01-scale mesh isn't clipped
cam_data.clip_end = maxd * 100.0
bpy.context.scene.render.engine = 'BLENDER_WORKBENCH'
bpy.context.scene.render.resolution_x = 640
bpy.context.scene.render.resolution_y = 640
bpy.context.scene.render.film_transparent = False
bpy.context.scene.render.filepath = os.path.expanduser("~/Documents/oranjestride_animated_3d/_blender_verify.png")
bpy.ops.render.render(write_still=True)
print("VERIFY render written to _blender_verify.png")

# ---- Export ----
os.makedirs(os.path.dirname(OUTPUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUTPUT_GLB, export_format='GLB',
                          export_animations=True, export_skins=True)
print(f"\nDone. Wrote {OUTPUT_GLB}\nClips: {list(FILES.keys())}")
