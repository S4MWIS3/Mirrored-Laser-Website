// ============================================
// LASER MIRROR 2 - Grid with Random Angles
// ============================================

// Toy-specific state variables
let mirror2_gridLines = [];
let mirror2_gridRows = 5;
let mirror2_gridCols = 5;
let mirror2_gridSize = 500;
let mirror2_lineLength = 50;
let mirror2_hitMirrors = new Set(); // Track which mirrors were hit by laser

// Angle steps for randomization
const mirror2_angleSteps = [0, 20, 40, 60, 80, 100, 120, 140, 160];

function drawLaserMirror2() {
  // Initialize grid if not already done
  if (mirror2_gridLines.length === 0) {
    mirror2_initializeGrid();
  }
  
  // Calculate spacing based on grid size
  let spacingX = mirror2_gridSize / (mirror2_gridCols + 1);
  let spacingY = mirror2_gridSize / (mirror2_gridRows + 1);
  
  // Center the grid on the canvas
  let gridStartX = (width - mirror2_gridSize) / 2;
  let gridStartY = (height - mirror2_gridSize) / 2;
  
  // Reset hit mirrors tracking
  mirror2_hitMirrors.clear();
  
  // Trace the laser first to determine which mirrors get hit
  let rayX = 0;
  let rayY = height / 2;
  let rayAngle = 0;
  let maxBounces = 50;
  
  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let closestDist = Infinity;
    let closestHit = null;
    let hitType = null;
    
    let dx = cos(radians(rayAngle));
    let dy = sin(radians(rayAngle));
    
    // Check intersection with each grid line
    for (let i = 0; i < mirror2_gridLines.length; i++) {
      let gridLine = mirror2_gridLines[i];
      let hit = mirror2_rayLineIntersection(rayX, rayY, dx, dy, gridLine, mirror2_lineLength);
      if (hit && hit.dist > 0.01 && hit.dist < closestDist) {
        closestDist = hit.dist;
        closestHit = { x: hit.x, y: hit.y, gridLine: gridLine, index: i };
        hitType = 'grid';
      }
    }
    
    // Check intersection with borders
    let borderHit = mirror2_rayBorderIntersection(rayX, rayY, dx, dy);
    if (borderHit && borderHit.dist > 0.01 && borderHit.dist < closestDist) {
      closestDist = borderHit.dist;
      closestHit = { x: borderHit.x, y: borderHit.y };
      hitType = 'border';
    }
    
    if (!closestHit) break;
    
    if (hitType === 'border') {
      break;
    } else {
      // Track this mirror as hit
      mirror2_hitMirrors.add(closestHit.index);
      
      // Hit grid line, reflect
      let mirrorAngle = closestHit.gridLine.angle;
      
      // Check if ray is parallel to mirror (passes through)
      let angleDiff = abs((rayAngle % 180) - (mirrorAngle % 180));
      if (angleDiff < 1 || angleDiff > 179) {
        rayX = closestHit.x + dx * 0.1;
        rayY = closestHit.y + dy * 0.1;
        continue;
      }
      
      // Calculate reflection using proper vector reflection
      let mirrorRad = radians(mirrorAngle);
      let normalX = -sin(mirrorRad);
      let normalY = cos(mirrorRad);
      
      let rayDx = cos(radians(rayAngle));
      let rayDy = sin(radians(rayAngle));
      
      let dot = rayDx * normalX + rayDy * normalY;
      let reflectDx = rayDx - 2 * dot * normalX;
      let reflectDy = rayDy - 2 * dot * normalY;
      
      rayAngle = degrees(atan2(reflectDy, reflectDx));
      
      rayX = closestHit.x + cos(radians(rayAngle)) * 0.1;
      rayY = closestHit.y + sin(radians(rayAngle)) * 0.1;
    }
  }
  
  // Now draw the grid of mirror lines with appropriate opacity
  strokeWeight(mirrorWeight);
  noFill();
  
  for (let i = 0; i < mirror2_gridLines.length; i++) {
    let gridLine = mirror2_gridLines[i];
    
    // Set opacity based on whether this mirror was hit
    if (mirror2_hitMirrors.has(i)) {
      stroke(mirrorColor); // Full opacity
    } else {
      // Create a copy of the color with 50% opacity
      stroke(red(mirrorColor), green(mirrorColor), blue(mirrorColor), 128);
    }
    
    push();
    translate(gridLine.x, gridLine.y);
    rotate(radians(gridLine.angle));
    line(-mirror2_lineLength / 2, 0, mirror2_lineLength / 2, 0);
    pop();
  }
  
  // Now draw the bouncing laser ray
  stroke(laserColor);
  strokeWeight(laserWeight);
  
  rayX = 0;
  rayY = height / 2;
  rayAngle = 0;
  
  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let closestDist = Infinity;
    let closestHit = null;
    let hitType = null;
    
    let dx = cos(radians(rayAngle));
    let dy = sin(radians(rayAngle));
    
    // Check intersection with each grid line
    for (let gridLine of mirror2_gridLines) {
      let hit = mirror2_rayLineIntersection(rayX, rayY, dx, dy, gridLine, mirror2_lineLength);
      if (hit && hit.dist > 0.01 && hit.dist < closestDist) {
        closestDist = hit.dist;
        closestHit = { x: hit.x, y: hit.y, gridLine: gridLine };
        hitType = 'grid';
      }
    }
    
    // Check intersection with borders
    let borderHit = mirror2_rayBorderIntersection(rayX, rayY, dx, dy);
    if (borderHit && borderHit.dist > 0.01 && borderHit.dist < closestDist) {
      closestDist = borderHit.dist;
      closestHit = { x: borderHit.x, y: borderHit.y };
      hitType = 'border';
    }
    
    if (!closestHit) break;
    
    // Draw line segment to hit point
    line(rayX, rayY, closestHit.x, closestHit.y);
    
    if (hitType === 'border') {
      break;
    } else {
      // Hit grid line, reflect
      let mirrorAngle = closestHit.gridLine.angle;
      
      // Check if ray is parallel to mirror (passes through)
      let angleDiff = abs((rayAngle % 180) - (mirrorAngle % 180));
      if (angleDiff < 1 || angleDiff > 179) {
        rayX = closestHit.x + dx * 0.1;
        rayY = closestHit.y + dy * 0.1;
        continue;
      }
      
      // Calculate reflection using proper vector reflection
      let mirrorRad = radians(mirrorAngle);
      let normalX = -sin(mirrorRad);
      let normalY = cos(mirrorRad);
      
      let rayDx = cos(radians(rayAngle));
      let rayDy = sin(radians(rayAngle));
      
      let dot = rayDx * normalX + rayDy * normalY;
      let reflectDx = rayDx - 2 * dot * normalX;
      let reflectDy = rayDy - 2 * dot * normalY;
      
      rayAngle = degrees(atan2(reflectDy, reflectDx));
      
      rayX = closestHit.x + cos(radians(rayAngle)) * 0.1;
      rayY = closestHit.y + sin(radians(rayAngle)) * 0.1;
    }
  }
  
  // Draw border
  stroke(mirrorColor);
  strokeWeight(mirrorWeight);
  noFill();
  rect(0, 0, width, height);
}

function laserMirror2_mousePressed() {
  // Randomize all mirror angles on click
  mirror2_randomizeMirrors();
}

// Helper function: initialize grid with random angles
function mirror2_initializeGrid() {
  let spacingX = mirror2_gridSize / (mirror2_gridCols + 1);
  let spacingY = mirror2_gridSize / (mirror2_gridRows + 1);
  let gridStartX = (width - mirror2_gridSize) / 2;
  let gridStartY = (height - mirror2_gridSize) / 2;
  
  mirror2_gridLines = [];
  for (let row = 1; row <= mirror2_gridRows; row++) {
    for (let col = 1; col <= mirror2_gridCols; col++) {
      let x = gridStartX + col * spacingX;
      let y = gridStartY + row * spacingY;
      let angle = random(mirror2_angleSteps);
      mirror2_gridLines.push({ x, y, angle });
    }
  }
}

// Helper function: randomize mirrors
function mirror2_randomizeMirrors() {
  for (let i = 0; i < mirror2_gridLines.length; i++) {
    mirror2_gridLines[i].angle = random(mirror2_angleSteps);
  }
}

// Helper function: ray-line segment intersection
function mirror2_rayLineIntersection(rayX, rayY, rayDx, rayDy, gridLine, segmentLength) {
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
function mirror2_rayBorderIntersection(rayX, rayY, rayDx, rayDy) {
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