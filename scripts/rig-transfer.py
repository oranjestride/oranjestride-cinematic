"""
rig-transfer.py
----------------
Transfer the existing Mixamo rig + clips (Idle/Wave/Run/Clap) from the current
public/models/mascot.glb onto a NEW static character mesh (Tencent Hunyuan3D
50k-tri GLB with 4K PBR maps), then export a web-ready replacement GLB.

Run WITH Blender:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/rig-transfer.py -- \
      --new "/path/to/new-model.glb" [--out public/models/mascot.glb]

Steps:
  1. Import the OLD mascot.glb, keep its armature + actions, delete its mesh.
  2. Import the NEW mesh (must be in a near-A/arms-down pose like the old rest
     pose, or automatic weights will fight the clips).
  3. Fit the armature to the new mesh (object-level scale/translate only — the
     hip-location keyframes live in armature space, so applying the scale
     would desync every clip's root motion).
  4. Parent with automatic weights, stash all four actions as NLA tracks.
  5. VERIFY: pose Idle+Run mid-clip and measure the deformed bounds — a
     collapapsed/scrambled skin fails loudly here instead of on the site.
  6. Downscale textures (base 2K, normal 2K, ORM 1K) and export WEBP-packed.
"""

import bpy, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, dflt=None):
    return argv[argv.index(name) + 1] if name in argv else dflt

NEW_GLB = arg("--new")
BASE = os.path.expanduser("~/Documents/oranjestride_animated_3d")
# NB: pass --old when OUT overwrites the rig source (default), or a re-run
# will happily eat its own output.
OLD_GLB = arg("--old", os.path.join(BASE, "public/models/mascot.glb"))
OUT_GLB = arg("--out", os.path.join(BASE, "public/models/mascot.glb"))
PREVIEW_DIR = arg("--previews")  # optional: render posed stills here
assert NEW_GLB and os.path.exists(NEW_GLB), f"--new glb not found: {NEW_GLB}"

bpy.ops.wm.read_factory_settings(use_empty=True)

# -- 1 · old rig ------------------------------------------------------------
# Keep the OLD skinned mesh around: its proven weights get surface-transferred
# onto the new mesh (bone-heat fails silently on multi-shell AI meshes).
bpy.ops.import_scene.gltf(filepath=OLD_GLB)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
# The donor is the SKINNED character mesh — the old file also carries a stray
# icosphere from an earlier pipeline; pick by vertex-group count, drop the rest.
old_meshes = [o for o in bpy.data.objects if o.type == 'MESH']
old_mesh = max(old_meshes, key=lambda o: len(o.vertex_groups))
for o in old_meshes:
    if o is not old_mesh:
        print("[rig] dropping stray mesh:", o.name)
        bpy.data.objects.remove(o, do_unlink=True)
actions = {a.name: a for a in bpy.data.actions}
print("[rig] armature bones:", len(arm.data.bones), "actions:", sorted(actions),
      "donor:", old_mesh.name, "vgroups:", len(old_mesh.vertex_groups))
assert len(old_mesh.vertex_groups) > 10, "donor mesh has no skin weights"


# -- 2 · new mesh -----------------------------------------------------------
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=NEW_GLB)
mesh = next(o for o in set(bpy.data.objects) - before if o.type == 'MESH')

def world_bounds(obj):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector((min(p[i] for p in pts) for i in range(3)))
    hi = Vector((max(p[i] for p in pts) for i in range(3)))
    return lo, hi

m_lo, m_hi = world_bounds(mesh)
print(f"[mesh] bounds z {m_lo.z:.3f}..{m_hi.z:.3f} height {m_hi.z - m_lo.z:.3f}")

# -- 2b · strip the hand-held whip staff --------------------------------------
# The source model authors the character's energy-whip tail as a staff held in
# the right fist — mid-animation it reads as a stick and contradicts the
# footage (where the tail arcs from the back). In the mesh's LOCAL space
# (x side, y height 0..1.147, z depth) the whip is a swarm of small fragment
# shells around the right fist (y 0.42–0.58) plus a lower shaft + crumbs
# hanging beside the right thigh — all inside x −0.24..−0.095, y 0.05..0.58,
# every one under ~300 verts, while every real body part is either a large
# shell or lives outside that box. Measured, deterministic, pre-rig.
import bmesh
_bm = bmesh.new(); _bm.from_mesh(mesh.data); _bm.verts.ensure_lookup_table()
_seen, _doom = set(), []
for _v in _bm.verts:
    if _v.index in _seen: continue
    _stack, _comp = [_v], []
    while _stack:
        _u = _stack.pop()
        if _u.index in _seen: continue
        _seen.add(_u.index); _comp.append(_u)
        for _e in _u.link_edges:
            _w = _e.other_vert(_u)
            if _w.index not in _seen: _stack.append(_w)
    if len(_comp) > 400: continue
    _cx = sum(u.co.x for u in _comp) / len(_comp)
    _cy = sum(u.co.y for u in _comp) / len(_comp)
    if not (-0.24 < _cx < -0.095 and 0.05 < _cy < 0.58):
        continue
    _lo = Vector((min(u.co[i] for u in _comp) for i in range(3)))
    _hi = Vector((max(u.co[i] for u in _comp) for i in range(3)))
    _thin = min(_hi - _lo) < 0.022
    # below the fist everything in the box is whip shaft/crumbs; at fist
    # height only thin strands die — compact blobs there are the hand itself
    if _cy < 0.40 or _thin:
        _doom.extend(_comp)
if _doom:
    bmesh.ops.delete(_bm, geom=_doom, context='VERTS')
    _bm.to_mesh(mesh.data)
    print(f"[whip] stripped {len(_doom)} verts of hand-held whip debris")
_bm.free()

# -- 3 · bring the NEW MESH into the rig's coordinate system -----------------
# The Mixamo rig lives in a centimetre world (armature scale 0.01); touching
# the armature scale would also scale every hip-translation key and shred the
# pose. So the rig stays untouched and the new mesh shrinks to the donor's
# size instead — the site auto-fits by measured bounds, world scale is moot.
arm.data.pose_position = 'REST'
bpy.context.view_layer.update()
o_lo, o_hi = world_bounds(old_mesh)
print(f"[donor] bounds z {o_lo.z:.5f}..{o_hi.z:.5f} height {o_hi.z - o_lo.z:.5f}")
s = (o_hi.z - o_lo.z) / (m_hi.z - m_lo.z)
mesh.scale = (mesh.scale.x * s,) * 3
bpy.context.view_layer.update()
m_lo, m_hi = world_bounds(mesh)
m_c = (m_lo + m_hi) / 2
o_c = (o_lo + o_hi) / 2
mesh.location.x += o_c.x - m_c.x
mesh.location.y += o_c.y - m_c.y
mesh.location.z += o_lo.z - m_lo.z
bpy.context.view_layer.update()
m_lo, m_hi = world_bounds(mesh)
print(f"[align] mesh now z {m_lo.z:.5f}..{m_hi.z:.5f} vs donor {o_lo.z:.5f}..{o_hi.z:.5f}")

# -- 4 · skin — transfer the OLD mesh's proven weights onto the new mesh -----
# (The old mesh is the same character on this same armature; nearest-face
# interpolation of its weights beats bone-heat, which fails on shell meshes.)
for vg in old_mesh.vertex_groups:            # matching destination groups
    if vg.name not in mesh.vertex_groups:
        mesh.vertex_groups.new(name=vg.name)
dt = mesh.modifiers.new('WeightsFromOld', 'DATA_TRANSFER')
dt.object = old_mesh
dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'
dt.layers_vgroup_select_dst = 'NAME'
bpy.context.view_layer.objects.active = mesh
with bpy.context.temp_override(active_object=mesh, object=mesh):
    bpy.ops.object.modifier_apply(modifier=dt.name)
weighted = sum(1 for v in mesh.data.vertices if v.groups and sum(g.weight for g in v.groups) > 0.01)
print(f"[skin] weight transfer: vgroups {len(mesh.vertex_groups)}, weighted verts {weighted}/{len(mesh.data.vertices)}")
if len(mesh.vertex_groups) < 10 or weighted < len(mesh.data.vertices) * 0.9:
    print("[skin] FAILED — weight transfer incomplete"); sys.exit(1)

# -- 4c · rigidify what's left in the fist ----------------------------------
# The whip handle survives as compact shells inside the right fist; their
# transferred weights blend hand + lower-body (nearest old-tail faces), so
# they STRETCH into a rod mid-animation. Weld every small fist-zone shell
# 100% to the hand bone: rigid grip nub, no stretch. (Fist/finger shells are
# hand-dominant already — welding them costs nothing at this stylization.)
rh = mesh.vertex_groups.get('mixamorig:RightHand')
if rh:
    _bm = bmesh.new(); _bm.from_mesh(mesh.data); _bm.verts.ensure_lookup_table()
    _seen, _weld = set(), []
    for _v in _bm.verts:
        if _v.index in _seen: continue
        _stack, _comp = [_v], []
        while _stack:
            _u = _stack.pop()
            if _u.index in _seen: continue
            _seen.add(_u.index); _comp.append(_u)
            for _e in _u.link_edges:
                _w = _e.other_vert(_u)
                if _w.index not in _seen: _stack.append(_w)
        if len(_comp) > 400: continue
        _cx = sum(u.co.x for u in _comp) / len(_comp)
        _cy = sum(u.co.y for u in _comp) / len(_comp)
        if -0.24 < _cx < -0.095 and 0.38 < _cy < 0.60:
            _weld.extend(u.index for u in _comp)
    _bm.free()
    if _weld:
        for vg in mesh.vertex_groups:
            if vg is not rh:
                vg.remove(_weld)
        rh.add(_weld, 1.0, 'REPLACE')
        print(f"[fist] welded {len(_weld)} verts rigidly to the right hand")

amod = mesh.modifiers.new('Armature', 'ARMATURE')
amod.object = arm
mesh.parent = arm
mesh.matrix_parent_inverse = arm.matrix_world.inverted()  # keep world placement

# the donor has served — only the new mesh ships
bpy.data.objects.remove(old_mesh, do_unlink=True)
# purge donor images/materials so the export only carries the new mesh's set
for img in list(bpy.data.images):
    if img.users == 0:
        bpy.data.images.remove(img)
for mat in list(bpy.data.materials):
    if mat.users == 0:
        bpy.data.materials.remove(mat)

# Blender 4.4+ slotted actions: neither an assigned action nor an NLA strip
# evaluates without its action SLOT also being assigned.
def slot_of(act):
    slots = getattr(act, 'slots', None)
    return slots[0] if slots and len(slots) else None

def assign_action(ad, act):
    ad.action = act
    s = slot_of(act) if act else None
    if s is not None and hasattr(ad, 'action_slot'):
        ad.action_slot = s

# stash every action as an NLA track so the exporter writes all four clips
arm.data.pose_position = 'POSE'
ad = arm.animation_data or arm.animation_data_create()
for name in ("Idle", "Wave", "Run", "Clap"):
    act = actions[name]
    tr = ad.nla_tracks.new()
    tr.name = name
    strip = tr.strips.new(name, int(act.frame_range[0]), act)
    s = slot_of(act)
    if s is not None and hasattr(strip, 'action_slot'):
        strip.action_slot = s
    tr.mute = True  # unmuted stacks would blend all four during verify
ad.action = None

# -- 5 · verify: deformed bounds mid-clip must stay humanoid -----------------
def posed_bounds(action, frame):
    assign_action(ad, action)
    bpy.context.scene.frame_set(frame)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = mesh.evaluated_get(dg)
    me = ev.to_mesh()
    xs = [ev.matrix_world @ v.co for v in me.vertices]
    lo = Vector((min(p[i] for p in xs) for i in range(3)))
    hi = Vector((max(p[i] for p in xs) for i in range(3)))
    ev.to_mesh_clear()
    ad.action = None
    return hi - lo

# un-mute the stashed tracks for export once verification is done (below)
def unmute_tracks():
    for tr in ad.nla_tracks:
        tr.mute = False

rest_size = m_hi - m_lo
ok = True
moved = False
for name in ("Idle", "Run"):
    act = actions[name]
    mid = int(sum(act.frame_range) / 2)
    size = posed_bounds(act, mid)
    good = size.z > rest_size.z * 0.5 and max(size) < rest_size.z * 3
    delta = max(abs(size[i] - rest_size[i]) for i in range(3))
    moved = moved or delta > rest_size.z * 0.01
    print(f"[verify] {name}@f{mid} deformed size {tuple(round(v,3) for v in size)} Δ{delta:.3f} {'OK' if good else 'COLLAPSED/EXPLODED'}")
    ok = ok and good
if not ok or not moved:
    print(f"[verify] FAILED — {'no deformation (skin dead)' if ok else 'degenerate deform'} — not exporting")
    sys.exit(1)

# -- optional posed previews --------------------------------------------------
if PREVIEW_DIR:
    import math
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'TEXTURE'
    scene.render.resolution_x = 520; scene.render.resolution_y = 680
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    scene.collection.objects.link(cam); scene.camera = cam
    c = (m_lo + m_hi) / 2; size = m_hi.z - m_lo.z
    cam.data.clip_start = size * 0.01   # the rig world is centimetres-tiny
    cam.data.clip_end = size * 100
    cam.location = (c.x, c.y - size * 1.75, c.z + size * 0.12)
    d = c - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    for name in ("Idle", "Wave", "Run", "Clap"):
        act = actions[name]
        assign_action(ad, act)
        scene.frame_set(int(sum(act.frame_range) / 2))
        scene.render.filepath = os.path.join(PREVIEW_DIR, f"posed_{name}.png")
        bpy.ops.render.render(write_still=True)
    ad.action = None

# -- 6 · texture diet + export ------------------------------------------------
for img in bpy.data.images:
    n = (img.name or '').lower()
    target = 1024 if ('metallic' in n or 'roughness' in n) else 2048
    if img.size[0] > target:
        img.scale(target, target)
        print(f"[tex] {img.name} → {target}px")

unmute_tracks()
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format='GLB',
    export_image_format='WEBP',
    export_image_quality=82,
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_skins=True,
    export_yup=True,
)
print(f"[done] wrote {OUT_GLB} ({os.path.getsize(OUT_GLB)/1e6:.2f} MB)")
