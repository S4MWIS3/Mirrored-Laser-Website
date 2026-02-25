// ============================================
// LASER MIRROR 3 - 7x7 Grid Path Tracer
// A laser snakes through a 7x7 grid of mirrors,
// visiting as many as possible via adjacent moves.
// Click to randomize the path.
// ============================================

// Toy-specific state
const mirror3_MARGIN = 30;

let mirror3_mirrorPositions = {};
let mirror3_mirrorAngles = {};
let mirror3_visitOrder = [];
let mirror3_initialized = false;

// 7x7 grid, position 25 (center) is empty
const mirror3_activeMirrors = [
   1,  2,  3,  4,  5,  6,  7,
   8,  9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21,
  22, 23, 24,     26, 27, 28,
  29, 30, 31, 32, 33, 34, 35,
  36, 37, 38, 39, 40, 41, 42,
  43, 44, 45, 46, 47, 48, 49
];

function drawLaserMirror3() {
  if (!mirror3_initialized) {
    mirror3_calculatePositions();
    mirror3_randomize();
    mirror3_initialized = true;
  }

  let margin = mirror3_MARGIN;
  let gridSize = min(width - margin * 2, height - margin * 2) * 0.85;
  let cellSize = gridSize / 7;
  let lineLength = cellSize * 0.6;

  // Trace laser path first (mirrors drawn on top after)
  stroke(laserColor);
  strokeWeight(laserWeight);
  if (useFill) {
    fill(fillColor);
  } else {
    noFill();
  }

  let rayX = 0;
  let rayY = mirror3_mirrorPositions[mirror3_visitOrder[0]].y;
  let rayAngle = 0;

  // Collect laser points for optional fill shape
  let laserPoints = [[rayX, rayY]];

  for (let i = 0; i < mirror3_visitOrder.length; i++) {
    let targetMirror = mirror3_visitOrder[i];
    let targetPos = mirror3_mirrorPositions[targetMirror];

    laserPoints.push([targetPos.x, targetPos.y]);

    if (i === mirror3_visitOrder.length - 1) {
      // Reflect off last mirror and exit to border
      let mirrorAngle = mirror3_mirrorAngles[targetMirror];
      let mirrorRad = radians(mirrorAngle);
      let normalX = -sin(mirrorRad);
      let normalY = cos(mirrorRad);

      let rayDx = cos(radians(rayAngle));
      let rayDy = sin(radians(rayAngle));
      let dot = rayDx * normalX + rayDy * normalY;
      let reflectDx = rayDx - 2 * dot * normalX;
      let reflectDy = rayDy - 2 * dot * normalY;
      let exitAngle = degrees(atan2(reflectDy, reflectDx));

      let exitPt = mirror3_borderIntersection(targetPos.x, targetPos.y, exitAngle);
      if (exitPt) {
        laserPoints.push([exitPt.x, exitPt.y]);
      }
      break;
    }

    // Reflect for next segment
    let mirrorAngle = mirror3_mirrorAngles[targetMirror];
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

  // Draw laser (as fill shape or polyline)
  if (useFill && laserPoints.length > 2) {
    fill(fillColor);
    noStroke();
    beginShape();
    for (let pt of laserPoints) {
      vertex(pt[0], pt[1]);
    }
    endShape(CLOSE);
    stroke(laserColor);
    strokeWeight(laserWeight);
    noFill();
  }

  // Always draw laser lines on top
  stroke(laserColor);
  strokeWeight(laserWeight);
  noFill();
  for (let i = 0; i < laserPoints.length - 1; i++) {
    line(laserPoints[i][0], laserPoints[i][1], laserPoints[i+1][0], laserPoints[i+1][1]);
  }

  // Draw mirrors on top of laser
  stroke(mirrorColor);
  strokeWeight(mirrorWeight);
  noFill();

  for (let mirrorNum of mirror3_visitOrder) {
    let pos = mirror3_mirrorPositions[mirrorNum];
    let angle = mirror3_mirrorAngles[mirrorNum] || 0;

    push();
    translate(pos.x, pos.y);
    rotate(radians(angle));
    line(-lineLength / 2, 0, lineLength / 2, 0);
    pop();
  }
}

function laserMirror3_mousePressed() {
  mirror3_randomize();
}

// ---- Helpers ----

function mirror3_calculatePositions() {
  let margin = mirror3_MARGIN;
  let gridSize = min(width - margin * 2, height - margin * 2) * 0.85;
  let cellSize = gridSize / 7;
  let startX = (width - gridSize) / 2;
  let startY = (height - gridSize) / 2;

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      let pos = row * 7 + col + 1;
      mirror3_mirrorPositions[pos] = {
        x: startX + col * cellSize + cellSize / 2,
        y: startY + row * cellSize + cellSize / 2
      };
    }
  }
}

function mirror3_randomize() {
  let startMirror = 22; // Middle-left cell
  mirror3_visitOrder = [startMirror];

  let visited = new Set([startMirror]);
  let current = startMirror;
  let attempts = 0;

  while (visited.size < mirror3_activeMirrors.length && attempts < 1000) {
    attempts++;
    let moves = mirror3_getValidMoves(current, visited);
    if (moves.length === 0) {
      // Dead end — restart
      visited = new Set([startMirror]);
      mirror3_visitOrder = [startMirror];
      current = startMirror;
      continue;
    }
    let next = moves[floor(random(moves.length))];
    mirror3_visitOrder.push(next);
    visited.add(next);
    current = next;
  }

  // Calculate mirror angles along visit order
  mirror3_mirrorAngles = {};
  let incomingAngle = 0;

  for (let i = 0; i < mirror3_visitOrder.length; i++) {
    let curr = mirror3_visitOrder[i];

    if (i < mirror3_visitOrder.length - 1) {
      let next = mirror3_visitOrder[i + 1];
      let currPos = mirror3_mirrorPositions[curr];
      let nextPos = mirror3_mirrorPositions[next];

      let dx = nextPos.x - currPos.x;
      let dy = nextPos.y - currPos.y;
      let targetAngle = degrees(atan2(dy, dx));

      // Mirror angle to reflect incoming ray toward target
      let mirrorAngle = (incomingAngle + targetAngle) / 2;
      mirror3_mirrorAngles[curr] = mirrorAngle;

      // Compute outgoing angle via reflection
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
      mirror3_mirrorAngles[curr] = floor(random(12)) * 30;
    }
  }
}

function mirror3_getValidMoves(current, visited) {
  let currentRow = floor((current - 1) / 7);
  let currentCol = (current - 1) % 7;
  let moves = [];

  for (let mirror of mirror3_activeMirrors) {
    if (visited.has(mirror)) continue;
    let targetRow = floor((mirror - 1) / 7);
    let targetCol = (mirror - 1) % 7;
    let rowDiff = abs(targetRow - currentRow);
    let colDiff = abs(targetCol - currentCol);
    if ((rowDiff === 1 && colDiff === 0) || (colDiff === 1 && rowDiff === 0)) {
      moves.push(mirror);
    }
  }
  return moves;
}

function mirror3_borderIntersection(x, y, angle) {
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
