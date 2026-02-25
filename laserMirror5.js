// ============================================
// LASER MIRROR 5 - 7x7 Grid, No-Crossing Path
// Like laserMirror3 but laser can jump to any
// unvisited mirror, as long as the path doesn't
// cross existing mirrors or laser segments.
// Stops at a dead end rather than restarting.
// Click to randomize.
// ============================================

// Toy-specific state
const mirror5_activeMirrors = [
   1,  2,  3,  4,  5,  6,  7,
   8,  9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21,
  22, 23, 24,     26, 27, 28,
  29, 30, 31, 32, 33, 34, 35,
  36, 37, 38, 39, 40, 41, 42,
  43, 44, 45, 46, 47, 48, 49
];

let mirror5_mirrorPositions = {};
let mirror5_mirrorAngles = {};
let mirror5_visitOrder = [];
let mirror5_initialized = false;

function drawLaserMirror5() {
  if (!mirror5_initialized) {
    mirror5_calculatePositions();
    mirror5_randomize();
    mirror5_initialized = true;
  }

  let margin = 30;
  let gridSize = min(width - margin * 2, height - margin * 2) * 0.85;
  let cellSize = gridSize / 7;
  let lineLength = cellSize * 0.6;

  // Draw laser first
  stroke(laserColor);
  strokeWeight(laserWeight);
  noFill();

  let rayX = 0;
  let rayY = mirror5_mirrorPositions[mirror5_visitOrder[0]].y;
  let rayAngle = 0;

  for (let i = 0; i < mirror5_visitOrder.length; i++) {
    let targetMirror = mirror5_visitOrder[i];
    let targetPos = mirror5_mirrorPositions[targetMirror];

    line(rayX, rayY, targetPos.x, targetPos.y);

    if (i === mirror5_visitOrder.length - 1) {
      // Exit ray to border
      let mirrorAngle = mirror5_mirrorAngles[targetMirror];
      let mirrorRad = radians(mirrorAngle);
      let normalX = -sin(mirrorRad);
      let normalY = cos(mirrorRad);
      let rayDx = cos(radians(rayAngle));
      let rayDy = sin(radians(rayAngle));
      let dot = rayDx * normalX + rayDy * normalY;
      let reflectDx = rayDx - 2 * dot * normalX;
      let reflectDy = rayDy - 2 * dot * normalY;
      let exitAngle = degrees(atan2(reflectDy, reflectDx));

      let exit = mirror5_borderIntersection(targetPos.x, targetPos.y, exitAngle);
      if (exit) line(targetPos.x, targetPos.y, exit.x, exit.y);
      break;
    }

    // Reflect
    let mirrorAngle = mirror5_mirrorAngles[targetMirror];
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

  for (let mirrorNum of mirror5_visitOrder) {
    let pos = mirror5_mirrorPositions[mirrorNum];
    let angle = mirror5_mirrorAngles[mirrorNum] || 0;

    push();
    translate(pos.x, pos.y);
    rotate(radians(angle));
    line(-lineLength / 2, 0, lineLength / 2, 0);
    pop();
  }
}

function laserMirror5_mousePressed() {
  mirror5_randomize();
}

// ---- Helpers ----

function mirror5_calculatePositions() {
  let margin = 30;
  let gridSize = min(width - margin * 2, height - margin * 2) * 0.85;
  let cellSize = gridSize / 7;
  let startX = (width - gridSize) / 2;
  let startY = (height - gridSize) / 2;

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      let pos = row * 7 + col + 1;
      mirror5_mirrorPositions[pos] = {
        x: startX + col * cellSize + cellSize / 2,
        y: startY + row * cellSize + cellSize / 2
      };
    }
  }
}

function mirror5_randomize() {
  let startMirror = 22;
  mirror5_visitOrder = [startMirror];
  mirror5_mirrorAngles = {};

  let visited = new Set([startMirror]);
  let current = startMirror;
  let laserPaths = [];
  let incomingAngle = 0;

  // Greedily build path, stopping at dead ends
  while (true) {
    let validMoves = mirror5_getValidMoves(current, visited, laserPaths, incomingAngle);

    if (validMoves.length === 0) break;

    let next = validMoves[floor(random(validMoves.length))];
    let currentPos = mirror5_mirrorPositions[current];
    let nextPos = mirror5_mirrorPositions[next];

    // Calculate mirror angle to reflect toward next
    let dx = nextPos.x - currentPos.x;
    let dy = nextPos.y - currentPos.y;
    let targetAngle = degrees(atan2(dy, dx));
    let mirrorAngle = (incomingAngle + targetAngle) / 2;
    mirror5_mirrorAngles[current] = mirrorAngle;

    // Record laser segment
    laserPaths.push({ x1: currentPos.x, y1: currentPos.y, x2: nextPos.x, y2: nextPos.y });

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

    visited.add(next);
    mirror5_visitOrder.push(next);
    current = next;
  }

  // Last mirror gets a random exit angle
  let last = mirror5_visitOrder[mirror5_visitOrder.length - 1];
  mirror5_mirrorAngles[last] = floor(random(12)) * 30;
}

function mirror5_getValidMoves(current, visited, laserPaths, incomingAngle) {
  let currentPos = mirror5_mirrorPositions[current];
  let lineLength = mirror5_lineLength();
  let validMoves = [];

  for (let mirror of mirror5_activeMirrors) {
    if (visited.has(mirror)) continue;

    let targetPos = mirror5_mirrorPositions[mirror];

    let potentialPath = {
      x1: currentPos.x, y1: currentPos.y,
      x2: targetPos.x,  y2: targetPos.y
    };

    // Check 1: does the new laser segment cross any existing visited mirror?
    let blocked = false;
    for (let visitedMirror of visited) {
      if (visitedMirror === current) continue;
      let mPos = mirror5_mirrorPositions[visitedMirror];
      let angle = mirror5_mirrorAngles[visitedMirror] || 0;
      let rad = radians(angle);
      let mdx = cos(rad) * lineLength / 2;
      let mdy = sin(rad) * lineLength / 2;
      let mirrorLine = { x1: mPos.x - mdx, y1: mPos.y - mdy, x2: mPos.x + mdx, y2: mPos.y + mdy };
      if (mirror5_segmentsIntersect(potentialPath, mirrorLine)) { blocked = true; break; }
    }
    if (blocked) continue;

    // Check 2: would the new mirror (at any angle) cross existing laser paths?
    let mirrorBlocked = false;
    for (let testAngle = 0; testAngle < 180; testAngle += 15) {
      let rad = radians(testAngle);
      let mdx = cos(rad) * lineLength / 2;
      let mdy = sin(rad) * lineLength / 2;
      let potentialMirror = { x1: targetPos.x - mdx, y1: targetPos.y - mdy, x2: targetPos.x + mdx, y2: targetPos.y + mdy };
      for (let laserPath of laserPaths) {
        if (mirror5_segmentsIntersect(potentialMirror, laserPath)) { mirrorBlocked = true; break; }
      }
      if (mirrorBlocked) break;
    }
    if (mirrorBlocked) continue;

    validMoves.push(mirror);
  }

  return validMoves;
}

function mirror5_lineLength() {
  let margin = 30;
  let gridSize = min(width - margin * 2, height - margin * 2) * 0.85;
  let cellSize = gridSize / 7;
  return cellSize * 0.6;
}

function mirror5_segmentsIntersect(line1, line2) {
  let x1 = line1.x1, y1 = line1.y1, x2 = line1.x2, y2 = line1.y2;
  let x3 = line2.x1, y3 = line2.y1, x4 = line2.x2, y4 = line2.y2;

  let denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (abs(denom) < 0.0001) return false;

  let t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  let u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  let m = 0.01;
  return (t > m && t < 1 - m && u > m && u < 1 - m);
}

function mirror5_borderIntersection(x, y, angle) {
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
