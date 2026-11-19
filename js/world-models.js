/**
 * World Bus Simulator 3.0 — Photoreal Hybrid 3D Asset Engine
 * ---------------------------------------------------------------------------
 * Binary glTF 2.0 (GLB) meshes authored with curved, lofted monocoque bodywork
 * are combined with procedurally sculpted Three.js detail geometry and
 * photorealistic PBR texture maps.  Everything is preloaded once at boot so the
 * simulation itself stays allocation free and holds 60 FPS.
 *
 *   assets/models/bus_<id>.glb      curved coach shells   (metro/viking/express/electro/ai)
 *   assets/models/vehicles_pack.glb cars, SUVs, hatchbacks, vans, tuk-tuks, bikes, lorries
 *   assets/models/scenery_pack.glb  palms, broadleaf/rubber/pine trees, tea, elephant
 *   assets/textures/*.jpg|png       PBR architectural + botanical maps
 */
(function (global) {
  'use strict';
  var THREE = global.THREE;

  var MODEL_FILES = {
    bus_metro: 'assets/models/bus_metro.glb',
    bus_viking: 'assets/models/bus_viking.glb',
    bus_express: 'assets/models/bus_express.glb',
    bus_electro: 'assets/models/bus_electro.glb',
    bus_ai: 'assets/models/bus_ai.glb',
    vehicles: 'assets/models/vehicles_pack.glb',
    scenery: 'assets/models/scenery_pack.glb'
  };
  /* length in metres each coach shell was authored at, so it can be scaled to the spec */
  var BUS_LEN = { metro: 12.0, viking: 11.6, express: 12.6, electro: 12.2, ai: 11.4 };

  var TEX_FILES = {
    bark: 'assets/textures/tree_bark.jpg',
    foliage: 'assets/textures/foliage_leaves.jpg',
    frond: 'assets/textures/palm_frond.png',
    house: 'assets/textures/house_facade.jpg',
    shop: 'assets/textures/shop_facade.jpg',
    tower: 'assets/textures/tower_facade.jpg',
    roof: 'assets/textures/roof_tiles.jpg'
  };

  var A = { gltf: {}, tex: {}, ready: false, failed: false, loading: false };
  var WAITERS = [];

  function srgb(t) { if (t) t.encoding = THREE.sRGBEncoding; return t; }

  function finish() {
    A.ready = true;
    A.loading = false;
    applyTextureMaps();
    var w = WAITERS.slice(); WAITERS.length = 0;
    for (var i = 0; i < w.length; i++) { try { w[i](); } catch (e) { } }
  }

  function load(cb) {
    if (cb) WAITERS.push(cb);
    if (A.ready) { cb && cb(); return; }
    if (A.loading) return;
    A.loading = true;
    if (!THREE || !THREE.GLTFLoader || (global.location && global.location.protocol === 'file:')) {
      A.failed = true; finish(); return;
    }
    var loader = new THREE.GLTFLoader();
    var tload = new THREE.TextureLoader();
    var keys = Object.keys(MODEL_FILES), tkeys = Object.keys(TEX_FILES);
    var pending = keys.length + tkeys.length, done = false;
    var tick = function () { pending--; if (pending <= 0 && !done) { done = true; finish(); } };
    var i;
    for (i = 0; i < keys.length; i++) {
      (function (k) {
        try {
          loader.load(MODEL_FILES[k], function (g) { A.gltf[k] = g; tick(); },
            undefined, function () { tick(); });
        } catch (e) { tick(); }
      })(keys[i]);
    }
    for (i = 0; i < tkeys.length; i++) {
      (function (k) {
        try {
          tload.load(TEX_FILES[k], function (t) {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 8;
            A.tex[k] = srgb(t);
            tick();
          }, undefined, function () { tick(); });
        } catch (e) { tick(); }
      })(tkeys[i]);
    }
    /* never block the game for more than 6 s */
    global.setTimeout(function () { if (!done) { done = true; finish(); } }, 6000);
  }

  function applyTextureMaps() {
    var sc = A.gltf.scenery;
    if (!sc) return;
    var maps = {
      Bark: ['bark', 1, 3], PalmBark: ['bark', 2, 3], Leaf: ['foliage', 2, 2],
      PineLeaf: ['foliage', 2, 2], TeaLeaf: ['foliage', 2, 2], Frond: ['frond', 1, 1]
    };
    var seen = {};
    sc.scene.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      var n = o.material.name, m = maps[n];
      if (!m || seen[n]) return;
      seen[n] = 1;
      var t = A.tex[m[0]];
      if (!t) return;
      var tt = t.clone();
      tt.needsUpdate = true;
      tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
      tt.repeat.set(m[1], m[2]);
      o.material.map = tt;
      if (n === 'Frond') {
        o.material.alphaTest = 0.5;
        o.material.transparent = false;
        o.material.side = THREE.DoubleSide;
      } else {
        o.material.side = THREE.DoubleSide;
      }
      o.material.needsUpdate = true;
    });
  }

  /* ------------------------------------------------------------------ lookup */
  function sceneOf(file) { return A.gltf[file] ? A.gltf[file].scene : null; }
  function proto(file, name) {
    var s = sceneOf(file);
    return s ? s.getObjectByName(name) : null;
  }
  function node(file, name) {
    var p = proto(file, name);
    if (!p) return null;
    var c = p.clone(true);
    c.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        if (o.material) { o.material = o.material.clone(); o.material.needsUpdate = false; }
      }
    });
    return c;
  }
  function matOf(root, name) {
    var found = null;
    root.traverse(function (o) { if (o.isMesh && o.material && o.material.name === name) found = o.material; });
    return found;
  }
  function meshesNamed(root, names) {
    var out = [];
    root.traverse(function (o) { if (o.isMesh && names.indexOf(o.name) >= 0) out.push(o); });
    return out;
  }

  /* --------------------------------------------------- merge a node for instancing
     Returns {geo, mats} — one BufferGeometry with material groups, ready for
     THREE.InstancedMesh, so a whole tree stays a single draw call per material. */
  function mergeNode(obj, keepColor) {
    var o = obj.clone(true);
    o.updateMatrixWorld(true);
    var geos = [], mats = [];
    o.traverse(function (m) { if (m.isMesh && m.geometry) { geos.push([m.geometry, m.material, m.matrixWorld]); } });
    if (!geos.length) return null;
    var total = 0, i, j;
    var prepped = [];
    for (i = 0; i < geos.length; i++) {
      var g = geos[i][0], idx = geos[i][0].index ? geos[i][0].index.count : geos[i][0].attributes.position.count;
      var gg = geos[i][0].index ? geos[i][0].toNonIndexed() : geos[i][0].clone();
      gg.applyMatrix4(geos[i][2]);
      if (!gg.attributes.uv) {
        var n = gg.attributes.position.count;
        gg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      }
      prepped.push([gg, geos[i][1]]);
      total += gg.attributes.position.count;
    }
    var P = new Float32Array(total * 3), N = new Float32Array(total * 3), U = new Float32Array(total * 2), C = null;
    if (keepColor) C = new Float32Array(total * 3);
    var matList = [], off = 0;
    var groups = [];
    for (i = 0; i < prepped.length; i++) {
      var g2 = prepped[i][0], mat = prepped[i][1];
      var cnt = g2.attributes.position.count;
      if (!cnt) continue;
      P.set(g2.attributes.position.array, off * 3);
      N.set(g2.attributes.normal.array, off * 3);
      U.set(g2.attributes.uv.array, off * 2);
      if (keepColor) {
        var ca = g2.attributes.color;
        if (ca) C.set(ca.array, off * 3);
        else for (j = 0; j < cnt; j++) { C[(off + j) * 3] = 1; C[(off + j) * 3 + 1] = 1; C[(off + j) * 3 + 2] = 1; }
      }
      var mi = matList.indexOf(mat);
      if (mi < 0) { mi = matList.length; matList.push(mat); }
      groups.push([off, cnt, mi]);
      off += cnt;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    if (keepColor) geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    for (i = 0; i < groups.length; i++) geo.addGroup(groups[i][0], groups[i][1], groups[i][2]);
    geo.computeBoundingSphere();
    return { geo: geo, mats: matList };
  }

  /* --------------------------------------------------------------- scenery sets */
  function scenery(name, keepColor) {
    var p = proto('scenery', name);
    return p ? mergeNode(p, !!keepColor) : null;
  }

  /* merge several scenery nodes (each with its own material) into one
     instanced set, e.g. a palm crown plus its clusters of coconuts */
  function sceneryGroup(names, file, keepColor) {
    file = file || 'scenery';
    var g = new THREE.Group(), any = false;
    for (var i = 0; i < names.length; i++) {
      var n = node(file, names[i]);
      if (n) { g.add(n); any = true; }
    }
    if (!any) return null;
    g.updateMatrixWorld(true);
    return mergeNode(g, !!keepColor);
  }

  function elephant(scale) {
    var body = node('scenery', 'ElephantBody');
    var tusks = node('scenery', 'ElephantTusks');
    if (!body) return null;
    var g = new THREE.Group();
    g.add(body);
    if (tusks) g.add(tusks);
    var legs = [];
    var pos = [[0.62, 1.15], [-0.62, 1.15], [0.62, -1.05], [-0.62, -1.05]];
    for (var i = 0; i < 4; i++) {
      var pivot = new THREE.Group();
      pivot.position.set(pos[i][0], 1.72, pos[i][1]);
      var l = node('scenery', 'ElephantLeg');
      if (!l) break;
      pivot.add(l);
      g.add(pivot);
      legs.push(pivot);
    }
    g.userData.legs = legs;
    g.scale.setScalar(scale || 1);
    return g;
  }

  /* ------------------------------------------------------------ traffic vehicles */
  var VDEF = {
    Sedan: { wnode: 'Wheel_Sedan', wr: 0.34, pos: [[0.86, 1.32], [-0.86, 1.32], [0.86, -1.32], [-0.86, -1.32]], paint: 0x2563eb },
    SUV: { wnode: 'Wheel_SUV', wr: 0.38, pos: [[0.90, 1.36], [-0.90, 1.36], [0.90, -1.36], [-0.90, -1.36]], paint: 0x334155 },
    Hatch: { wnode: 'Wheel_Hatch', wr: 0.33, pos: [[0.82, 1.20], [-0.82, 1.20], [0.82, -1.20], [-0.82, -1.20]], paint: 0xc0392b },
    Police: { wnode: 'Wheel_Police', wr: 0.34, pos: [[0.86, 1.32], [-0.86, 1.32], [0.86, -1.32], [-0.86, -1.32]], paint: 0xf1f5f9, beacons: ['Police_bl', 'Police_br'] },
    Van: { wnode: 'Wheel_Van', wr: 0.37, pos: [[0.94, 1.35], [-0.94, 1.35], [0.94, -1.45], [-0.94, -1.45]], paint: 0xe2e8f0 }
  };
  var VDEF_SPLIT = {
    Tuk: { front: ['Wheel_TukF', 0.24, [[0, 0.92]]], rear: ['Wheel_TukR', 0.24, [[0.56, -0.86], [-0.56, -0.86]]], paint: 0xf2c022 },
    Bike: { front: ['Wheel_BikeF', 0.31, [[0, 0.68]]], rear: ['Wheel_BikeR', 0.31, [[0, -0.68]]], paint: 0x1d4ed8 },
    Truck: { front: ['Wheel_TruckF', 0.50, [[1.18, 2.35], [-1.18, 2.35]]], rear: ['Wheel_TruckR', 0.50, [[1.16, -2.05], [-1.16, -2.05]]], paint: 0x1e40af }
  };
  var CAR_STYLES = ['Sedan', 'SUV', 'Hatch'];
  var styleIdx = 0;

  var AUTO_PAINT = [0xf2f3f5, 0x1f2937, 0x9aa3ad, 0xb91c1c, 0x1d4ed8, 0x166534, 0x7c2d12, 0x0e7490, 0x4b5563, 0xd6d3cd];

  function buildTrafficVehicle(kind, col, opts) {
    if (!A.ready || !A.gltf.vehicles) return null;
    opts = opts || {};
    var name = null, def = null, split = null;
    if (kind === 'car') { name = opts.style || CAR_STYLES[(styleIdx++) % 3]; def = VDEF[name]; }
    else if (kind === 'police') { name = 'Police'; def = VDEF[name]; }
    else if (kind === 'van') { name = 'Van'; def = VDEF[name]; }
    else if (kind === 'tuk') { name = 'Tuk'; split = VDEF_SPLIT[name]; }
    else if (kind === 'bike') { name = 'Bike'; split = VDEF_SPLIT[name]; }
    else if (kind === 'truck' || kind === 'lorry') { name = 'Truck'; split = VDEF_SPLIT[name]; }
    if (!name) return null;

    var root = node('vehicles', name);
    if (!root) return null;
    var wheels = [];

    function mount(wnode, wr, pos) {
      var src = proto('vehicles', wnode);
      if (!src) return;
      for (var i = 0; i < pos.length; i++) {
        var holder = new THREE.Group();
        holder.position.set(pos[i][0], wr, pos[i][1]);
        var spin = src.clone(true);
        spin.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        holder.add(spin);
        root.add(holder);
        wheels.push({ grp: holder, spin: spin, r: wr });
      }
    }
    if (def) mount(def.wnode, def.wr, def.pos);
    else if (split) { mount(split.front[0], split.front[1], split.front[2]); mount(split.rear[0], split.rear[1], split.rear[2]); }

    /* per-instance paint */
    var paintHex = (col !== undefined && col !== null) ? col : (def ? def.paint : (split ? split.paint : 0x2563eb));
    var pm = matOf(root, name + '_paint');
    if (pm) {
      pm.color.setHex(paintHex);
      pm.metalness = 0.42; pm.roughness = 0.22;
      pm.envMapIntensity = 1.35;
    }
    var gm = matOf(root, name + '_glass');
    if (gm) { gm.opacity = 0.62; gm.envMapIntensity = 1.6; }
    var cm = matOf(root, name + '_chrome');
    if (cm) cm.envMapIntensity = 1.8;

    var ud = {
      wheels: wheels,
      hlMat: matOf(root, name + '_head'),
      tailMat: matOf(root, name + '_tail'),
      blinkLMat: matOf(root, name + '_bl'),
      blinkRMat: matOf(root, name + '_br'),
      policeBeacons: null
    };
    if (def && def.beacons) ud.policeBeacons = [matOf(root, def.beacons[0]), matOf(root, def.beacons[1])];
    root.userData = ud;
    return root;
  }

  /* --------------------------------------------------------------- coach shells */
  function coachShell(modelId) {
    if (!A.ready) return null;
    var file = 'bus_' + (BUS_LEN[modelId] ? modelId : 'metro');
    var src = sceneOf(file);
    var root = src ? src.clone(true) : null;
    if (!root) return null;
    root.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        if (o.material) o.material = o.material.clone();
      }
    });
    return root;
  }

  global.WORLD_MODELS = {
    load: load,
    ready: function () { return A.ready; },
    assets: A,
    tex: function (k) { return A.tex[k]; },
    texFiles: TEX_FILES,
    modelFiles: MODEL_FILES,
    busLength: BUS_LEN,
    proto: proto,
    node: node,
    matOf: matOf,
    meshesNamed: meshesNamed,
    mergeNode: mergeNode,
    scenery: scenery,
    sceneryGroup: sceneryGroup,
    elephant: elephant,
    buildTrafficVehicle: buildTrafficVehicle,
    coachShell: coachShell,
    autoPaint: AUTO_PAINT
  };
})(window);
