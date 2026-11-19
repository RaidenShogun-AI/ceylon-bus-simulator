/**
 * World Bus Simulator 3.0 — Next-Gen Sculpted 3D Fleet & Traffic Vehicle Engine
 * Multi-variant ExtrudeGeometry coaches (Colombo Metro AC, Viking, Yutong Express,
 * BYD/Sovereign Electro), 3D glass cockpit MFD, sculpted sedans/hatchbacks/SUVs,
 * Sri Lankan Bajaj RE three-wheelers, sport bikes, cab-over lorries & Police interceptors.
 */
(function (global) {
  'use strict';

  const CATALOG = {
    metro: {
      id: 'metro',
      name: 'Colombo Metro AC Low-Floor',
      shortName: 'Colombo Metro AC',
      tag: 'CITY BRT',
      lengthM: 12.1,
      widthM: 2.52,
      heightM: 3.30,
      floorY: 0.38,
      roofY: 3.30,
      wheelF: 3.85,
      wheelR: -2.65,
      wheelR_m: 0.52,
      eyePos: [-0.46, 2.12, 5.28],
      lookPos: [-0.30, 1.48, 16],
      bumperPos: [0, 1.05, 6.08],
      powerKw: 225,
      massKg: 13800,
      maxSpeedKmh: 92,
      gears: 6,
      autoDefault: true,
      hasDualDoors: true,
      electric: false,
      capacity: 56,
      desc: 'Kneeling low-floor AC metro liner with split panoramic glass, roof AC pod & pneumatic twin doors.'
    },
    viking: {
      id: 'viking',
      name: 'Ashok Leyland Viking 222',
      shortName: 'Leyland Viking',
      tag: 'CLASSIC SRI LANKA',
      lengthM: 11.1,
      widthM: 2.50,
      heightM: 3.28,
      floorY: 0.85,
      roofY: 3.28,
      wheelF: 3.60,
      wheelR: -2.54,
      wheelR_m: 0.56,
      eyePos: [-0.45, 2.22, 4.72],
      lookPos: [-0.32, 1.45, 14],
      bumperPos: [0, 1.15, 5.55],
      powerKw: 155,
      massKg: 14200,
      maxSpeedKmh: 105,
      gears: 5,
      autoDefault: false,
      hasDualDoors: false,
      electric: false,
      capacity: 52,
      desc: 'Authentic Sri Lankan intercity workhorse with rooftop luggage carrier, brass air horns & 5-spd synchromesh.'
    },
    express: {
      id: 'express',
      name: 'Yutong ZK6128H Highway Coach',
      shortName: 'Yutong Express Coach',
      tag: 'EXPRESSWAY VIP',
      lengthM: 12.4,
      widthM: 2.55,
      heightM: 3.72,
      floorY: 1.18,
      roofY: 3.72,
      wheelF: 3.95,
      wheelR: -2.75,
      wheelR_m: 0.56,
      eyePos: [-0.48, 2.54, 5.48],
      lookPos: [-0.30, 1.65, 18],
      bumperPos: [0, 1.15, 6.24],
      powerKw: 295,
      massKg: 16200,
      maxSpeedKmh: 120,
      gears: 6,
      autoDefault: true,
      hasDualDoors: false,
      electric: false,
      capacity: 54,
      desc: 'High-deck grand touring expressway liner with aero sloped nose, Allison 6-spd automatic & retarder.'
    },
    electro: {
      id: 'electro',
      name: 'BYD / Sovereign K9S EV Coach',
      shortName: 'Sovereign Electro EV',
      tag: 'ZERO-EMISSION EV',
      lengthM: 12.2,
      widthM: 2.54,
      heightM: 3.45,
      floorY: 0.55,
      roofY: 3.45,
      wheelF: 3.90,
      wheelR: -2.70,
      wheelR_m: 0.54,
      eyePos: [-0.46, 2.24, 5.40],
      lookPos: [-0.30, 1.52, 16],
      bumperPos: [0, 1.08, 6.14],
      powerKw: 325,
      massKg: 15400,
      maxSpeedKmh: 115,
      gears: 2,
      autoDefault: true,
      hasDualDoors: true,
      electric: true,
      capacity: 52,
      desc: 'Dual hub-motor EV cruiser with sculpted roof battery pods, instant torque & regenerative braking.'
    }
  };

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function makeTex(canvas, repeat) {
    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // Merge BufferGeometries grouped by material to cut draw calls cleanly
  function mergeParts(parent, parts, shadow) {
    const groups = new Map();
    for (const p of parts) {
      if (!p || !p.g || !p.m) continue;
      let list = groups.get(p.m);
      if (!list) {
        list = [];
        groups.set(p.m, list);
      }
      list.push(p.g);
    }
    groups.forEach((geos, mat) => {
      const nonIdx = [];
      let totalVerts = 0;
      for (const raw of geos) {
        const g = raw.index ? raw.toNonIndexed() : raw;
        if (!g.attributes.normal) g.computeVertexNormals();
        const pos = g.attributes.position;
        if (!pos || pos.count === 0) continue;
        if (!g.attributes.uv) {
          g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2));
        }
        nonIdx.push(g);
        totalVerts += pos.count;
      }
      if (!totalVerts) return;
      const posArr = new Float32Array(totalVerts * 3);
      const normArr = new Float32Array(totalVerts * 3);
      const uvArr = new Float32Array(totalVerts * 2);
      let off3 = 0, off2 = 0;
      for (const g of nonIdx) {
        const pA = g.attributes.position.array;
        const nA = g.attributes.normal.array;
        const uA = g.attributes.uv.array;
        posArr.set(pA, off3);
        normArr.set(nA, off3);
        uvArr.set(uA, off2);
        off3 += pA.length;
        off2 += uA.length;
      }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
      merged.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
      const mesh = new THREE.Mesh(merged, mat);
      if (shadow) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      parent.add(mesh);
    });
  }

  // Create sculpted ExtrudeGeometry along vehicle X-width from a (Z, Y) side silhouette polygon
  function sideExtrude(ptsZY, widthX, bevel) {
    const sh = new THREE.Shape();
    sh.moveTo(ptsZY[0][0], ptsZY[0][1]);
    for (let i = 1; i < ptsZY.length; i++) sh.lineTo(ptsZY[i][0], ptsZY[i][1]);
    sh.closePath();
    const bev = bevel || 0.04;
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: Math.max(0.05, widthX - bev * 2),
      bevelEnabled: bev > 0,
      bevelThickness: bev,
      bevelSize: bev * 0.7,
      bevelSegments: 2,
      curveSegments: 8
    });
    // Extrude is in XY along +Z; rotate so Shape.x -> world Z and Extrude depth -> centered X
    g.translate(0, 0, -(widthX - bev * 2) * 0.5);
    g.rotateY(-Math.PI * 0.5);
    g.computeVertexNormals();
    return g;
  }

  // Box helper
  function bx(w, h, d, x, y, z) {
    return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  }

  function cyl(rt, rb, h, seg, x, y, z, rx, ry, rz) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg || 14);
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    if (rz) g.rotateZ(rz);
    return g.translate(x, y, z);
  }

  function createLedMatrix(routeNum, destText, accentHex) {
    const c = makeCanvas(512, 96);
    const g = c.getContext('2d');
    function draw(txtTop, txtBot, customAccent) {
      g.fillStyle = '#05080d';
      g.fillRect(0, 0, 512, 96);
      // Subtle dot matrix grid
      g.fillStyle = 'rgba(255,255,255,0.03)';
      for (let x = 0; x < 512; x += 6) g.fillRect(x, 0, 2, 96);
      g.fillStyle = customAccent || accentHex || '#f59e0b';
      g.fillRect(6, 8, 126, 80);
      g.fillStyle = '#05080d';
      g.font = '900 48px "Inter", Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(txtTop || '138').slice(0, 6), 69, 50);

      g.fillStyle = customAccent || accentHex || '#fde047';
      g.font = '800 32px "Inter", Arial, sans-serif';
      g.textAlign = 'left';
      g.fillText(String(txtBot || 'PETTAH - HOMAGAMA').slice(0, 24), 146, 48, 356);
    }
    draw(routeNum, destText, accentHex);
    const tex = makeTex(c, false);
    tex.anisotropy = 4;
    return { canvas: c, tex, update: (n, d, a) => { draw(n, d, a); tex.needsUpdate = true; } };
  }

  function createCockpitMFD(spec) {
    const c = makeCanvas(512, 256);
    const g = c.getContext('2d');
    function update(st) {
      st = st || {};
      const kmh = Math.round(st.kmh || 0);
      const lim = Math.round(st.limitKmh || 50);
      const over = kmh > lim + 2;
      g.fillStyle = '#060c18';
      g.fillRect(0, 0, 512, 256);
      g.strokeStyle = over ? '#ef4444' : '#38bdf8';
      g.lineWidth = 4;
      g.strokeRect(4, 4, 504, 248);

      // Speedometer arc
      const frac = Math.min(1, kmh / (spec.maxSpeedKmh || 110));
      g.lineWidth = 14;
      g.strokeStyle = '#1e293b';
      g.beginPath(); g.arc(128, 134, 82, Math.PI * 0.78, Math.PI * 2.22); g.stroke();
      g.strokeStyle = over ? '#ef4444' : (spec.electric ? '#22d3ee' : '#38bdf8');
      g.beginPath(); g.arc(128, 134, 82, Math.PI * 0.78, Math.PI * (0.78 + frac * 1.44)); g.stroke();

      g.fillStyle = over ? '#f87171' : '#ffffff';
      g.font = '900 54px "Inter", Arial, sans-serif';
      g.textAlign = 'center';
      g.fillText(String(kmh), 128, 144);
      g.fillStyle = '#94a3b8';
      g.font = '700 18px Arial';
      g.fillText('KM/H · GEAR ' + (st.gear || 'N'), 128, 186);

      // Speed limit sign icon on MFD
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(246, 56, 28, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#dc2626';
      g.lineWidth = 7;
      g.beginPath(); g.arc(246, 56, 25, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#0f172a';
      g.font = '900 24px Arial';
      g.fillText(String(lim), 246, 64);

      // Right telemetry column
      g.textAlign = 'left';
      g.fillStyle = '#38bdf8';
      g.font = '800 19px Arial';
      g.fillText('NEXT: ' + String(st.nextHalt || 'TERMINAL').slice(0, 17), 288, 52);
      g.fillStyle = '#4ade80';
      g.font = '800 22px Arial';
      g.fillText((spec.electric ? 'SOC: ' : 'FUEL: ') + Math.round(st.fuelPct || 96) + '%', 288, 98);
      g.fillStyle = (st.airPsi || 115) < 75 ? '#ef4444' : '#f8fafc';
      g.fillText('AIR: ' + Math.round(st.airPsi || 116) + ' PSI', 288, 134);
      g.fillStyle = '#fde047';
      g.fillText('PAX: ' + (st.pax || 0) + '/' + (spec.capacity || 52), 288, 170);

      // Indicator & Status pills
      const drawPill = (x, y, w, label, on, bg) => {
        g.fillStyle = on ? bg : '#1e293b';
        g.fillRect(x, y, w, 32);
        g.fillStyle = on ? '#05080d' : '#64748b';
        g.font = '900 16px Arial';
        g.textAlign = 'center';
        g.fillText(label, x + w * 0.5, y + 22);
      };
      drawPill(288, 198, 58, '◀ L', (st.blinkL || st.hazard) && st.blinkOn, '#4ade80');
      drawPill(352, 198, 66, 'DOOR', !!st.doorsOpen, '#f59e0b');
      drawPill(424, 198, 72, 'R ▶', (st.blinkR || st.hazard) && st.blinkOn, '#4ade80');
    }
    update({ kmh: 0, limitKmh: 50, fuelPct: 98, airPsi: 118 });
    const tex = makeTex(c, false);
    return { canvas: c, tex, update: (st) => { update(st); tex.needsUpdate = true; } };
  }

  // Detailed ventilated alloy / steel wheel with rotor & brake caliper inside non-spinning carrier
  function buildCoachWheel(r, isSteer, isDriveDual, caliperHex) {
    const group = new THREE.Group();
    const spin = new THREE.Group();
    const tireW = isDriveDual ? 0.44 : 0.31;
    const parts = [];

    /* four material groups keep a full 3D wheel down to three draw calls */
    const mTire = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.88, metalness: 0.08 });
    const mSide = mTire;
    const mRim = new THREE.MeshStandardMaterial({ color: 0xd8e0ea, roughness: 0.24, metalness: 0.82 });
    const mDarkRim = new THREE.MeshStandardMaterial({ color: 0x2e3642, roughness: 0.42, metalness: 0.58 });
    const mDisc = mDarkRim;

    // Sculpted tire barrel & curved shoulder walls
    parts.push({ g: cyl(r, r, tireW, 24, 0, 0, 0, 0, 0, Math.PI * 0.5), m: mTire });
    parts.push({ g: cyl(r * 0.94, r * 0.62, tireW + 0.03, 24, 0, 0, 0, 0, 0, Math.PI * 0.5), m: mSide });
    // Dish rim + inner dark well
    parts.push({ g: cyl(r * 0.60, r * 0.60, tireW + 0.04, 22, 0, 0, 0, 0, 0, Math.PI * 0.5), m: mDarkRim });
    parts.push({ g: cyl(r * 0.56, r * 0.56, 0.06, 22, (tireW * 0.48), 0, 0, 0, 0, Math.PI * 0.5), m: mRim });
    parts.push({ g: cyl(r * 0.56, r * 0.56, 0.06, 22, -(tireW * 0.48), 0, 0, 0, 0, Math.PI * 0.5), m: mRim });
    // Center hub + lug bolt ring (visible from both left and right mounts!)
    for (const sx of [-1, 1]) {
      const xFace = sx * (tireW * 0.50);
      parts.push({ g: cyl(r * 0.20, r * 0.24, 0.09, 14, xFace, 0, 0, 0, 0, Math.PI * 0.5), m: mRim });
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const gSpk = bx(0.035, r * 0.30, 0.048, xFace + sx * 0.02, r * 0.36, 0);
        gSpk.rotateX(ang);
        parts.push({ g: gSpk, m: mRim });
        const lug = cyl(0.018, 0.018, 0.05, 8, xFace + sx * 0.03, Math.sin(ang) * r * 0.27, Math.cos(ang) * r * 0.27, 0, 0, Math.PI * 0.5);
        parts.push({ g: lug, m: mRim });
      }
      // Brake disc inside wheel
      parts.push({ g: cyl(r * 0.43, r * 0.43, 0.04, 20, xFace * 0.55, 0, 0, 0, 0, Math.PI * 0.5), m: mDisc });
    }
    mergeParts(spin, parts, true);

    // Non-spinning painted brake caliper
    const mCal = new THREE.MeshStandardMaterial({ color: caliperHex || 0xdc2626, roughness: 0.35, metalness: 0.45 });
    const cal = new THREE.Mesh(bx(tireW * 0.55, r * 0.28, r * 0.24, 0, r * 0.28, r * 0.28), mCal);
    group.add(cal);
    group.add(spin);
    return { group, spin, steer: !!isSteer, r };
  }

  function createSideTexture(modelId, livery, routeObj) {
    const c = makeCanvas(1024, 256);
    const g = c.getContext('2d');
    const colBase = (livery && livery.base) || (modelId === 'metro' ? '#0f4c81' : modelId === 'electro' ? '#102542' : '#f1f5f9');
    const colAcc = (livery && livery.accent) || (modelId === 'metro' ? '#f59e0b' : modelId === 'electro' ? '#22d3ee' : '#2563eb');
    const title = modelId === 'electro' ? 'SOVEREIGN ELECTRO EV' : modelId === 'metro' ? ('COLOMBO METRO ' + ((routeObj && routeObj.num) || '138')) : 'WORLD EXPRESS LINER';

    const grad = g.createLinearGradient(0, 0, 1024, 256);
    grad.addColorStop(0, colBase);
    grad.addColorStop(1, '#0b1322');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 256);

    // Swoosh & graphic stripes
    g.fillStyle = colAcc;
    g.beginPath();
    g.moveTo(0, 185); g.lineTo(1024, 145); g.lineTo(1024, 178); g.lineTo(0, 212);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.86)';
    g.beginPath();
    g.moveTo(0, 214); g.lineTo(1024, 180); g.lineTo(1024, 192); g.lineTo(0, 224);
    g.closePath(); g.fill();

    g.fillStyle = '#ffffff';
    g.font = '900 42px "Inter", Arial, sans-serif';
    g.fillText(title, 54, 118);
    g.fillStyle = colAcc;
    g.font = '800 22px "Inter", Arial, sans-serif';
    g.fillText((routeObj && routeObj.shortName ? routeObj.shortName.toUpperCase() : 'WORLD TRANSIT · AC LUXURY'), 56, 152);

    const t = makeTex(c, false);
    t.anisotropy = 4;
    return t;
  }

  function liveryFromCfg(cfg, modelId) {
    const rgb = (cfg && cfg.rgb) || [1, 1, 1];
    // Identify named livery from rgb
    if (rgb[0] > 1.2 && rgb[1] < 0.45) return { base: '#b91c1c', accent: '#fde047', hex: 0xc81e1e, trimHex: 0xfde047 }; // SLTB
    if (rgb[2] > 1.2 && rgb[0] < 0.9) return { base: '#3b0764', accent: '#a855f7', hex: 0x4c1d95, trimHex: 0xc084fc }; // Raiden
    if (rgb[0] > 1.2 && rgb[2] > 0.7) return { base: '#831843', accent: '#f9a8d4', hex: 0x9d174d, trimHex: 0xf472b6 }; // Miko
    if (rgb[1] > 1.05 && rgb[0] < 0.4) return { base: '#065f46', accent: '#34d399', hex: 0x047857, trimHex: 0x34d399 }; // Emerald
    if (rgb[0] > 1.2 && rgb[1] > 0.9) return { base: '#92400e', accent: '#facc15', hex: 0xb45309, trimHex: 0xfbbf24 }; // Gold
    if (modelId === 'metro') return { base: '#0c4a6e', accent: '#f59e0b', hex: 0x0369a1, trimHex: 0xf59e0b };
    if (modelId === 'electro') return { base: '#0f172a', accent: '#22d3ee', hex: 0x0f2544, trimHex: 0x06b6d4 };
    if (modelId === 'express') return { base: '#1e293b', accent: '#38bdf8', hex: 0x1e3a5f, trimHex: 0x38bdf8 };
    return { base: '#e2e8f0', accent: '#2563eb', hex: 0xdce5f2, trimHex: 0x2563eb };
  }

  function buildMonocoqueBus(modelId, cfg, routeObj) {
    const spec = CATALOG[modelId] || CATALOG.metro;
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    root.add(tilt);

    const liv = liveryFromCfg(cfg, modelId);
    const L = spec.lengthM, hL = L * 0.5;
    const W = spec.widthM, hW = W * 0.5;
    const floorY = spec.floorY, roofY = spec.roofY;
    const winBot = floorY + 0.88, winTop = roofY - 0.34;
    const isExpr = modelId === 'express';
    const isElec = modelId === 'electro';
    const rRake = isExpr ? 0.42 : isElec ? 0.36 : 0.24;

    const sideTex = createSideTexture(modelId, liv, routeObj);
    const mBody = new THREE.MeshStandardMaterial({ color: liv.hex, roughness: 0.28, metalness: 0.35, envMapIntensity: 1.25 });
    const mSidePanel = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.28, metalness: 0.30, envMapIntensity: 1.2 });
    const mAccent = new THREE.MeshStandardMaterial({ color: liv.trimHex, roughness: 0.30, metalness: 0.45, envMapIntensity: 1.3 });
    const mSkirt = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.72, metalness: 0.20 });
    const mChrome = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.14, metalness: 0.94, envMapIntensity: 1.6 });
    const mBlackMask = new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.22, metalness: 0.50 });
    const mRoof = new THREE.MeshStandardMaterial({ color: (cfg && cfg.roof) || 0xdbe2ea, roughness: 0.52, metalness: 0.18 });
    const mGlass = new THREE.MeshPhysicalMaterial({ color: 0x0a1c2e, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.48, depthWrite: false, envMapIntensity: 1.5 });
    const mFrontGlass = new THREE.MeshPhysicalMaterial({ color: 0x99d5ff, roughness: 0.06, metalness: 0.08, transparent: true, opacity: 0.15, depthWrite: false });
    const mFloor = new THREE.MeshStandardMaterial({ color: 0x262c36, roughness: 0.90 });
    const mSeat = new THREE.MeshStandardMaterial({ color: isElec ? 0x0284c7 : isExpr ? 0x7c2d12 : 0x1d4ed8, roughness: 0.72 });
    const cabinMat = new THREE.MeshBasicMaterial({ color: 0xcfcabc });

    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3cc, emissiveIntensity: 0.65, roughness: 0.1 });
    const drlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: isElec ? 0x22d3ee : 0xf0f9ff, emissiveIntensity: 1.6, roughness: 0.1 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.5, roughness: 0.18 });
    const fogMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.25, roughness: 0.15 });
    const blinkLMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.12 });
    const blinkRMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.12 });
    const markA = blinkLMat;
    const markR = tailMat;

    const parts = [];

    // 1. Sculpted monocoque lower hull + aerodynamic front/rear nose contour (ExtrudeGeometry)
    const hullPoly = [
      [-hL + 0.14, 0.34],
      [-hL + 0.02, 0.62],
      [-hL + 0.06, winBot],
      [-hL + 0.20, floorY + 0.08],
      [hL - rRake - 0.15, winBot],
      [hL - 0.06, 0.95],
      [hL - 0.02, 0.58],
      [hL - 0.14, 0.32],
      [spec.wheelF + 0.72, 0.32],
      [spec.wheelF + 0.52, spec.wheelR_m * 1.48],
      [spec.wheelF - 0.52, spec.wheelR_m * 1.48],
      [spec.wheelF - 0.72, 0.32],
      [spec.wheelR + 0.76, 0.32],
      [spec.wheelR + 0.56, spec.wheelR_m * 1.48],
      [spec.wheelR - 0.56, spec.wheelR_m * 1.48],
      [spec.wheelR - 0.76, 0.32]
    ];
    parts.push({ g: sideExtrude(hullPoly, W - 0.04, 0.05), m: mBody });

    // Lower matte black aerodynamic rocker skirt & flared wheel arches
    parts.push({ g: bx(W + 0.02, 0.22, L - 0.24, 0, 0.42, 0), m: mSkirt });
    parts.push({ g: bx(W + 0.03, 0.06, L - 0.28, 0, winBot - 0.04, -0.04), m: mAccent });

    // Textured left/right livery side decals
    for (const s of [-1, 1]) {
      const sg = new THREE.PlaneGeometry(L - 0.6, winBot - 0.44);
      if (s > 0) sg.rotateY(Math.PI * 0.5);
      else sg.rotateY(-Math.PI * 0.5);
      sg.translate(s * (hW + 0.008), (winBot + 0.44) * 0.5, 0);
      parts.push({ g: sg, m: mSidePanel });
    }

    // 2. Sculpted sloped roof crown, cantilevered windshield header & upper body frame
    const crownPoly = [
      [-hL + 0.18, winTop - 0.04],
      [-hL + 0.08, roofY - 0.14],
      [-hL + 0.30, roofY],
      [hL - rRake - 0.45, roofY],
      [hL - rRake - 0.08, roofY - 0.16],
      [hL - rRake + 0.04, winTop - 0.05]
    ];
    parts.push({ g: sideExtrude(crownPoly, W - 0.02, 0.04), m: mRoof });
    parts.push({ g: bx(W + 0.01, 0.12, L - 0.65, 0, roofY - 0.09, -rRake * 0.5), m: mAccent });

    // Structural Pillars (A, B, C, D, Rear corner masks)
    const pZ = [-hL + 0.12, -hL + 1.6, -2.5, -0.2, 2.0, hL - rRake - 0.15];
    for (const zP of pZ) {
      parts.push({ g: bx(0.11, winTop - winBot + 0.08, 0.16, hW - 0.04, (winBot + winTop) * 0.5, zP), m: mBlackMask });
      parts.push({ g: bx(0.11, winTop - winBot + 0.08, 0.16, -hW + 0.04, (winBot + winTop) * 0.5, zP), m: mBlackMask });
    }
    // Front A-pillars tilted along windshield rake
    for (const s of [-1, 1]) {
      const aPil = bx(0.11, winTop - winBot + 0.16, 0.16, 0, 0, 0);
      aPil.rotateX(-Math.atan2(rRake, winTop - winBot));
      aPil.translate(s * (hW - 0.04), (winBot + winTop) * 0.5, hL - rRake * 0.5);
      parts.push({ g: aPil, m: mBlackMask });
    }

    // 3. Sculpted Front Fascia: Chrome/Satin Grille, Chin Splitter, Quad Projector Optics & DRLs
    parts.push({ g: bx(W - 0.06, 0.42, 0.20, 0, 0.58, hL - 0.02), m: mSkirt });
    parts.push({ g: bx(W - 0.14, 0.07, 0.24, 0, 0.34, hL + 0.01), m: mAccent });
    // Center glossy mask & horizontal chrome slats
    parts.push({ g: bx(1.56, winBot - 0.72, 0.08, 0, (winBot + 0.74) * 0.5, hL - 0.01), m: mBlackMask });
    for (let sl = 0; sl < (isElec ? 2 : 4); sl++) {
      parts.push({ g: bx(1.36, 0.036, 0.05, 0, 0.74 + sl * 0.12, hL + 0.02), m: isElec ? mAccent : mChrome });
    }
    // Chrome Badge Emblem
    parts.push({ g: cyl(0.10, 0.10, 0.04, 16, 0, winBot - 0.14, hL + 0.03, Math.PI * 0.5), m: isElec ? mAccent : mChrome });

    // Front projector housings, quad LED headlamps, angular DRLs, fogs & corner blinkers
    for (const s of [-1, 1]) {
      parts.push({ g: bx(0.46, 0.22, 0.08, s * (hW - 0.31), 0.78, hL - 0.01), m: mBlackMask });
      parts.push({ g: cyl(0.065, 0.065, 0.05, 14, s * (hW - 0.25), 0.79, hL + 0.02, Math.PI * 0.5), m: hlMat });
      parts.push({ g: cyl(0.055, 0.055, 0.05, 14, s * (hW - 0.40), 0.79, hL + 0.02, Math.PI * 0.5), m: hlMat });
      // Sleek DRL eyebrow blade
      parts.push({ g: bx(0.44, 0.032, 0.06, s * (hW - 0.31), 0.90, hL + 0.01), m: drlMat });
      // Corner blinker
      parts.push({ g: bx(0.08, 0.15, 0.12, s * (hW - 0.04), 0.80, hL - 0.06), m: s > 0 ? blinkLMat : blinkRMat });
      // Lower bumper fog lamp
      parts.push({ g: cyl(0.062, 0.062, 0.05, 12, s * (hW - 0.34), 0.50, hL + 0.03, Math.PI * 0.5), m: fogMat });
    }

    // 4. Sculpted Rear Engine Louvres, Diffuser, Twin Chrome Exhausts (or EV Blue Diffuser) & Vertical Taillight Stacks
    parts.push({ g: bx(W - 0.12, 0.44, 0.14, 0, 0.56, -hL - 0.01), m: mSkirt });
    parts.push({ g: bx(W - 0.65, winBot - 0.65, 0.06, 0, (winBot + 0.68) * 0.5, -hL - 0.02), m: mBlackMask });
    for (let lv = 0; lv < 5; lv++) {
      parts.push({ g: bx(1.42, 0.03, 0.04, 0, 0.82 + lv * 0.12, -hL - 0.03), m: mChrome });
    }
    if (!isElec) {
      parts.push({ g: cyl(0.06, 0.065, 0.28, 12, hW - 0.38, 0.36, -hL - 0.05, Math.PI * 0.5), m: mChrome });
      parts.push({ g: cyl(0.06, 0.065, 0.28, 12, hW - 0.54, 0.36, -hL - 0.05, Math.PI * 0.5), m: mChrome });
    } else {
      parts.push({ g: bx(1.7, 0.05, 0.06, 0, 0.40, -hL - 0.06), m: drlMat });
    }
    for (const s of [-1, 1]) {
      parts.push({ g: bx(0.18, 0.68, 0.07, s * (hW - 0.15), 1.06, -hL - 0.02), m: tailMat });
      parts.push({ g: bx(0.14, 0.18, 0.08, s * (hW - 0.15), 0.72, -hL - 0.025), m: s > 0 ? blinkLMat : blinkRMat });
      // Upper corner roof marker lights
      parts.push({ g: bx(0.14, 0.07, 0.07, s * (hW - 0.16), roofY - 0.07, hL - rRake - 0.12), m: drlMat });
      parts.push({ g: bx(0.14, 0.07, 0.07, s * (hW - 0.16), roofY - 0.07, -hL + 0.14), m: tailMat });
    }

    // 5. Roof Aero Pods (AC Condenser / Battery Packs), Shark-Fin Antenna & DUAL CHROME ROOF AIR HORNS!
    if (isElec) {
      parts.push({ g: bx(1.78, 0.32, 6.2, 0, roofY + 0.14, 0.1), m: mBody });
      parts.push({ g: bx(1.82, 0.05, 6.0, 0, roofY + 0.28, 0.1), m: mAccent });
    } else {
      parts.push({ g: bx(1.88, 0.28, 4.4, 0, roofY + 0.13, -0.5), m: mRoof });
      parts.push({ g: bx(1.60, 0.04, 3.8, 0, roofY + 0.28, -0.5), m: mSkirt });
    }
    // Dual sculpted chrome air-horn trumpets on the front roof crown
    for (const sx of [-0.62, -0.46, 0.46, 0.62]) {
      parts.push({ g: cyl(0.055, 0.022, 0.56, 12, sx, roofY + 0.09, hL - rRake - 0.75, Math.PI * 0.5), m: mChrome });
      parts.push({ g: cyl(0.026, 0.026, 0.08, 8, sx, roofY + 0.03, hL - rRake - 0.85), m: mSkirt });
    }
    // Shark-fin GPS antenna
    parts.push({ g: bx(0.08, 0.18, 0.34, 0, roofY + 0.09, -hL + 1.2), m: mBlackMask });

    // 6. Dual-arm Articulated Panoramic Wing Mirrors
    for (const s of [-1, 1]) {
      const mOut = s * (hW + 0.28);
      parts.push({ g: bx(0.28, 0.04, 0.05, s * (hW + 0.14), winTop - 0.22, hL - rRake + 0.08), m: mBlackMask });
      parts.push({ g: bx(0.06, 0.04, 0.42, mOut, winTop - 0.32, hL - rRake + 0.22), m: mBlackMask });
      parts.push({ g: bx(0.11, 0.36, 0.14, mOut, winTop - 0.45, hL - rRake + 0.26), m: mBody });
      parts.push({ g: bx(0.09, 0.30, 0.02, mOut, winTop - 0.45, hL - rRake + 0.18), m: mChrome });
    }

    // 7. Interior Floor, Dashboard Binnacle, Steering Column, 2x2 Ergonomic Seats, Grab Rails & Driver Partition
    parts.push({ g: bx(W - 0.14, 0.06, L - 0.55, 0, floorY, 0), m: mFloor });
    // Center ceiling cove lighting
    parts.push({ g: bx(0.55, 0.04, L - 1.4, 0, roofY - 0.18, -0.2), m: cabinMat });
    // Passenger seat rows (2 + 2 layout leaving clear aisle & driver station)
    const seatZ0 = hL - 2.35;
    for (let row = 0; row < 10; row++) {
      const rz = seatZ0 - row * 0.92;
      if (row === 4 && spec.hasDualDoors) continue; // Center boarding vestibule
      for (const sx of [-0.88, -0.44, 0.44, 0.88]) {
        parts.push({ g: bx(0.38, 0.10, 0.40, sx, floorY + 0.42, rz), m: mSeat });
        parts.push({ g: bx(0.38, 0.66, 0.09, sx, floorY + 0.78, rz - 0.17), m: mSeat });
        parts.push({ g: bx(0.26, 0.14, 0.07, sx, floorY + 1.15, rz - 0.17), m: mAccent });
      }
    }
    // Overhead stanchion poles & grab straps
    for (const sx of [-0.36, 0.36]) {
      parts.push({ g: cyl(0.02, 0.02, L - 2.6, 8, sx, roofY - 0.42, -0.3, Math.PI * 0.5), m: mChrome });
      for (let pz = -3.4; pz <= 2.8; pz += 1.55) {
        parts.push({ g: cyl(0.018, 0.018, roofY - floorY - 0.18, 8, sx, (roofY + floorY) * 0.5, pz), m: mChrome });
      }
    }
    // Ergonomic wrap-around Driver Dashboard & Partition
    const dX = spec.eyePos[0];
    parts.push({ g: bx(1.05, 0.52, 0.52, dX - 0.02, floorY + 0.72, hL - 0.82), m: mSkirt });
    parts.push({ g: bx(0.52, 0.10, 0.46, dX, floorY + 0.44, hL - 1.32), m: mSeat });
    parts.push({ g: bx(0.52, 0.76, 0.11, dX, floorY + 0.85, hL - 1.52), m: mSeat });
    parts.push({ g: bx(1.02, 0.95, 0.06, dX, floorY + 0.95, hL - 1.72), m: mSkirt }); // Modesty screen behind driver

    mergeParts(tilt, parts, true);

    // Side Glazing & Front Sloped Panorama Windscreen (added directly so depthWrite:false renders cleanly after opaque body!)
    for (const s of [-1, 1]) {
      const sideG = new THREE.Mesh(bx(0.03, winTop - winBot, L - rRake - 0.45, s * (hW - 0.02), (winBot + winTop) * 0.5, -rRake * 0.5), mGlass);
      tilt.add(sideG);
    }
    const wsH = Math.hypot(winTop - winBot, rRake);
    const wsMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.16, wsH), mFrontGlass);
    wsMesh.position.set(0, (winBot + winTop) * 0.5, hL - rRake * 0.5 - 0.02);
    wsMesh.rotation.x = -Math.atan2(rRake, winTop - winBot);
    tilt.add(wsMesh);
    const rG = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.5, (winTop - winBot) * 0.65), mGlass);
    rG.position.set(0, winTop - (winTop - winBot) * 0.34, -hL + 0.04);
    rG.rotation.y = Math.PI;
    tilt.add(rG);

    // 8. Destination LED Board (front header & side board)
    const led = createLedMatrix((routeObj && routeObj.num) || '138', (routeObj && routeObj.shortName ? routeObj.shortName.toUpperCase() : 'WORLD TRANSIT'), liv.accent);
    const ledMat = new THREE.MeshBasicMaterial({ map: led.tex });
    const fLed = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.30), ledMat);
    fLed.position.set(0, winTop - 0.12, hL - rRake + 0.06);
    tilt.add(fLed);
    const sLed = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.20), ledMat);
    sLed.position.set(hW + 0.015, winBot + 0.25, spec.wheelF - 0.65);
    sLed.rotation.y = Math.PI * 0.5;
    tilt.add(sLed);

    // 9. Live 3D Glass-Cockpit MFD Screen + Animated Steering Wheel
    const mfd = createCockpitMFD(spec);
    const mfdMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshBasicMaterial({ map: mfd.tex }));
    mfdMesh.position.set(dX, floorY + 1.01, hL - 0.66);
    mfdMesh.rotation.order = 'YXZ';
    mfdMesh.rotation.y = Math.PI;
    mfdMesh.rotation.x = -0.45;
    tilt.add(mfdMesh);

    const wheelMesh = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.026, 8, 20), mSkirt);
    wheelMesh.position.set(dX, floorY + 1.00, hL - 0.88);
    wheelMesh.rotation.x = -0.68;
    tilt.add(wheelMesh);

    // 10. Animated Pneumatic Plug Doors (+X kerbside in LHT)
    const doors = [];
    const doorZs = spec.hasDualDoors ? [hL - 1.35, -0.35] : [hL - 1.35];
    for (const dz of doorZs) {
      const dGrp = new THREE.Group();
      dGrp.position.set(hW - 0.02, floorY + 0.05, dz);
      const leafL = new THREE.Mesh(bx(0.05, winTop - floorY - 0.06, 0.56, 0, (winTop - floorY) * 0.5, -0.29), mAccent);
      const leafGlassL = new THREE.Mesh(bx(0.06, (winTop - winBot) * 0.9, 0.42, 0, (winBot + winTop) * 0.5 - floorY, -0.29), mGlass);
      dGrp.add(leafL, leafGlassL);
      const dGrp2 = new THREE.Group();
      dGrp2.position.set(hW - 0.02, floorY + 0.05, dz + 0.56);
      const leafR = new THREE.Mesh(bx(0.05, winTop - floorY - 0.06, 0.56, 0, (winTop - floorY) * 0.5, -0.29), mAccent);
      const leafGlassR = new THREE.Mesh(bx(0.06, (winTop - winBot) * 0.9, 0.42, 0, (winBot + winTop) * 0.5 - floorY, -0.29), mGlass);
      dGrp2.add(leafR, leafGlassR);
      tilt.add(dGrp, dGrp2);
      doors.push({ grp: dGrp, baseX: hW - 0.02, baseZ: dz, slideZ: -0.62, slideX: 0.09, amt: 0 });
      doors.push({ grp: dGrp2, baseX: hW - 0.02, baseZ: dz + 0.56, slideZ: 0.62, slideX: 0.09, amt: 0 });
    }

    // 11. Animated Pantograph Wiper Arms
    const wipers = [];
    for (const wx of [-0.52, 0.52]) {
      const wPivot = new THREE.Group();
      wPivot.position.set(wx, winBot + 0.03, hL - 0.05);
      wPivot.rotation.x = -Math.atan2(rRake, winTop - winBot);
      const arm = new THREE.Mesh(bx(0.028, 0.72, 0.028, 0, 0.36, 0.03), mBlackMask);
      const blade = new THREE.Mesh(bx(0.018, 0.58, 0.035, 0.02, 0.52, 0.04), mBlackMask);
      wPivot.add(arm, blade);
      tilt.add(wPivot);
      wipers.push(wPivot);
    }

    // 12. 4 Coach Wheel Assemblies attached cleanly at wheelR & wheelF
    const wheels = [];
    const calColor = isElec ? 0x06b6d4 : isExpr ? 0xdc2626 : 0xf59e0b;
    const xW = hW - 0.16;
    [
      { x: xW, z: spec.wheelF, steer: true, dual: false },
      { x: -xW, z: spec.wheelF, steer: true, dual: false },
      { x: xW - 0.04, z: spec.wheelR, steer: false, dual: true },
      { x: -xW + 0.04, z: spec.wheelR, steer: false, dual: true }
    ].forEach(pos => {
      const w = buildCoachWheel(spec.wheelR_m, pos.steer, pos.dual, calColor);
      w.group.position.set(pos.x, spec.wheelR_m, pos.z);
      root.add(w.group);
      wheels.push(w);
    });

    return {
      root, tilt, cfg, spec, wheels, doors, wipers,
      hlMat, tailMat, fogMat, blinkLMat, blinkRMat,
      markA, markR, wheelMesh, cabinMat,
      paint: mBody,
      ledTex: led.tex,
      updateLED: led.update,
      updateMFD: mfd.update
    };
  }


  /* ==========================================================================
     PHOTOREAL HYBRID GLB COACH ENGINE
     The curved monocoque body shells are real binary glTF 2.0 meshes (lofted
     superellipse bodywork with a wrap-around nose, crowned roof and clear
     glazing).  Everything that makes a bus feel alive inside — the sculpted
     seating, the cockpit, the grab rails, the lighting — is generated here as
     high-detail Three.js geometry and merged into a handful of draw calls.
     ========================================================================== */

  /* geometry of each authored coach shell, in the shell's own metres */
  var COACH_GEO = {
    metro: {
      hw: 1.275, yBot: 0.28, belt: 1.26, winTop: 2.62, roof: 3.18,
      wheelF: 3.72, wheelR: -3.28, arch: 0.58, rake: 0.34,
      doors: [[4.59, 5.45, 0.40, 2.47], [-4.70, -3.97, 0.40, 2.47]]
    },
    viking: {
      hw: 1.250, yBot: 0.36, belt: 1.44, winTop: 2.86, roof: 3.42,
      wheelF: 3.50, wheelR: -3.10, arch: 0.60, rake: 0.22,
      doors: [[4.50, 5.25, 0.44, 2.71]]
    },
    express: {
      hw: 1.275, yBot: 0.34, belt: 1.64, winTop: 3.04, roof: 3.68,
      wheelF: 3.92, wheelR: -3.45, arch: 0.62, rake: 0.48,
      doors: [[4.70, 5.58, 0.46, 2.89]]
    },
    electro: {
      hw: 1.275, yBot: 0.27, belt: 1.24, winTop: 2.66, roof: 3.30,
      wheelF: 3.85, wheelR: -3.35, arch: 0.58, rake: 0.38,
      doors: [[4.63, 5.49, 0.40, 2.51], [-4.74, -4.00, 0.40, 2.51]]
    },
    ai: {
      hw: 1.240, yBot: 0.34, belt: 1.36, winTop: 2.76, roof: 3.32,
      wheelF: 3.45, wheelR: -3.02, arch: 0.58, rake: 0.30,
      doors: [[4.40, 5.15, 0.40, 2.61]]
    }
  };

  function buildGLBCoach(modelId, cfg, routeObj) {
    var WM = global.WORLD_MODELS;
    var spec = CATALOG[modelId] || CATALOG.metro;
    var shell = WM.coachShell(modelId);
    if (!shell) return null;
    var G = COACH_GEO[modelId] || COACH_GEO.metro;
    var Lg = WM.busLength[modelId] || spec.lengthM;
    var L2g = Lg * 0.5;
    var s = spec.lengthM / Lg;
    var HW = G.hw;

    var root = new THREE.Group();
    var tilt = new THREE.Group();
    var body = new THREE.Group();
    root.add(tilt);
    tilt.add(body);
    body.scale.setScalar(s);
    body.add(shell);

    var liv = liveryFromCfg(cfg, modelId);
    var isExpr = modelId === 'express';
    var isElec = modelId === 'electro';
    var isMetro = modelId === 'metro';

    /* ---- shell materials: the livery is painted straight onto the GLB meshes ---- */
    var paintMeshes = WM.meshesNamed(shell, ['PaintShell', 'AccentShell', 'RoofPod']);
    var paintMats = [];
    paintMeshes.forEach(function (m) {
      var n = m.name;
      if (n === 'PaintShell') m.material.color.setHex(liv.hex);
      else if (n === 'AccentShell') m.material.color.setHex(liv.trimHex);
      else m.material.color.setHex((cfg && cfg.roof) || 0xdbe2ea);
      m.material.metalness = 0.42;
      m.material.roughness = 0.19;
      m.material.envMapIntensity = 1.45;
      m.material.needsUpdate = true;
      paintMats.push(m.material);
    });
    var glassMesh = WM.meshesNamed(shell, ['CabinGlass'])[0];
    if (glassMesh) {
      glassMesh.material.transparent = true;
      glassMesh.material.opacity = 0.46;
      glassMesh.material.roughness = 0.05;
      glassMesh.material.metalness = 0.28;
      glassMesh.material.envMapIntensity = 1.8;
      glassMesh.material.side = THREE.DoubleSide;
      glassMesh.material.needsUpdate = true;
    }

    /* ---- detail materials ---- */
    var hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3cc, emissiveIntensity: 0.65, roughness: 0.10 });
    var drlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: isElec ? 0x22d3ee : 0xf0f9ff, emissiveIntensity: 1.7, roughness: 0.10 });
    var tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.5, roughness: 0.18 });
    var fogMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.25, roughness: 0.15 });
    var blinkLMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.12 });
    var blinkRMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.12 });
    var cabinMat = new THREE.MeshBasicMaterial({ color: 0xcfcabc });
    var mChrome = new THREE.MeshStandardMaterial({ color: 0xdfe6ef, roughness: 0.14, metalness: 0.94, envMapIntensity: 1.7 });
    var mDark = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.62, metalness: 0.24 });
    var mFloor = new THREE.MeshStandardMaterial({ color: 0x3a3f49, roughness: 0.92 });
    var mMat = new THREE.MeshStandardMaterial({ color: 0x6b1d22, roughness: 0.98 });
    var mCeil = new THREE.MeshStandardMaterial({ color: 0xeeece4, roughness: 0.86 });
    var mSeat = new THREE.MeshStandardMaterial({ color: isElec ? 0x0369a1 : isExpr ? 0x8b3a12 : 0x1d4ed8, roughness: 0.68 });
    var mSeat2 = new THREE.MeshStandardMaterial({ color: isElec ? 0x075985 : isExpr ? 0x6b2a0c : 0x163690, roughness: 0.72 });
    var mFrame = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.34, metalness: 0.82 });
    var mTrim = new THREE.MeshStandardMaterial({ color: 0x2b3037, roughness: 0.72, metalness: 0.18 });
    var mGlass2 = new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, roughness: 0.05, metalness: 0.10, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
    var mStrap = new THREE.MeshStandardMaterial({ color: 0xd8d2b8, roughness: 0.85 });
    var mIvory = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.55 });
    var mGold = new THREE.MeshStandardMaterial({ color: 0xd9b24a, roughness: 0.28, metalness: 0.88 });

    var parts = [];
    var floorY = Math.max(0.62, G.belt - 0.40);
    var seatTop = floorY + 0.47;
    var seatPersonY = seatTop - 0.80;      /* a mkPerson's origin when seated */
    var W = HW * 2;

    /* ================= 1. FLOOR, STEP WELLS, WHEEL ARCHES, CEILING ================= */
    parts.push({ g: bx(W - 0.34, 0.05, Lg - 0.9, 0, floorY - 0.02, -0.1), m: mFloor });
    parts.push({ g: bx(0.56, 0.012, Lg - 1.8, 0, floorY + 0.028, -0.3), m: mMat });
    parts.push({ g: bx(W - 0.30, 0.035, Lg - 1.0, 0, G.roof - 0.30, -0.1), m: mCeil });
    /* internal wheel-arch boxes */
    [[G.wheelF, 1.45], [G.wheelR, 1.60]].forEach(function (wa) {
      for (var sx = -1; sx <= 1; sx += 2) {
        parts.push({ g: bx(0.52, 0.34, wa[1], sx * (HW - 0.28), floorY + 0.17, wa[0]), m: mTrim });
      }
    });
    /* step wells under every doorway */
    G.doors.forEach(function (d) {
      var zc = (d[0] + d[1]) * 0.5, dw = d[1] - d[0];
      parts.push({ g: bx(0.52, 0.06, dw, HW - 0.30, d[2] + 0.16, zc), m: mFrame });
      parts.push({ g: bx(0.52, 0.14, 0.02, HW - 0.30, d[2] + 0.08, zc + dw * 0.5), m: mTrim });
    });

    /* ================= 2. SCULPTED 2+2 SEATING ================= */
    var seats = [];
    var inDoorway = function (z) {
      for (var i = 0; i < G.doors.length; i++) {
        if (z > G.doors[i][0] - 0.62 && z < G.doors[i][1] + 0.62) return true;
      }
      return false;
    };
    var zStart = G.doors[0][0] - 1.05;
    for (var rz = zStart; rz > -L2g + 1.55; rz -= 0.86) {
      if (inDoorway(rz)) continue;
      [-0.96, -0.50, 0.50, 0.96].forEach(function (sx) {
        var aisle = sx < 0 ? 1 : -1;
        parts.push({ g: bx(0.44, 0.10, 0.44, sx, floorY + 0.42, rz), m: mSeat });          /* squab */
        parts.push({ g: bx(0.44, 0.60, 0.09, sx, floorY + 0.75, rz - 0.20), m: mSeat2 });   /* backrest */
        parts.push({ g: bx(0.30, 0.17, 0.09, sx, floorY + 1.13, rz - 0.20), m: mSeat2 });   /* headrest */
        parts.push({ g: bx(0.05, 0.34, 0.05, sx + 0.17, floorY + 0.19, rz - 0.14), m: mDark });
        parts.push({ g: bx(0.05, 0.34, 0.05, sx - 0.17, floorY + 0.19, rz - 0.14), m: mDark });
        parts.push({ g: bx(0.045, 0.055, 0.40, sx + aisle * 0.235, floorY + 0.66, rz), m: mSeat2 });  /* armrest */
        parts.push({ g: bx(0.032, 0.20, 0.032, sx + aisle * 0.20, floorY + 1.10, rz - 0.16), m: mFrame }); /* grab handle */
        parts.push({ g: bx(0.30, 0.20, 0.012, sx, floorY + 0.60, rz - 0.27), m: mTrim });   /* magazine net */
        seats.push([sx * s, rz * s, seatPersonY * s]);
      });
    }
    /* the long bench right across the back */
    var bz = -L2g + 1.18;
    parts.push({ g: bx(W - 0.44, 0.10, 0.46, 0, floorY + 0.42, bz), m: mSeat });
    parts.push({ g: bx(W - 0.44, 0.62, 0.09, 0, floorY + 0.76, bz - 0.22), m: mSeat2 });
    [-0.96, -0.50, 0.0, 0.50, 0.96].forEach(function (sx) { seats.push([sx * s, bz * s, seatPersonY * s]); });

    /* ================= 3. LUGGAGE RACKS / PARCEL SHELVES ================= */
    if (isExpr || modelId === 'viking') {
      for (var sx2 = -1; sx2 <= 1; sx2 += 2) {
        parts.push({ g: bx(0.42, 0.05, Lg - 3.2, sx2 * (HW - 0.24), G.winTop + 0.10, -0.6), m: mTrim });
        parts.push({ g: bx(0.03, 0.14, Lg - 3.2, sx2 * (HW - 0.42), G.winTop + 0.20, -0.6), m: mFrame });
        for (var lz = -L2g + 2.2; lz < L2g - 2.0; lz += 1.6) {
          parts.push({ g: bx(0.40, 0.11, 0.03, sx2 * (HW - 0.33), G.winTop + 0.19, lz), m: mFrame });
        }
      }
    }

    /* ================= 4. THE CAB / COCKPIT ================= */
    var dX = (spec.eyePos ? spec.eyePos[0] : -0.46) / s;
    var dashZ = L2g - 0.78;
    /* sculpted wrap-around dashboard */
    parts.push({ g: bx(W - 0.30, 0.44, 0.60, 0, floorY + 0.62, dashZ), m: mTrim });
    parts.push({ g: bx(W - 0.34, 0.05, 0.56, 0, floorY + 0.86, dashZ - 0.02), m: mDark });
    parts.push({ g: bx(1.05, 0.30, 0.16, dX, floorY + 1.02, dashZ - 0.26), m: mDark });       /* binnacle hood */
    parts.push({ g: bx(0.62, 0.16, 0.10, dX + 0.62, floorY + 0.80, dashZ - 0.20), m: mDark }); /* centre stack */
    /* instrument pod, switch bank, cup holder */
    parts.push({ g: bx(0.44, 0.05, 0.06, dX + 0.62, floorY + 0.90, dashZ - 0.24), m: mDark });
    for (var sw = 0; sw < 5; sw++) {
      parts.push({ g: bx(0.045, 0.03, 0.02, dX + 0.40 + sw * 0.09, floorY + 0.92, dashZ - 0.245), m: mGold });
    }
    /* steering column, wheel, stalks & pedals */
    parts.push({ g: cyl(0.035, 0.035, 0.44, 10, dX, floorY + 0.86, dashZ - 0.46, 0.62), m: mDark });
    parts.push({ g: cyl(0.022, 0.022, 0.30, 8, dX - 0.16, floorY + 0.86, dashZ - 0.30, 0, 0, Math.PI * 0.5), m: mDark });
    parts.push({ g: cyl(0.018, 0.018, 0.30, 8, dX + 0.16, floorY + 0.80, dashZ - 0.30, 0, 0, Math.PI * 0.5), m: mDark });
    parts.push({ g: bx(0.07, 0.16, 0.04, dX - 0.20, floorY + 0.30, dashZ - 0.78), m: mFrame });
    parts.push({ g: bx(0.07, 0.16, 0.04, dX + 0.06, floorY + 0.30, dashZ - 0.78), m: mFrame });
    parts.push({ g: bx(0.10, 0.05, 0.14, dX + 0.30, floorY + 0.16, dashZ - 0.80), m: mFrame });
    /* driver's seat (suspension base, squab, backrest, headrest, armrest) */
    parts.push({ g: bx(0.46, 0.10, 0.46, dX, floorY + 0.44, dashZ - 0.92), m: mSeat });
    parts.push({ g: bx(0.46, 0.66, 0.10, dX, floorY + 0.79, dashZ - 1.12), m: mSeat2 });
    parts.push({ g: bx(0.32, 0.17, 0.10, dX, floorY + 1.19, dashZ - 1.12), m: mSeat2 });
    parts.push({ g: bx(0.10, 0.10, 0.34, dX, floorY + 0.18, dashZ - 0.92), m: mDark });
    parts.push({ g: bx(0.05, 0.06, 0.34, dX + 0.24, floorY + 0.66, dashZ - 0.98), m: mDark });
    /* conductor's perch + ticket machine, engine cover beside the driver */
    parts.push({ g: bx(0.44, 0.09, 0.42, HW - 0.52, floorY + 0.40, dashZ - 1.10), m: mSeat });
    parts.push({ g: bx(0.44, 0.52, 0.09, HW - 0.52, floorY + 0.70, dashZ - 1.30), m: mSeat2 });
    parts.push({ g: bx(0.52, 0.62, 0.90, HW - 0.48, floorY + 0.31, dashZ - 2.20), m: mTrim });
    parts.push({ g: bx(0.30, 0.10, 0.34, HW - 0.48, floorY + 0.68, dashZ - 1.85), m: mDark });   /* ticket machine */
    parts.push({ g: bx(0.22, 0.05, 0.20, HW - 0.48, floorY + 0.76, dashZ - 1.85), m: mIvory });
    /* modesty screen behind the cab + sun visors + interior mirror */
    parts.push({ g: bx(W - 0.36, 0.90, 0.05, 0, floorY + 1.10, dashZ - 1.72), m: mTrim });
    parts.push({ g: bx(0.62, 0.16, 0.04, dX, G.winTop - 0.14, L2g - 0.66), m: mTrim });
    parts.push({ g: bx(0.30, 0.11, 0.03, 0, G.winTop - 0.12, L2g - 0.62), m: mDark });
    /* the little shrine on the dashboard, with garland */
    parts.push({ g: bx(0.20, 0.05, 0.16, -dX - 0.05, floorY + 0.90, dashZ - 0.22), m: mGold });
    parts.push({ g: new THREE.ConeGeometry(0.055, 0.16, 10).translate(-dX - 0.05, floorY + 1.01, dashZ - 0.22), m: mGold });
    parts.push({ g: new THREE.SphereGeometry(0.042, 10, 8).translate(-dX - 0.05, floorY + 1.11, dashZ - 0.22), m: mGold });
    /* fire extinguisher by the door */
    parts.push({ g: cyl(0.065, 0.065, 0.34, 10, HW - 0.24, floorY + 0.19, G.doors[0][0] - 0.42), m: tailMat });

    /* ================= 5. CEILING LIGHTING, AC VENTS, TV, SPEAKERS ================= */
    var lights = [];
    for (var lzz = -L2g + 2.0; lzz < L2g - 1.6; lzz += 2.1) {
      parts.push({ g: bx(0.34, 0.035, 1.30, 0, G.roof - 0.34, lzz), m: cabinMat });
      lights.push(lzz);
    }
    for (var vz = -L2g + 2.8; vz < L2g - 1.8; vz += 3.0) {
      for (var vx = -1; vx <= 1; vx += 2) {
        parts.push({ g: bx(0.26, 0.03, 0.42, vx * 0.62, G.roof - 0.32, vz), m: mTrim });
      }
    }
    parts.push({ g: bx(0.78, 0.46, 0.07, 0, G.roof - 0.62, dashZ - 2.6), m: new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.18 }) });
    parts.push({ g: bx(0.05, 0.12, 0.05, 0, G.roof - 0.36, dashZ - 2.6), m: mDark });
    for (var sp2 = -1; sp2 <= 1; sp2 += 2) {
      parts.push({ g: bx(0.30, 0.30, 0.18, sp2 * (HW - 0.20), G.roof - 0.52, -L2g + 2.0), m: mDark });
      parts.push({ g: cyl(0.11, 0.11, 0.03, 12, sp2 * (HW - 0.20), G.roof - 0.52, -L2g + 1.90, Math.PI * 0.5), m: mTrim });
    }

    /* ================= 6. GRAB RAILS, STANCHIONS, HANGING STRAPS ================= */
    [-0.34, 0.34].forEach(function (rx) {
      parts.push({ g: cyl(0.021, 0.021, Lg - 2.4, 8, rx, G.roof - 0.44, -0.6, Math.PI * 0.5), m: mChrome });
      for (var pz = -L2g + 2.2; pz < L2g - 2.4; pz += 1.55) {
        parts.push({ g: cyl(0.018, 0.018, G.roof - 0.44 - floorY, 8, rx, (G.roof - 0.44 + floorY) * 0.5, pz), m: mChrome });
        if (!inDoorway(pz)) {
          parts.push({ g: bx(0.024, 0.19, 0.01, rx, G.roof - 0.63, pz), m: mStrap });
          parts.push({ g: new THREE.TorusGeometry(0.045, 0.010, 6, 12).translate(rx, G.roof - 0.76, pz), m: mStrap });
        }
      }
    });
    /* the rail by the door where the conductor rides */
    parts.push({ g: cyl(0.024, 0.024, 1.30, 8, HW - 0.30, floorY + 0.66, (G.doors[0][0] + G.doors[0][1]) * 0.5), m: mChrome });
    parts.push({ g: cyl(0.022, 0.022, 0.56, 8, HW - 0.46, floorY + 1.30, (G.doors[0][0] + G.doors[0][1]) * 0.5 - 0.28, 0, 0, Math.PI * 0.5), m: mChrome });

    /* ================= 7. EXTERIOR LIGHTS & CHROME FURNITURE ================= */
    var yNose = G.yBot + 0.52, yTail = G.yBot + 0.66;
    parts.push({ g: bx(W - 0.20, 0.30, 0.10, 0, G.yBot + 0.20, L2g - 0.16), m: mDark });
    parts.push({ g: bx(W - 0.34, 0.09, 0.06, 0, yNose - 0.20, L2g - 0.05), m: mChrome });
    for (var sl2 = 0; sl2 < (isElec ? 2 : 4); sl2++) {
      parts.push({ g: bx(1.30, 0.032, 0.05, 0, G.yBot + 0.30 + sl2 * 0.11, L2g - 0.02), m: mChrome });
    }
    for (var sd = -1; sd <= 1; sd += 2) {
      /* projector headlamp cluster, DRL brow, corner indicator & fog lamp */
      parts.push({ g: bx(0.44, 0.22, 0.08, sd * (HW - 0.32), yNose + 0.10, L2g - 0.14), m: mDark });
      parts.push({ g: cyl(0.070, 0.070, 0.06, 14, sd * (HW - 0.26), yNose + 0.11, L2g - 0.09, Math.PI * 0.5), m: hlMat });
      parts.push({ g: cyl(0.056, 0.056, 0.06, 14, sd * (HW - 0.44), yNose + 0.11, L2g - 0.09, Math.PI * 0.5), m: hlMat });
      parts.push({ g: bx(0.42, 0.032, 0.06, sd * (HW - 0.33), yNose + 0.24, L2g - 0.06), m: drlMat });
      parts.push({ g: bx(0.09, 0.15, 0.12, sd * (HW - 0.05), yNose + 0.06, L2g - 0.30), m: sd > 0 ? blinkLMat : blinkRMat });
      parts.push({ g: cyl(0.062, 0.062, 0.05, 12, sd * (HW - 0.36), G.yBot + 0.24, L2g - 0.05, Math.PI * 0.5), m: fogMat });
      /* vertical tail-light stack, reverse lamp & rear indicator */
      parts.push({ g: bx(0.20, 0.72, 0.07, sd * (HW - 0.17), yTail + 0.38, -L2g + 0.02), m: tailMat });
      parts.push({ g: bx(0.14, 0.16, 0.07, sd * (HW - 0.17), yTail - 0.06, -L2g + 0.02), m: sd > 0 ? blinkLMat : blinkRMat });
      parts.push({ g: bx(0.13, 0.10, 0.06, sd * (HW - 0.44), yTail - 0.20, -L2g + 0.02), m: cabinMat });
      /* roof corner marker lights */
      parts.push({ g: bx(0.15, 0.07, 0.07, sd * (HW - 0.18), G.roof - 0.06, L2g - 1.10), m: drlMat });
      parts.push({ g: bx(0.15, 0.07, 0.07, sd * (HW - 0.18), G.roof - 0.06, -L2g + 0.14), m: tailMat });
      /* long armoured wing mirrors */
      parts.push({ g: bx(0.24, 0.045, 0.05, sd * (HW + 0.12), G.winTop - 0.30, L2g - 0.95), m: mDark });
      parts.push({ g: bx(0.055, 0.045, 0.40, sd * (HW + 0.26), G.winTop - 0.42, L2g - 0.78), m: mDark });
      parts.push({ g: bx(0.12, 0.36, 0.15, sd * (HW + 0.28), G.winTop - 0.56, L2g - 0.62), m: mTrim });
      parts.push({ g: bx(0.095, 0.30, 0.02, sd * (HW + 0.285), G.winTop - 0.56, L2g - 0.70), m: mChrome });
    }
    /* windscreen wipers are separate animated groups (see below) */

    mergeParts(body, parts, true);

    /* ================= 8. SIDE LIVERY SIGNBOARDS & LED DESTINATION DISPLAY ================= */
    var sideTex = createSideTexture(modelId, liv, routeObj);
    var mSidePanel = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.30, metalness: 0.28, envMapIntensity: 1.2 });
    for (var sg2 = -1; sg2 <= 1; sg2 += 2) {
      var pg = new THREE.PlaneGeometry(Lg * 0.52, 0.62);
      pg.rotateY(sg2 > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
      pg.translate(sg2 * (HW + 0.014), floorY + 0.52, -0.5);
      var pm = new THREE.Mesh(pg, mSidePanel);
      body.add(pm);
    }

    var led = createLedMatrix((routeObj && routeObj.num) || '138',
      (routeObj && routeObj.shortName ? routeObj.shortName.toUpperCase() : 'WORLD TRANSIT'), liv.accent);
    var ledMat = new THREE.MeshBasicMaterial({ map: led.tex });
    var fLed = new THREE.Mesh(new THREE.PlaneGeometry(1.80, 0.30), ledMat);
    fLed.position.set(0, G.winTop - 0.16, L2g - 0.34);
    fLed.rotation.x = -0.16;
    body.add(fLed);
    var sLed = new THREE.Mesh(new THREE.PlaneGeometry(1.10, 0.20), ledMat);
    sLed.position.set(HW + 0.02, G.belt + 0.22, G.wheelF - 0.55);
    sLed.rotation.y = Math.PI * 0.5;
    body.add(sLed);
    /* rear destination blind */
    var rLed = new THREE.Mesh(new THREE.PlaneGeometry(1.20, 0.22), ledMat);
    rLed.position.set(0, G.winTop - 0.20, -L2g - 0.02);
    rLed.rotation.y = Math.PI;
    body.add(rLed);

    /* ================= 9. LIVE GLASS COCKPIT MFD + STEERING WHEEL ================= */
    var mfd = createCockpitMFD(spec);
    var mfdMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.50, 0.25), new THREE.MeshBasicMaterial({ map: mfd.tex }));
    mfdMesh.position.set(dX, floorY + 1.00, dashZ - 0.20);
    mfdMesh.rotation.order = 'YXZ';
    mfdMesh.rotation.y = Math.PI;
    mfdMesh.rotation.x = -0.50;
    body.add(mfdMesh);

    var wheelMesh = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.026, 10, 22), mDark);
    wheelMesh.position.set(dX, floorY + 0.96, dashZ - 0.66);
    wheelMesh.rotation.x = -0.72;
    body.add(wheelMesh);
    for (var k2 = 0; k2 < 3; k2++) {
      var spk = new THREE.Mesh(bx(0.19, 0.022, 0.02, 0, -0.13, 0), mDark);
      spk.rotation.z = k2 * 2.094;
      wheelMesh.add(spk);
    }

    /* ================= 10. ANIMATED PNEUMATIC PLUG DOORS ================= */
    var doors = [];
    G.doors.forEach(function (d) {
      var dw = d[1] - d[0], zc = (d[0] + d[1]) * 0.5, dh = d[3] - d[2];
      var leafW = dw * 0.5 - 0.02;
      for (var h = 0; h < 2; h++) {
        var dz = h === 0 ? d[0] - dw * 0.25 : d[1] + dw * 0.25;
        var grp = new THREE.Group();
        grp.position.set(HW - 0.16, 0, dz);
        var frame = new THREE.Mesh(bx(0.045, dh, leafW, 0, (d[2] + d[3]) * 0.5, 0), mTrim);
        var glass = new THREE.Mesh(bx(0.05, dh * 0.62, leafW * 0.80, 0.006, d[2] + dh * 0.66, 0), mGlass2);
        var bar = new THREE.Mesh(bx(0.05, 0.05, leafW * 0.9, -0.02, d[2] + 0.30, 0), mChrome);
        grp.add(frame, glass, bar);
        body.add(grp);
        doors.push({ grp: grp, baseX: HW - 0.16, baseZ: dz, slideZ: (h === 0 ? -1 : 1) * dw * 0.5, slideX: 0.10, amt: 0 });
      }
      /* door-top illuminated "open" tell-tale */
      var tt = new THREE.Mesh(bx(0.10, 0.05, dw, HW - 0.06, d[3] + 0.10, zc), cabinMat);
      body.add(tt);
      doors.tellTale = tt;
    });

    /* ================= 11. PANTOGRAPH WIPERS ================= */
    var wipers = [];
    for (var wx2 = -0.55; wx2 <= 0.56; wx2 += 1.10) {
      var piv = new THREE.Group();
      piv.position.set(wx2, G.belt + 0.05, L2g - 0.42);
      piv.rotation.x = -Math.atan2(G.rake, G.winTop - G.belt);
      var arm = new THREE.Mesh(bx(0.028, 0.74, 0.028, 0, 0.37, 0.03), mDark);
      var blade = new THREE.Mesh(bx(0.018, 0.60, 0.036, 0.02, 0.54, 0.04), mDark);
      piv.add(arm, blade);
      body.add(piv);
      wipers.push(piv);
    }

    /* ================= 12. WHEEL ASSEMBLIES (unscaled, on the root) ================= */
    var wheels = [];
    var calColor = isElec ? 0x06b6d4 : isExpr ? 0xdc2626 : 0xf59e0b;
    var xW = spec.widthM * 0.5 - 0.17;
    [
      { x: xW, z: spec.wheelF, steer: true, dual: false },
      { x: -xW, z: spec.wheelF, steer: true, dual: false },
      { x: xW - 0.03, z: spec.wheelR, steer: false, dual: true },
      { x: -xW + 0.03, z: spec.wheelR, steer: false, dual: true }
    ].forEach(function (pos) {
      var w = buildCoachWheel(spec.wheelR_m, pos.steer, pos.dual, calColor);
      w.group.position.set(pos.x, spec.wheelR_m, pos.z);
      root.add(w.group);
      wheels.push(w);
    });

    return {
      root: root, tilt: tilt, cfg: cfg, spec: spec, wheels: wheels, doors: doors, wipers: wipers,
      hlMat: hlMat, tailMat: tailMat, fogMat: fogMat, blinkLMat: blinkLMat, blinkRMat: blinkRMat,
      markA: blinkLMat, markR: tailMat, wheelMesh: wheelMesh, cabinMat: cabinMat,
      paint: paintMeshes,
      seats: seats,
      floorY: floorY * s,
      driverPos: [dX * s, seatPersonY * s, (dashZ - 0.92) * s],
      stepPos: [(HW - 0.30) * s, (floorY + 0.10) * s, ((G.doors[0][0] + G.doors[0][1]) * 0.5) * s],
      ledTex: led.tex,
      updateLED: led.update,
      updateMFD: mfd.update
    };
  }

  function enhanceViking(b) {
    if (!b || !b.tilt) return b;
    // Mount dual chrome air-horn trumpets & crisp roof beacon accents on Viking without changing camera eye
    const mCh = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.92 });
    const mDk = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const hGrp = new THREE.Group();
    [-0.55, -0.40, 0.40, 0.55].forEach(sx => {
      const tr = new THREE.Mesh(cyl(0.052, 0.020, 0.52, 12, sx, 3.36, 3.45, Math.PI * 0.5), mCh);
      const br = new THREE.Mesh(bx(0.04, 0.08, 0.08, sx, 3.31, 3.35), mDk);
      hGrp.add(tr, br);
    });
    b.tilt.add(hGrp);
    return b;
  }

  function buildBus(modelId, cfg, routeObj, fallbackMakeBus) {
    /* real 3D glTF coach shells when the asset pack has finished loading */
    if (global.WORLD_MODELS && global.WORLD_MODELS.ready() && COACH_GEO[modelId]) {
      try {
        const b = buildGLBCoach(modelId, cfg, routeObj);
        if (b) return b;
      } catch (e) { /* fall through to the procedural coach */ }
    }
    if (modelId === 'viking' || !CATALOG[modelId]) {
      const b = fallbackMakeBus ? fallbackMakeBus(cfg) : buildMonocoqueBus('metro', cfg, routeObj);
      b.spec = CATALOG.viking;
      return enhanceViking(b);
    }
    return buildMonocoqueBus(modelId, cfg, routeObj);
  }

  function animateBusExtras(busObj, state, dt) {
    if (!busObj || !state) return;
    if (busObj.doors && busObj.doors.length) {
      const tgt = state.doorsOpen ? 1 : 0;
      busObj.doors.forEach(d => {
        d.amt += (tgt - d.amt) * Math.min(1, dt * 6.5);
        d.grp.position.x = d.baseX + d.slideX * d.amt;
        d.grp.position.z = d.baseZ + d.slideZ * d.amt;
      });
    }
    if (busObj.wipers && busObj.wipers.length) {
      busObj._wipeT = (busObj._wipeT || 0) + (state.wipersOn ? dt * (state.rainLevel > 0.5 ? 5.6 : 3.6) : 0);
      const ang = state.wipersOn ? Math.sin(busObj._wipeT) * 0.55 - 0.15 : -0.95;
      busObj.wipers.forEach((w, idx) => {
        const cur = w.rotation.z;
        w.rotation.z = cur + ((idx === 0 ? ang : -ang) - cur) * Math.min(1, dt * 10);
      });
    }
    if (busObj.blinkLMat && busObj.blinkRMat) {
      const onL = (state.blinkL || state.hazard) && state.blinkOn;
      const onR = (state.blinkR || state.hazard) && state.blinkOn;
      busObj.blinkLMat.emissiveIntensity = onL ? 3.4 : 0.12;
      busObj.blinkRMat.emissiveIntensity = onR ? 3.4 : 0.12;
    }
    if (busObj.updateMFD) {
      busObj._mfdT = (busObj._mfdT || 0) + dt;
      if (busObj._mfdT > 0.14) {
        busObj._mfdT = 0;
        busObj.updateMFD(state);
      }
    }
  }


  /* ==========================================================================
     RIVAL / AI COACH — the same photoreal glTF monocoque shell in the eight
     private-operator liveries that run the corridors alongside the player.
     ========================================================================== */
  var AI_LIVERY = [
    { paint: 0x6a2f86, accent: 0xf4b24c, roof: 0xe6e2f2, name: 'MIHIRI', led: '#f4b24c' },
    { paint: 0x175a3a, accent: 0xe5c14c, roof: 0xe0eee6, name: 'ROYAL', led: '#8fd0a8' },
    { paint: 0x0d3a7a, accent: 0x59b6ff, roof: 0xdde8f4, name: 'SAMUDRA', led: '#4aa0e6' },
    { paint: 0x9a1b1b, accent: 0xffb347, roof: 0xf0e2d8, name: 'LANKA', led: '#e86a4c' },
    { paint: 0x0e6b6b, accent: 0x52c7c0, roof: 0xd8ecea, name: 'SITHARA', led: '#52c7c0' },
    { paint: 0x1c1c22, accent: 0xc9a23a, roof: 0xe6dfc8, name: 'RAJAH', led: '#c9a23a' },
    { paint: 0xd6337a, accent: 0xf7a8c8, roof: 0xf4dde8, name: 'NILMINI', led: '#f7a8c8' },
    { paint: 0x2d7a12, accent: 0xb6e04a, roof: 0xe2efd6, name: 'DILSHAN', led: '#b6e04a' }
  ];

  function buildAICoach(kind, col, opts) {
    var WM = global.WORLD_MODELS;
    if (!WM || !WM.ready()) return null;
    var shell = WM.coachShell('ai');
    if (!shell) return null;
    opts = opts || {};
    var G = COACH_GEO.ai;
    var Lg = WM.busLength.ai, L2g = Lg * 0.5, HW = G.hw;
    var v = AI_LIVERY[((opts.variantIdx || 0) % AI_LIVERY.length + AI_LIVERY.length) % AI_LIVERY.length];
    var isExp = !!opts.isExpress;

    var root = new THREE.Group();
    var body = new THREE.Group();
    root.add(body);
    body.add(shell);

    /* livery straight onto the glTF meshes */
    WM.meshesNamed(shell, ['PaintShell']).forEach(function (m) {
      m.material.color.setHex(col !== undefined && col !== null ? col : v.paint);
      m.material.metalness = 0.42; m.material.roughness = 0.20; m.material.envMapIntensity = 1.4;
      m.material.needsUpdate = true;
    });
    WM.meshesNamed(shell, ['AccentShell']).forEach(function (m) {
      m.material.color.setHex(v.accent); m.material.metalness = 0.38; m.material.roughness = 0.24;
      m.material.needsUpdate = true;
    });
    WM.meshesNamed(shell, ['RoofPod']).forEach(function (m) {
      m.material.color.setHex(v.roof); m.material.needsUpdate = true;
    });
    var gm = WM.meshesNamed(shell, ['CabinGlass'])[0];
    if (gm) {
      gm.material.transparent = true; gm.material.opacity = 0.52;
      gm.material.roughness = 0.06; gm.material.side = THREE.DoubleSide;
      gm.material.needsUpdate = true;
    }

    var hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3cc, emissiveIntensity: 0.7, roughness: 0.10 });
    var tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.5, roughness: 0.18 });
    var blinkLMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.12 });
    var blinkRMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.12 });
    var mDark = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.62, metalness: 0.22 });
    var mChrome = new THREE.MeshStandardMaterial({ color: 0xdfe6ef, roughness: 0.15, metalness: 0.92, envMapIntensity: 1.6 });
    var mFloor = new THREE.MeshStandardMaterial({ color: 0x3a3f49, roughness: 0.92 });
    var mSeat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.70 });
    var mSeat2 = new THREE.MeshStandardMaterial({ color: 0x163690, roughness: 0.74 });
    var mTrim = new THREE.MeshStandardMaterial({ color: 0x2b3037, roughness: 0.74, metalness: 0.16 });
    var mGlass = new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, roughness: 0.06, metalness: 0.10, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide });

    var parts = [];
    var floorY = G.belt - 0.40, W = HW * 2;

    /* a lighter interior: floor, ceiling, 2+2 seating, cab, rails */
    parts.push({ g: bx(W - 0.34, 0.05, Lg - 0.9, 0, floorY - 0.02, -0.1), m: mFloor });
    parts.push({ g: bx(W - 0.30, 0.035, Lg - 1.0, 0, G.roof - 0.30, -0.1), m: mTrim });
    var dzw = G.doors[0];
    var inDoor = function (z) { return z > dzw[0] - 0.62 && z < dzw[1] + 0.62; };
    for (var rz = dzw[0] - 1.0; rz > -L2g + 1.5; rz -= 0.92) {
      if (inDoor(rz)) continue;
      [-0.94, -0.48, 0.48, 0.94].forEach(function (sx) {
        parts.push({ g: bx(0.42, 0.09, 0.42, sx, floorY + 0.42, rz), m: mSeat });
        parts.push({ g: bx(0.42, 0.58, 0.08, sx, floorY + 0.74, rz - 0.19), m: mSeat2 });
      });
    }
    parts.push({ g: bx(W - 0.44, 0.09, 0.44, 0, floorY + 0.42, -L2g + 1.16), m: mSeat });
    parts.push({ g: bx(W - 0.44, 0.60, 0.08, 0, floorY + 0.74, -L2g + 0.95), m: mSeat2 });
    /* cab */
    var dX = -0.46, dashZ = L2g - 0.80;
    parts.push({ g: bx(W - 0.32, 0.42, 0.56, 0, floorY + 0.60, dashZ), m: mTrim });
    parts.push({ g: bx(0.46, 0.09, 0.44, dX, floorY + 0.43, dashZ - 0.88), m: mSeat });
    parts.push({ g: bx(0.46, 0.62, 0.09, dX, floorY + 0.76, dashZ - 1.06), m: mSeat2 });
    parts.push({ g: bx(W - 0.36, 0.86, 0.05, 0, floorY + 1.05, dashZ - 1.62), m: mTrim });
    /* grab rails */
    [-0.34, 0.34].forEach(function (rx) {
      parts.push({ g: cyl(0.02, 0.02, Lg - 2.6, 6, rx, G.roof - 0.46, -0.6, Math.PI * 0.5), m: mChrome });
    });
    /* lights & chrome furniture */
    var yN = G.yBot + 0.52, yT = G.yBot + 0.66;
    parts.push({ g: bx(W - 0.24, 0.28, 0.09, 0, G.yBot + 0.20, L2g - 0.16), m: mDark });
    parts.push({ g: bx(W - 0.38, 0.08, 0.06, 0, yN - 0.18, L2g - 0.05), m: mChrome });
    for (var sd = -1; sd <= 1; sd += 2) {
      parts.push({ g: bx(0.42, 0.21, 0.08, sd * (HW - 0.32), yN + 0.08, L2g - 0.14), m: mDark });
      parts.push({ g: cyl(0.068, 0.068, 0.055, 12, sd * (HW - 0.27), yN + 0.09, L2g - 0.09, Math.PI * 0.5), m: hlMat });
      parts.push({ g: cyl(0.052, 0.052, 0.055, 12, sd * (HW - 0.43), yN + 0.09, L2g - 0.09, Math.PI * 0.5), m: hlMat });
      parts.push({ g: bx(0.09, 0.14, 0.11, sd * (HW - 0.05), yN + 0.05, L2g - 0.28), m: sd > 0 ? blinkLMat : blinkRMat });
      parts.push({ g: bx(0.19, 0.68, 0.07, sd * (HW - 0.17), yT + 0.36, -L2g + 0.02), m: tailMat });
      parts.push({ g: bx(0.13, 0.15, 0.07, sd * (HW - 0.17), yT - 0.06, -L2g + 0.02), m: sd > 0 ? blinkLMat : blinkRMat });
      parts.push({ g: bx(0.14, 0.07, 0.07, sd * (HW - 0.18), G.roof - 0.06, L2g - 1.05), m: hlMat });
      parts.push({ g: bx(0.14, 0.07, 0.07, sd * (HW - 0.18), G.roof - 0.06, -L2g + 0.14), m: tailMat });
      parts.push({ g: bx(0.22, 0.34, 0.14, sd * (HW + 0.26), G.winTop - 0.54, L2g - 0.60), m: mTrim });
      parts.push({ g: bx(0.05, 0.04, 0.34, sd * (HW + 0.13), G.winTop - 0.42, L2g - 0.76), m: mDark });
    }
    mergeParts(body, parts, true);

    /* plug doors + destination blinds */
    var dw = dzw[1] - dzw[0], dh = dzw[3] - dzw[2];
    for (var h = 0; h < 2; h++) {
      var grp = new THREE.Group();
      grp.position.set(HW - 0.14, 0, h === 0 ? dzw[0] - dw * 0.25 : dzw[1] + dw * 0.25);
      grp.add(new THREE.Mesh(bx(0.04, dh, dw * 0.5 - 0.02, 0, (dzw[2] + dzw[3]) * 0.5, 0), mTrim));
      grp.add(new THREE.Mesh(bx(0.05, dh * 0.60, dw * 0.38, 0.006, dzw[2] + dh * 0.66, 0), mGlass));
      body.add(grp);
    }

    var rInfo = opts.routeObj || {};
    var led = createLedMatrix(rInfo.num || '138', (v.name + '  ' + (rInfo.shortName || '')).slice(0, 24), v.led);
    var ledMat = new THREE.MeshBasicMaterial({ map: led.tex });
    var fLed = new THREE.Mesh(new THREE.PlaneGeometry(1.70, 0.28), ledMat);
    fLed.position.set(0, G.winTop - 0.15, L2g - 0.32);
    fLed.rotation.x = -0.15;
    body.add(fLed);
    var sLed = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.19), ledMat);
    sLed.position.set(HW + 0.02, G.belt + 0.20, G.wheelF - 0.55);
    sLed.rotation.y = Math.PI * 0.5;
    body.add(sLed);
    var rLed = new THREE.Mesh(new THREE.PlaneGeometry(1.10, 0.21), ledMat);
    rLed.position.set(0, G.winTop - 0.19, -L2g - 0.02);
    rLed.rotation.y = Math.PI;
    body.add(rLed);

    /* wheels — real 3D alloy rims, mounted on the root so they stay true size */
    var wheels = [];
    var wr = 0.52;
    [[HW - 0.16, G.wheelF, false], [-HW + 0.16, G.wheelF, false],
     [HW - 0.20, G.wheelR, true], [-HW + 0.20, G.wheelR, true]].forEach(function (wp) {
      var w = buildCoachWheel(wr, false, wp[2], isExp ? 0xdc2626 : 0xf59e0b);
      w.group.position.set(wp[0], wr, wp[1]);
      root.add(w.group);
      wheels.push(w);
    });

    root.userData = {
      wheels: wheels, hlMat: hlMat, tailMat: tailMat,
      blinkLMat: blinkLMat, blinkRMat: blinkRMat, policeBeacons: null
    };
    return root;
  }

  // ===================== TRAFFIC VEHICLE ENGINE =====================

  function makeAiWheel(r, w) {
    const grp = new THREE.Group();
    const spin = new THREE.Group();
    const parts = [];
    const mTire = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.88 });
    const mAlloy = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.80 });
    const mDark = new THREE.MeshStandardMaterial({ color: 0x262c36, roughness: 0.45, metalness: 0.5 });
    parts.push({ g: cyl(r, r, w, 16, 0, 0, 0, 0, 0, Math.PI * 0.5), m: mTire });
    parts.push({ g: cyl(r * 0.62, r * 0.62, w + 0.015, 14, 0, 0, 0, 0, 0, Math.PI * 0.5), m: mDark });
    parts.push({ g: cyl(r * 0.22, r * 0.22, w + 0.03, 10, 0, 0, 0, 0, 0, Math.PI * 0.5), m: mAlloy });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const sp = bx(w + 0.022, r * 0.82, 0.036, 0, 0, 0);
      sp.rotateX(a);
      parts.push({ g: sp, m: mAlloy });
    }
    mergeParts(spin, parts, true);
    grp.add(spin);
    return { grp, spin, r };
  }

  let aiStyleIdx = 0;
  function buildTrafficVehicle(kind, col, opts) {
    opts = opts || {};
    /* photoreal glTF rival coach for the AI buses on the road */
    if (/bus|coach|_ai/i.test(kind) && global.WORLD_MODELS && global.WORLD_MODELS.ready()) {
      try {
        const bc = buildAICoach(kind, col, opts);
        if (bc) return bc;
      } catch (e) { /* fall through to the procedural coach */ }
    }
    /* photoreal glTF traffic vehicle when the asset pack is loaded */
    if (global.WORLD_MODELS && global.WORLD_MODELS.ready()) {
      try {
        const gv = global.WORLD_MODELS.buildTrafficVehicle(kind, col, opts);
        if (gv) return gv;
      } catch (e) { /* fall through to the procedural vehicle */ }
    }
    const root = new THREE.Group();
    const parts = [];
    const wheels = [];

    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c4, emissiveIntensity: 0.45, roughness: 0.15 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.35, roughness: 0.2 });
    const blinkLMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.08 });
    const blinkRMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.08 });

    const mBody = new THREE.MeshStandardMaterial({ color: col || 0x2563eb, roughness: 0.28, metalness: 0.38, envMapIntensity: 1.2 });
    const mTrim = new THREE.MeshStandardMaterial({ color: 0x161920, roughness: 0.72, metalness: 0.18 });
    const mGlass = new THREE.MeshStandardMaterial({ color: 0x0b1826, roughness: 0.08, metalness: 0.45, envMapIntensity: 1.5 });
    const mChrome = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.16, metalness: 0.90 });

    if (kind === 'car' || kind === 'police') {
      const style = kind === 'police' ? 0 : (aiStyleIdx++ % 3); // 0=Sport Sedan, 1=SUV Crossover, 2=Compact Hatchback
      const W = style === 1 ? 1.88 : 1.78, hW = W * 0.5;
      const bodyPoly = style === 1
        // Sculpted SUV Crossover
        ? [[-2.18, 0.34], [-2.22, 0.95], [-2.05, 1.56], [-0.85, 1.66], [0.20, 1.65], [0.90, 1.12], [2.15, 0.94], [2.25, 0.56], [2.16, 0.32], [1.45, 0.32], [1.30, 0.52], [0.85, 0.52], [0.70, 0.32], [-0.90, 0.32], [-1.05, 0.52], [-1.50, 0.52], [-1.65, 0.32]]
        : style === 2
        // Agile Compact Hatchback
        ? [[-1.92, 0.28], [-1.96, 0.88], [-1.68, 1.44], [-0.30, 1.48], [0.35, 1.42], [1.02, 0.98], [1.90, 0.76], [1.96, 0.42], [1.85, 0.24], [1.30, 0.24], [1.18, 0.44], [0.78, 0.44], [0.64, 0.24], [-0.82, 0.24], [-0.94, 0.44], [-1.34, 0.44], [-1.48, 0.24]]
        // Fastback Sport Sedan
        : [[-2.18, 0.28], [-2.22, 0.86], [-1.55, 0.98], [-0.92, 1.40], [0.22, 1.42], [0.92, 0.96], [2.12, 0.78], [2.22, 0.44], [2.10, 0.24], [1.42, 0.24], [1.28, 0.45], [0.84, 0.45], [0.70, 0.24], [-0.92, 0.24], [-1.06, 0.45], [-1.50, 0.45], [-1.64, 0.24]];

      const glassPoly = style === 1
        ? [[-1.95, 1.02], [-1.85, 1.50], [-0.82, 1.58], [0.16, 1.57], [0.82, 1.12]]
        : style === 2
        ? [[-1.65, 0.94], [-1.48, 1.37], [-0.30, 1.41], [0.30, 1.35], [0.94, 0.98]]
        : [[-1.45, 0.96], [-0.88, 1.34], [0.18, 1.35], [0.84, 0.96]];

      parts.push({ g: sideExtrude(bodyPoly, W, 0.045), m: mBody });
      parts.push({ g: sideExtrude(glassPoly, W - 0.16, 0.025), m: mGlass });

      const fZ = style === 2 ? 1.92 : 2.18, rZ = style === 2 ? -1.92 : -2.18;
      // Bumpers, grille, mirrors, roof rack (SUV)
      parts.push({ g: bx(W + 0.02, 0.22, 0.14, 0, 0.36, fZ), m: mTrim });
      parts.push({ g: bx(W + 0.02, 0.22, 0.14, 0, 0.38, rZ), m: mTrim });
      parts.push({ g: bx(0.95, 0.24, 0.08, 0, style === 1 ? 0.68 : 0.56, fZ + 0.04), m: mChrome });
      if (style === 1) {
        parts.push({ g: bx(0.06, 0.06, 1.85, hW - 0.22, 1.67, -0.7), m: mChrome });
        parts.push({ g: bx(0.06, 0.06, 1.85, -hW + 0.22, 1.67, -0.7), m: mChrome });
      }
      for (const s of [-1, 1]) {
        parts.push({ g: bx(0.16, 0.10, 0.09, s * (hW + 0.08), style === 1 ? 1.10 : 0.98, 0.64), m: mBody });
        parts.push({ g: bx(0.30, 0.12, 0.08, s * (hW - 0.26), style === 1 ? 0.78 : 0.64, fZ + 0.02), m: hlMat });
        parts.push({ g: bx(0.32, 0.11, 0.08, s * (hW - 0.26), style === 1 ? 0.88 : 0.72, rZ - 0.02), m: tailMat });
        parts.push({ g: bx(0.09, 0.08, 0.10, s * (hW - 0.06), style === 1 ? 0.78 : 0.64, fZ + 0.02), m: s > 0 ? blinkLMat : blinkRMat });
      }
      if (kind === 'police') {
        const mWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
        parts.push({ g: bx(W + 0.015, 0.44, 1.45, 0, 0.68, -0.15), m: mWhite });
        parts.push({ g: bx(1.05, 0.22, 0.14, 0, 0.48, fZ + 0.14), m: mTrim }); // Bullbar
        const rB = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xff2020, emissiveIntensity: 2.2 });
        const bB = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x2563eb, emissiveIntensity: 0.2 });
        parts.push({ g: bx(0.55, 0.13, 0.22, 0.30, 1.48, -0.25), m: rB });
        parts.push({ g: bx(0.55, 0.13, 0.22, -0.30, 1.48, -0.25), m: bB });
        root.userData.policeBeacons = [rB, bB];
      }
      mergeParts(root, parts, true);

      const wr = style === 1 ? 0.38 : 0.34;
      const wzF = style === 2 ? 1.12 : 1.32, wzR = style === 2 ? -1.16 : -1.32;
      [[hW - 0.08, wzF], [-hW + 0.08, wzF], [hW - 0.08, wzR], [-hW + 0.08, wzR]].forEach(p => {
        const w = makeAiWheel(wr, 0.22);
        w.grp.position.set(p[0], wr, p[1]);
        root.add(w.grp);
        wheels.push(w);
      });
    } else if (kind === 'van') {
      const W = 1.92, hW = W * 0.5;
      const vanPoly = [[-2.35, 0.34], [-2.40, 1.95], [-2.18, 2.08], [1.45, 2.06], [2.15, 1.42], [2.36, 0.98], [2.38, 0.48], [2.25, 0.32], [1.62, 0.32], [1.48, 0.56], [1.00, 0.56], [0.85, 0.32], [-1.05, 0.32], [-1.20, 0.56], [-1.68, 0.56], [-1.82, 0.32]];
      const vanGlass = [[-2.18, 1.14], [-2.12, 1.92], [1.42, 1.90], [2.04, 1.34], [2.04, 1.14]];
      parts.push({ g: sideExtrude(vanPoly, W, 0.045), m: mBody });
      parts.push({ g: sideExtrude(vanGlass, W - 0.10, 0.02), m: mGlass });
      parts.push({ g: bx(W + 0.02, 0.26, 0.16, 0, 0.42, 2.34), m: mTrim });
      parts.push({ g: bx(W + 0.02, 0.24, 0.16, 0, 0.42, -2.34), m: mTrim });
      parts.push({ g: bx(1.15, 0.24, 0.06, 0, 0.78, 2.37), m: mChrome });
      for (const s of [-1, 1]) {
        parts.push({ g: bx(0.18, 0.16, 0.08, s * (hW + 0.09), 1.35, 1.55), m: mTrim });
        parts.push({ g: bx(0.28, 0.15, 0.08, s * (hW - 0.24), 0.78, 2.36), m: hlMat });
        parts.push({ g: bx(0.16, 0.48, 0.08, s * (hW - 0.15), 0.96, -2.38), m: tailMat });
        parts.push({ g: bx(0.08, 0.12, 0.08, s * (hW - 0.08), 0.78, 2.37), m: s > 0 ? blinkLMat : blinkRMat });
      }
      mergeParts(root, parts, true);
      [[hW - 0.08, 1.34], [-hW + 0.08, 1.34], [hW - 0.08, -1.42], [-hW + 0.08, -1.42]].forEach(p => {
        const w = makeAiWheel(0.36, 0.24);
        w.grp.position.set(p[0], 0.36, p[1]);
        root.add(w.grp);
        wheels.push(w);
      });
    } else if (kind === 'tuk') {
      // Authentic Sri Lankan Bajaj RE Three-Wheeler
      const mCanvas = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.92 });
      const mSkin = new THREE.MeshStandardMaterial({ color: 0x6f4328, roughness: 0.78 });
      const mShirt = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.8 });
      // Sculpted body tub + rear engine hood + front tear-drop cowl
      const tukLower = [[-1.30, 0.32], [-1.36, 1.05], [-0.15, 1.05], [-0.08, 0.42], [0.55, 0.42], [0.72, 1.02], [1.26, 0.94], [1.34, 0.48], [1.18, 0.28], [-1.22, 0.28]];
      parts.push({ g: sideExtrude(tukLower, 1.32, 0.04), m: mBody });
      // Arched canopy roof
      const canopy = [[-1.28, 1.04], [-1.32, 1.72], [-0.95, 1.84], [0.42, 1.82], [0.88, 1.62], [0.72, 1.56], [0.40, 1.74], [-0.92, 1.75], [-1.20, 1.64], [-1.20, 1.04]];
      parts.push({ g: sideExtrude(canopy, 1.30, 0.03), m: mCanvas });
      // Windshield + upper frame + scooter mudguard
      parts.push({ g: bx(1.12, 0.56, 0.04, 0, 1.32, 0.86), m: mGlass });
      parts.push({ g: bx(0.34, 0.22, 0.48, 0, 0.48, 0.96), m: mBody });
      // Handlebar & mirrors + driver
      parts.push({ g: cyl(0.025, 0.025, 0.72, 8, 0, 1.08, 0.72, 0, 0, Math.PI * 0.5), m: mChrome });
      parts.push({ g: bx(0.38, 0.46, 0.24, 0, 1.18, 0.22), m: mShirt });
      parts.push({ g: cyl(0.12, 0.12, 0.24, 10, 0, 1.52, 0.24), m: mSkin });
      // Round chrome halogen headlamp + turn signals + rear tail lamps
      parts.push({ g: cyl(0.11, 0.11, 0.08, 14, 0, 0.82, 1.34, Math.PI * 0.5), m: hlMat });
      for (const s of [-1, 1]) {
        parts.push({ g: bx(0.12, 0.09, 0.08, s * 0.54, 0.82, 1.24), m: s > 0 ? blinkLMat : blinkRMat });
        parts.push({ g: bx(0.18, 0.12, 0.07, s * 0.50, 0.65, -1.35), m: tailMat });
      }
      mergeParts(root, parts, true);
      [[0, 0.96], [0.58, -0.84], [-0.58, -0.84]].forEach(p => {
        const w = makeAiWheel(0.24, 0.15);
        w.grp.position.set(p[0], 0.24, p[1]);
        root.add(w.grp);
        wheels.push(w);
      });
    } else if (kind === 'bike') {
      const mJacket = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 });
      const mHelmet = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.18, metalness: 0.35 });
      const motoPoly = [[-0.86, 0.42], [-0.88, 0.82], [-0.25, 0.84], [0.05, 0.98], [0.46, 0.96], [0.68, 0.72], [0.80, 0.40], [0.45, 0.36], [-0.55, 0.36]];
      parts.push({ g: sideExtrude(motoPoly, 0.34, 0.03), m: mBody });
      // Exhaust muffler pipe & USD front forks
      parts.push({ g: cyl(0.055, 0.04, 0.72, 10, -0.22, 0.42, -0.45, Math.PI * 0.45), m: mChrome });
      parts.push({ g: cyl(0.032, 0.032, 0.74, 8, 0.12, 0.56, 0.58, -0.35), m: mChrome });
      parts.push({ g: cyl(0.032, 0.032, 0.74, 8, -0.12, 0.56, 0.58, -0.35), m: mChrome });
      parts.push({ g: cyl(0.022, 0.022, 0.68, 8, 0, 1.00, 0.44, 0, 0, Math.PI * 0.5), m: mTrim });
      // Sport rider torso & glossy helmet
      const torso = bx(0.40, 0.54, 0.26, 0, 1.22, -0.05);
      torso.rotateX(0.32);
      parts.push({ g: torso, m: mJacket });
      parts.push({ g: new THREE.SphereGeometry(0.155, 12, 10).translate(0, 1.58, 0.12), m: mHelmet });
      parts.push({ g: bx(0.18, 0.07, 0.14, 0, 1.57, 0.22), m: mGlass });
      // Lights
      parts.push({ g: cyl(0.09, 0.09, 0.08, 12, 0, 0.84, 0.74, Math.PI * 0.5), m: hlMat });
      parts.push({ g: bx(0.16, 0.07, 0.06, 0, 0.82, -0.90), m: tailMat });
      parts.push({ g: bx(0.06, 0.05, 0.06, 0.24, 0.86, 0.72), m: blinkLMat });
      parts.push({ g: bx(0.06, 0.05, 0.06, -0.24, 0.86, 0.72), m: blinkRMat });
      mergeParts(root, parts, true);
      [[0, 0.68], [0, -0.68]].forEach(p => {
        const w = makeAiWheel(0.31, 0.12);
        w.grp.position.set(p[0], 0.31, p[1]);
        root.add(w.grp);
        wheels.push(w);
      });
    } else if (kind === 'truck') {
      // Cab-over Euro / Isuzu 6-Wheeler Cargo Lorry
      const W = 2.42, hW = W * 0.5;
      const cabPoly = [[1.15, 0.64], [1.15, 2.55], [1.45, 2.86], [2.95, 2.86], [3.35, 2.38], [3.46, 1.62], [3.46, 0.64]];
      parts.push({ g: sideExtrude(cabPoly, W - 0.06, 0.05), m: mBody });
      // Deep panoramic cab windshield + side glass + sun visor
      parts.push({ g: bx(W - 0.24, 0.88, 0.08, 0, 2.08, 3.36), m: mGlass });
      parts.push({ g: bx(W - 0.12, 0.14, 0.32, 0, 2.55, 3.45), m: mTrim });
      // Multi-slat chrome grille & heavy bumper
      parts.push({ g: bx(W - 0.02, 0.42, 0.20, 0, 0.72, 3.45), m: mTrim });
      parts.push({ g: bx(1.55, 0.58, 0.08, 0, 1.24, 3.47), m: mTrim });
      for (let gS = 0; gS < 3; gS++) {
        parts.push({ g: bx(1.42, 0.04, 0.06, 0, 1.06 + gS * 0.16, 3.50), m: mChrome });
      }
      // Chassis frame + fuel tank + corrugated freight box
      parts.push({ g: bx(1.25, 0.28, 6.2, 0, 0.68, -0.5), m: mTrim });
      parts.push({ g: cyl(0.24, 0.24, 1.15, 12, hW - 0.25, 0.66, 0.25, Math.PI * 0.5), m: mChrome });
      const mCargo = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.74 });
      const mStripe = new THREE.MeshStandardMaterial({ color: col || 0x2563eb, roughness: 0.55 });
      parts.push({ g: bx(W, 2.28, 4.65, 0, 2.02, -1.25), m: mCargo });
      parts.push({ g: bx(W + 0.02, 0.26, 4.66, 0, 1.48, -1.25), m: mStripe });
      for (const s of [-1, 1]) {
        parts.push({ g: bx(0.18, 0.52, 0.12, s * (hW + 0.18), 2.15, 3.22), m: mTrim });
        parts.push({ g: bx(0.32, 0.18, 0.08, s * (hW - 0.26), 0.76, 3.56), m: hlMat });
        parts.push({ g: bx(0.26, 0.18, 0.08, s * (hW - 0.28), 0.76, -3.60), m: tailMat });
        parts.push({ g: bx(0.08, 0.14, 0.10, s * (hW - 0.08), 0.76, 3.55), m: s > 0 ? blinkLMat : blinkRMat });
      }
      mergeParts(root, parts, true);
      [[hW - 0.12, 2.35, 0.28], [-hW + 0.12, 2.35, 0.28], [hW - 0.16, -2.05, 0.42], [-hW + 0.16, -2.05, 0.42]].forEach(p => {
        const w = makeAiWheel(0.50, p[2]);
        w.grp.position.set(p[0], 0.50, p[1]);
        root.add(w.grp);
        wheels.push(w);
      });
    } else {
      // 'metro_ai' or 'express_ai' AI passenger coach
      const isExp = !!opts.isExpress || kind === 'express_ai';
      const W = 2.48, hW = W * 0.5, L = 11.4, hL = L * 0.5;
      const bodyC = isExp ? 0x0f3b7a : (col || 0x1d4ed8);
      const mCoach = new THREE.MeshStandardMaterial({ color: bodyC, roughness: 0.30, metalness: 0.32 });
      const mCoachAcc = new THREE.MeshStandardMaterial({ color: isExp ? 0x38bdf8 : 0xf59e0b, roughness: 0.35 });
      const poly = [[-hL + 0.12, 0.44], [-hL + 0.04, 3.28], [hL - 0.32, 3.28], [hL - 0.04, 1.38], [hL - 0.04, 0.42], [3.8, 0.42], [3.6, 0.96], [2.7, 0.96], [2.5, 0.42], [-2.0, 0.42], [-2.2, 0.96], [-3.1, 0.96], [-3.3, 0.42]];
      parts.push({ g: sideExtrude(poly, W, 0.045), m: mCoach });
      parts.push({ g: bx(W + 0.02, 0.16, L - 0.4, 0, 1.30, -0.05), m: mCoachAcc });
      parts.push({ g: bx(W - 0.08, 1.15, L - 0.72, 0, 2.25, -0.15), m: mGlass });
      parts.push({ g: bx(W - 0.20, 1.18, 0.10, 0, 2.25, hL - 0.18), m: mGlass });
      // Roof AC Pod & Chrome Horns
      parts.push({ g: bx(1.65, 0.24, 3.6, 0, 3.40, -0.4), m: mChrome });
      parts.push({ g: cyl(0.05, 0.02, 0.46, 10, 0.45, 3.36, 4.2, Math.PI * 0.5), m: mChrome });
      parts.push({ g: cyl(0.05, 0.02, 0.46, 10, -0.45, 3.36, 4.2, Math.PI * 0.5), m: mChrome });
      for (const s of [-1, 1]) {
        parts.push({ g: bx(0.18, 0.34, 0.12, s * (hW + 0.16), 2.25, hL - 0.08), m: mTrim });
        parts.push({ g: bx(0.38, 0.18, 0.08, s * (hW - 0.32), 0.78, hL - 0.02), m: hlMat });
        parts.push({ g: bx(0.20, 0.58, 0.08, s * (hW - 0.18), 1.05, -hL + 0.02), m: tailMat });
        parts.push({ g: bx(0.09, 0.12, 0.10, s * (hW - 0.06), 0.78, hL - 0.03), m: s > 0 ? blinkLMat : blinkRMat });
      }
      mergeParts(root, parts, true);
      const rInfo = opts.routeObj || {};
      const led = createLedMatrix(rInfo.num || '138', rInfo.shortName || 'METRO EXPRESS', isExp ? '#38bdf8' : '#fde047');
      const ledMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.28), new THREE.MeshBasicMaterial({ map: led.tex }));
      ledMesh.position.set(0, 2.95, hL - 0.22);
      root.add(ledMesh);

      [[hW - 0.14, 3.15], [-hW + 0.14, 3.15], [hW - 0.14, -2.65], [-hW + 0.14, -2.65]].forEach(p => {
        const w = makeAiWheel(0.52, 0.30);
        w.grp.position.set(p[0], 0.52, p[1]);
        root.add(w.grp);
        wheels.push(w);
      });
    }

    root.userData = { wheels, hlMat, tailMat, blinkLMat, blinkRMat, policeBeacons: root.userData.policeBeacons || null };
    return root;
  }

  function animateTrafficVehicle(v, dt, isDarkOrRain, blinkPulse) {
    if (!v || !v.mesh) return;
    const ud = v.mesh.userData;
    if (!ud) return;
    if (ud.wheels) {
      const spd = v.speed || 0;
      for (let i = 0; i < ud.wheels.length; i++) {
        const w = ud.wheels[i];
        if (w && w.spin) w.spin.rotation.x += (spd * dt) / (w.r || 0.38);
      }
    }
    if (ud.hlMat) ud.hlMat.emissiveIntensity = isDarkOrRain ? 2.4 : 0.45;
    if (ud.tailMat) {
      const brk = (v.acc < -0.5) || v.speed < 0.4 || v.stopped;
      ud.tailMat.emissiveIntensity = brk ? 2.8 : (isDarkOrRain ? 1.1 : 0.35);
    }
    if (ud.blinkLMat) ud.blinkLMat.emissiveIntensity = (v.ovt && v.ovt > 0 && blinkPulse) ? 2.8 : 0.08;
    if (ud.blinkRMat) ud.blinkRMat.emissiveIntensity = (v.stopH && blinkPulse) ? 2.8 : 0.08;
    if (ud.policeBeacons && ud.policeBeacons.length >= 2) {
      ud.policeBeacons[0].emissiveIntensity = blinkPulse ? 3.2 : 0.15;
      ud.policeBeacons[1].emissiveIntensity = blinkPulse ? 0.15 : 3.2;
    }
  }

  global.BUS_MODELS = {
    catalog: CATALOG,
    coachGeo: COACH_GEO,
    buildGLBCoach,
    buildAICoach,
    AI_LIVERY,
    buildBus,
    animateBusExtras,
    buildTrafficVehicle,
    animateTrafficVehicle,
    createLedMatrix,
    createCockpitMFD
  };
})(window);
