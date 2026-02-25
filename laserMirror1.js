// ============================================
// LASER MIRROR 1 - Grid Reflections
// ============================================

// Toy-specific state variables
let mirror1_gridLines = [];
let mirror1_gridRows = 3;
let mirror1_gridCols = 3;
let mirror1_gridSize = 500;
let mirror1_lineLength = 50;

// Define angle for each line in the grid (in degrees)
let mirror1_lineAngles = [
  [120, 37, 90],    // Row 1
  [45, 70, 120],    // Row 2
  [45, -45, 0]      // Row 3
];

function drawLaserMirror1() {
  // Initialize grid if not already done
  if (mirror1_gridLines.length === 0) {
    mirror1_initializeGrid();
  }
  
  // Calculate spacing based on grid size
  let spacingX = mirror1_gridSize / (mirror1_gridCols + 1);
  let spacingY = mirror1_gridSize / (mirror1_gridRows + 1);
  
  // Center the grid on the canvas
  let gridStartX = (width - mirror1_gridSize) / 2;
  let gridStartY = (height - mirror1_gridSize) / 2;
  
  // Trace the bouncing laser ray (drawn first, mirrors go on top)
  stroke(laserColor);
  strokeWeight(laserWeight);
  
  let rayX = 0;
  let rayY = height / 2;
  let rayAngle = 0; // Traveling horizontally to the right
  let maxBounces = 20;
  
  for (let bounce = 0; bounce < maxBounces; bounce++) {
    // Find next intersection
    let closestDist = Infinity;
    let closestHit = null;
    let hitType = null; // 'grid' or 'border'
    
    let dx = cos(radians(rayAngle));
    let dy = sin(radians(rayAngle));
    
    // Check intersection with each grid line
    for (let gridLine of mirror1_gridLines) {
      let hit = mirror1_rayLineIntersection(rayX, rayY, dx, dy, gridLine, mirror1_lineLength);
      if (hit && hit.dist > 0.01 && hit.dist < closestDist) {
        closestDist = hit.dist;
        closestHit = { x: hit.x, y: hit.y, gridLine: gridLine };
        hitType = 'grid';
      }
    }
    
    // Check intersection with borders
    let borderHit = mirror1_rayBorderIntersection(rayX, rayY, dx, dy);
    if (borderHit && borderHit.dist > 0.01 && borderHit.dist < closestDist) {
      closestDist = borderHit.dist;
      closestHit = { x: borderHit.x, y: borderHit.y };
      hitType = 'border';
    }
    
    if (!closestHit) break; // No intersection found
    
    // Draw line segment to hit point
    line(rayX, rayY, closestHit.x, closestHit.y);
    
    // If fill is enabled, could add fill shapes here
    if (useFill && hitType === 'grid') {
      fill(fillColor);
      noStroke();
      // Draw a small circle at bounce point
      ellipse(closestHit.x, closestHit.y, 5, 5);
      stroke(laserColor);
      strokeWeight(laserWeight);
      noFill();
    }
    
    if (hitType === 'border') {
      // Hit border, stop
      break;
    } else {
      // Hit grid line, reflect
      let mirrorAngle = closestHit.gridLine.angle;
      
      // Check if ray is parallel to mirror (passes through)
      let angleDiff = abs((rayAngle % 180) - (mirrorAngle % 180));
      if (angleDiff < 1 || angleDiff > 179) {
        // Parallel, pass through
        rayX = closestHit.x + dx * 0.1;
        rayY = closestHit.y + dy * 0.1;
        continue;
      }
      
      // Calculate reflection
      rayAngle = 2 * mirrorAngle - rayAngle;
      
      // Move slightly past intersection to avoid re-hitting same line
      rayX = closestHit.x + cos(radians(rayAngle)) * 0.1;
      rayY = closestHit.y + sin(radians(rayAngle)) * 0.1;
    }
  }

  // Draw mirrors on top of laser
  stroke(mirrorColor);
  strokeWeight(mirrorWeight);
  noFill();

  for (let gridLine of mirror1_gridLines) {
    push();
    translate(gridLine.x, gridLine.y);
    rotate(radians(gridLine.angle));
    line(-mirror1_lineLength / 2, 0, mirror1_lineLength / 2, 0);
    pop();
  }
}

function laserMirror1_mousePressed() {
  // Find which grid cell was clicked and rotate that mirror line
  let spacingX = mirror1_gridSize / (mirror1_gridCols + 1);
  let spacingY = mirror1_gridSize / (mirror1_gridRows + 1);
  let gridStartX = (width - mirror1_gridSize) / 2;
  let gridStartY = (height - mirror1_gridSize) / 2;
  
  // Find closest grid line to click
  let closestIndex = -1;
  let closestDist = Infinity;
  
  for (let i = 0; i < mirror1_gridLines.length; i++) {
    let gridLine = mirror1_gridLines[i];
    let d = dist(mouseX, mouseY, gridLine.x, gridLine.y);
    if (d < closestDist && d < 50) { // Within 50 pixels
      closestDist = d;
      closestIndex = i;
    }
  }
  
  if (closestIndex !== -1) {
    // Rotate the closest mirror so its normal faces the mouse
    let gridLine = mirror1_gridLines[closestIndex];
    let dx = mouseX - gridLine.x;
    let dy = mouseY - gridLine.y;
    
    // Calculate angle to mouse
    let angleToMouse = degrees(atan2(dy, dx));
    
    // Subtract 90 degrees so the perpendicular faces the mouse
    let newAngle = angleToMouse - 90;
    
    mirror1_gridLines[closestIndex].angle = newAngle;
    
    // Update the stored angles array
    let row = floor(closestIndex / mirror1_gridCols);
    let col = closestIndex % mirror1_gridCols;
    mirror1_lineAngles[row][col] = newAngle;
  }
}

// Helper function: initialize grid
function mirror1_initializeGrid() {
  let spacingX = mirror1_gridSize / (mirror1_gridCols + 1);
  let spacingY = mirror1_gridSize / (mirror1_gridRows + 1);
  let gridStartX = (width - mirror1_gridSize) / 2;
  let gridStartY = (height - mirror1_gridSize) / 2;
  
  mirror1_gridLines = [];
  for (let row = 1; row <= mirror1_gridRows; row++) {
    for (let col = 1; col <= mirror1_gridCols; col++) {
      let x = gridStartX + col * spacingX;
      let y = gridStartY + row * spacingY;
      let angle = mirror1_lineAngles[row - 1][col - 1];
      mirror1_gridLines.push({ x, y, angle });
    }
  }
}

// Helper function: ray-line segment intersection
function mirror1_rayLineIntersection(rayX, rayY, rayDx, rayDy, gridLine, segmentLength) {
  let segAngle = radians(gridLine.angle);
  let segDx = cos(segAngle);
  let segDy = sin(segAngle);
  let segX1 = gridLine.x - segDx * segmentLength / 2;
  let segY1 = gridLine.y - segDy * segmentLength / 2;
  
  let cross = rayDx * segDy - rayDy * segDx;
  if (abs(cross) < 0.0001) return null; // Parallel
  
  let dx = segX1 - rayX;
  let dy = segY1 - rayY;
  
  let t1 = (dx * segDy - dy * segDx) / cross;
  let t2 = (dx * rayDy - dy * rayDx) / cross;
  
  if (t1 >= 0 && t2 >= 0 && t2 <= segmentLength) {
    return {
      x: rayX + rayDx * t1,
      y: rayY + rayDy * t1,
      dist: t1
    };
  }
  return null;
}

// Helper function: ray-border intersection
function mirror1_rayBorderIntersection(rayX, rayY, rayDx, rayDy) {
  let hits = [];
  
  // Right border
  if (rayDx > 0) {
    let t = (width - rayX) / rayDx;
    let y = rayY + rayDy * t;
    if (y >= 0 && y <= height) {
      hits.push({ x: width, y: y, dist: t });
    }
  }
  
  // Left border
  if (rayDx < 0) {
    let t = (0 - rayX) / rayDx;
    let y = rayY + rayDy * t;
    if (y >= 0 && y <= height) {
      hits.push({ x: 0, y: y, dist: t });
    }
  }
  
  // Bottom border
  if (rayDy > 0) {
    let t = (height - rayY) / rayDy;
    let x = rayX + rayDx * t;
    if (x >= 0 && x <= width) {
      hits.push({ x: x, y: height, dist: t });
    }
  }
  
  // Top border
  if (rayDy < 0) {
    let t = (0 - rayY) / rayDy;
    let x = rayX + rayDx * t;
    if (x >= 0 && x <= width) {
      hits.push({ x: x, y: 0, dist: t });
    }
  }
  
  // Return closest hit
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.dist - b.dist);
  return hits[0];
}