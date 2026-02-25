// ============================================
// LASER MIRROR 4 - 3x3 Grid, Full Random Path
// A laser visits all 7 active mirrors in a 3x3
// grid (positions 4 and 5 are empty) in a random
// order. Click to randomize.
// ============================================

// Toy-specific state
const mirror4_activeMirrors = [1, 2, 3, 6, 7, 8, 9];
let mirror4_mirrorPositions = {};
let mirror4_mirrorAngles = {};
let mirror4_visitOrder = [];
let mirror4_initialized = false;

function drawLaserMirror4() {
  if (!mirror4_initialized) {
    mirror4_calculatePositions();
    mirror4_randomize();
    mirror4_initialized = true;
  }

  let margin = 30;
  let gridSize = min(width - margin * 2, height - margin * 2) * 0.7;
  let cellSize = gridSize / 3;
  let lineLength = cellSize * 0.6;

  // Draw laser first
  stroke(laserColor);
  strokeWeight(laserWeight);
  noFill();

  let rayX = 0;
  let rayY = mirror4_mirrorPositions[6].y;
  let rayAngle = 0;

  for (let i = 0; i < mirror4_visitOrder.length; i++) {
    let targetMirror = mirror4_visitOrder[i];
    let targetPos = mirror4_mirrorPositions[targetMirror];

    line(rayX, rayY, targetPos.x, targetPos.y);

    if (i === mirror4_visitOrder.length - 1) {
      // Exit ray to border
      let mirrorAngle = mirror4_mirrorAngles[targetMirror];
      let mirrorRad = radians(mirrorAngle);
      let normalX = -sin(mirrorRad);
      let normalY = cos(mirrorRad);
      let rayDx = cos(radians(rayAngle));
      let rayDy = sin(radians(rayAngle));
      let dot = rayDx * normalX + rayDy * normalY;
      let reflectDx = rayDx - 2 * dot * normalX;
      let reflectDy = rayDy - 2 * dot * normalY;
      let exitAngle = degrees(atan2(reflectDy, reflectDx));

      let exit = mirror4_borderIntersection(targetPos.x, targetPos.y, exitAngle);
      if (exit) line(targetPos.x, targetPos.y, exit.x, exit.y);
      break;
    }

    // Reflect
    let mirrorAngle = mirror4_mirrorAngles[targetMirror];
    let mirrorRad = radians(mirrorAngle);
    let normalX = -sin(mirrorRad);
    let normalY = cos(mirrorRad);
    let rayDx = cos(radians(rayAngle));
    let rayDy = sin(radians(rayAngle));
    let dot = rayDx * normalX + rayDy * normalY;
    let reflectDx = rayDx - 2 * dot * normalX;
    let reflectDy = rayDy - 2 * dot * normalY;

    rayAngle = degrees(atan2(reflectDy, reflectDx));
    rayX = targetPos.x;
    rayY = targetPos.y;
  }

  // Draw mirrors on top
  stroke(mirrorColor);
  strokeWeight(mirrorWeight);
  noFill();

  for (let mirrorNum of mirror4_activeMirrors) {
    let pos = mirror4_mirrorPositions[mirrorNum];
    let angle = mirror4_mirrorAngles[mirrorNum] || 0;

    push();
    translate(pos.x, pos.y);
    rotate(radians(angle));
    line(-lineLength / 2, 0, lineLength / 2, 0);
    pop();
  }
}

function laserMirror4_mousePressed() {
  mirror4_randomize();
}

// ---- Helpers ----

function mirror4_calculatePositions() {
  let margin = 30;
  let gridSize = min(width - margin * 2, height - margin * 2) * 0.7;
  let cellSize = gridSize / 3;
  let startX = (width - gridSize) / 2;
  let startY = (height - gridSize) / 2;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let pos = row * 3 + col + 1;
      mirror4_mirrorPositions[pos] = {
        x: startX + col * cellSize + cellSize / 2,
        y: startY + row * cellSize + cellSize / 2
      };
    }
  }
}

function mirror4_randomize() {
  // Start at mirror 6, shuffle the rest freely
  let rest = mirror4_activeMirrors.filter(m => m !== 6);

  // Fisher-Yates shuffle
  for (let i = rest.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    let tmp = rest[i]; rest[i] = rest[j]; rest[j] = tmp;
  }

  mirror4_visitOrder = [6, ...rest];

  // Calculate mirror angles along the path
  mirror4_mirrorAngles = {};
  let incomingAngle = 0;

  for (let i = 0; i < mirror4_visitOrder.length; i++) {
    let curr = mirror4_visitOrder[i];

    if (i < mirror4_visitOrder.length - 1) {
      let next = mirror4_visitOrder[i + 1];
      let currPos = mirror4_mirrorPositions[curr];
      let nextPos = mirror4_mirrorPositions[next];

      let dx = nextPos.x - currPos.x;
      let dy = nextPos.y - currPos.y;
      let targetAngle = degrees(atan2(dy, dx));

      let mirrorAngle = (incomingAngle + targetAngle) / 2;
      mirror4_mirrorAngles[curr] = mirrorAngle;

      // Compute outgoing angle
      let mirrorRad = radians(mirrorAngle);
      let normalX = -sin(mirrorRad);
      let normalY = cos(mirrorRad);
      let rayDx = cos(radians(incomingAngle));
      let rayDy = sin(radians(incomingAngle));
      let dot = rayDx * normalX + rayDy * normalY;
      let reflectDx = rayDx - 2 * dot * normalX;
      let reflectDy = rayDy - 2 * dot * normalY;
      incomingAngle = degrees(atan2(reflectDy, reflectDx));
    } else {
      // Last mirror — random exit
      mirror4_mirrorAngles[curr] = floor(random(12)) * 30;
    }
  }
}

function mirror4_borderIntersection(x, y, angle) {
  let dx = cos(radians(angle));
  let dy = sin(radians(angle));
  let hits = [];

  if (dx > 0) {
    let t = (width - x) / dx;
    let hy = y + dy * t;
    if (hy >= 0 && hy <= height && t > 0) hits.push({ x: width, y: hy, dist: t });
  }
  if (dx < 0) {
    let t = (0 - x) / dx;
    let hy = y + dy * t;
    if (hy >= 0 && hy <= height && t > 0) hits.push({ x: 0, y: hy, dist: t });
  }
  if (dy > 0) {
    let t = (height - y) / dy;
    let hx = x + dx * t;
    if (hx >= 0 && hx <= width && t > 0) hits.push({ x: hx, y: height, dist: t });
  }
  if (dy < 0) {
    let t = (0 - y) / dy;
    let hx = x + dx * t;
    if (hx >= 0 && hx <= width && t > 0) hits.push({ x: hx, y: 0, dist: t });
  }

  if (hits.length === 0) return null;
  hits.sort((a, b) => a.dist - b.dist);
  return hits[0];
}
