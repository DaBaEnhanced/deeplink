// GPU mesh library: every mesh the game uses, built once from the procedural generators.
import * as G from './meshes.js';
import * as C from './creatures.js';

export function buildLib(r) {
  const L = {};
  const add = (k, d) => { // keep the local bounding box (corridor clearance)
    const m = r.mesh(d), p = d.pos; const b0 = [Infinity, Infinity, Infinity], b1 = [-Infinity, -Infinity, -Infinity];
    if (p) for (let i = 0; i < p.length; i += 3) for (let k2 = 0; k2 < 3; k2++) { const v = p[i + k2]; if (v < b0[k2]) b0[k2] = v; if (v > b1[k2]) b1[k2] = v; }
    if (m && b0[0] <= b1[0]) { m.bmin = b0; m.bmax = b1; }
    L[k] = m;
  };
  add('box', G.box(1, 1, 1)); add('tower', G.tower(1, 1, 1)); add('wireBox', G.wireBox(1, 1, 1));
  add('octa', G.octa(1)); add('wireOcta', G.wireOcta(1)); add('tetra', G.tetra(1)); add('ico', G.ico(1, 1)); add('icoSmooth', G.ico(1, 2, [1, 1, 1], true));
  add('blob', G.ico(1, 2, [1, 1, 1], true, 0.35, 7)); add('wireIco', G.wireIco(1)); add('rock', G.ico(1, 1, [1, 1, 1], false, 0.5, 11));
  add('cyl', G.cylinder(1, 1, 8)); add('cyl16', G.cylinder(1, 1, 16)); add('cone', G.cylinder(1, 1, 8, [1, 1, 1], true, 0.0001));
  add('pyramid', G.pyramid(1, 1)); add('ring', G.ring(1, 0.08, 20)); add('ringThick', G.ring(1, 0.18, 12, [1, 1, 1], 0.4)); add('wireRing', G.wireRing(1, 24));
  add('quad', G.quad()); add('plane', G.plane(1, 1)); add('sea', G.gridPlane(1, 1, 48, 48)); add('grid', G.gridLines(1, 1, 24, 24)); add('grid8', G.gridLines(1, 1, 8, 8));
  add('dart', G.dart()); add('kite', G.kite()); add('panel', G.shutterPanel(1, 1)); add('flower', G.flower(6, 1)); add('flower8', G.flower(8, 1));
  add('face', G.face(1)); add('faceOpen', G.face(1, [1, 1, 1], 1)); add('file', G.fileSlab()); add('rockSlab', G.rockSlab(3)); add('branch', G.branch(3)); add('branch4', G.branch(4, [1, 1, 1], 9));
  add('juno', G.junoFigure()); add('agent', G.humanoidSolid(1)); add('hollis', G.humanoidSolid(1, [1, 1, 1], 1));
  for (let s = 0; s < 3; s++) add('avatar' + s, G.avatar(s));
  for (let i = 0; i < 10; i++) add('glyph' + i, G.glyphMesh(i));
  // a long thin beam along +z (lasers, streams), base at z=0
  add('beam', G.transformed(G.box(1, 1, 1), p => [p[0], p[1], p[2] + 0.5]));
  // corridor tube segment (lines): rings + longitudinal lines, along +z
  {
    const m = new G.MB(); const seg = 12;
    for (let i = 0; i < seg; i++) { const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2; m.line([Math.cos(a0), Math.sin(a0), 0], [Math.cos(a1), Math.sin(a1), 0]); m.line([Math.cos(a0), Math.sin(a0), 0], [Math.cos(a0), Math.sin(a0), 1]); }
    add('tubeSeg', m.done(1.5));
  }
  // firewall: a wall panel with a square opening, built as 4 boxes around a hole (unit size, hole 0.4)
  {
    const parts = [G.transformed(G.box(1, 0.3, 0.1), p => [p[0], p[1] + 0.35, p[2]]), G.transformed(G.box(1, 0.3, 0.1), p => [p[0], p[1] - 0.35, p[2]]),
      G.transformed(G.box(0.3, 0.4, 0.1), p => [p[0] - 0.35, p[1], p[2]]), G.transformed(G.box(0.3, 0.4, 0.1), p => [p[0] + 0.35, p[1], p[2]])];
    add('wallHole', G.merge(...parts));
  }
  // set dressing (v2)
  for (let i = 0; i < 4; i++) add('shelf' + i, G.bookshelf(11 + i * 7));
  add('mast', G.mast()); add('spikeBall', G.spikeBall(3)); add('spikeBall2', G.spikeBall(9));
  add('hexFrame', G.ring(1, 0.05, 6, [1, 1, 1], 0.6)); add('hexLines', G.wireRing(1, 6));
  add('arch', G.arc(1, 0.12, 0, Math.PI, 14, [1, 1, 1], 0.12)); add('ringArc', G.arc(1, 0.03, 0, Math.PI * 1.3, 18, [1, 1, 1], 0.03));
  add('strand', G.strand(4)); add('strand2', G.strand(8)); add('tuft', G.tuft(5)); add('dome', G.dome());
  add('ruler', G.ruler()); add('crystal', G.octa(1, [1, 1, 1], 2.6)); add('shard', G.transformed(G.tetra(1), p => [p[0] * 0.5, p[1] * 0.5, p[2] * 2.2]));
  // B-side layers (v3): Static, The Graveyard, The Hive, Negative
  add('crt', G.crt()); add('crtScreen', G.crtScreen()); add('hexCell', G.cylinder(1, 1, 6, [1, 1, 1], true));
  add('floppy', G.merge(G.box(1, 0.05, 1, [0.12, 0.12, 0.14]), G.transformed(G.box(0.45, 0.06, 0.32, [0.7, 0.72, 0.75]), p => [p[0] + 0.1, p[1], p[2] + 0.32])));
  // bosses and ICE (v4 gfx pass, src/render/creatures.js; drawn as rigs by src/dive/creatures.js)
  add('c_tickRing', C.tickRing(1, 48)); add('c_tickRingS', C.tickRing(1, 24)); add('c_disc', C.disc(1)); add('c_lid', C.shell(1, 0, Math.PI / 2, 16)); add('c_iris', C.iris());
  add('c_chamfer', C.chamfer(1, 1, 1, 0.15)); add('c_auditBlock', C.auditBlock()); add('c_ledger', C.ledger());
  add('c_levSkull', C.levSkull()); add('c_levJaw', C.levJaw()); add('c_levVert', C.levVert()); add('c_levFin', C.levFin()); add('c_levTail', C.levTail());
  add('c_brickWall', C.brickWall()); add('c_brickSeams', C.brickSeams()); add('c_wardenMask', C.wardenMask()); add('c_wardenJaw', C.wardenJaw()); add('c_flame', C.flame());
  for (let i = 0; i < 4; i++) add('c_book' + i, C.book(i + 1));
  for (let i = 0; i < 3; i++) add('c_sheet' + i, C.sheet(i + 1));
  add('c_sheetBlank', C.sheet(9, false)); add('c_tomeHalf', C.tomeHalf()); add('c_lantern', C.lantern());
  add('c_seedPod', C.seedPod()); add('c_vine', C.vine()); add('c_petal', C.petal(1.6, 0.5, 0.7, 0.18)); add('c_spore', C.spore());
  const H = C.HOLLIS; add('c_hHead', H.head()); add('c_hVisor', H.visor()); add('c_hTorso', H.torso()); add('c_hPelvis', H.pelvis()); add('c_hLimb', H.limb(0.42, 0.13)); add('c_hLimbS', H.limb(0.4, 0.11)); add('c_hHand', H.hand()); add('c_hCoat', H.coat());
  add('c_tentSeg', C.tentSeg()); add('c_band', C.band());
  add('c_pingerFins', C.pingerFins()); add('c_scannerHead', C.scannerHead()); add('c_wormHead', C.wormHead()); add('c_mandible', C.mandible()); add('c_wormSeg', C.wormSeg());
  add('c_stealth', C.stealth()); add('c_shutterFrame', C.shutterFrame()); add('c_slat', C.slat());
  // B-side scenery (v5): the Trench, Cold Storage, the Ashes, Recursion, Event Horizon
  add('c_jellyBell', C.jellyBell()); add('c_jellyTent', C.jellyTent()); add('c_stairs', C.stairs()); add('c_doorway', C.doorway()); add('c_tribar', C.tribar()); add('c_helix', C.helix());
  return L;
}
