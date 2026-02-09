// ============================================
// LASER MIRROR 0 - Single Mirror Reflection
// ============================================

// Toy-specific state
let mirror0_angle = 45;

function drawLaserMirror0() {
  let centerX = width / 2;
  let centerY = height / 2;

  // Calculate reflection angle
  let reflectionAngle = mirror0_angle * 2;

  // Calculate direction
  let dx = cos(radians(reflectionAngle));
  let dy = sin(radians(reflectionAngle));
  if (abs(dx) < 1e-6) dx = 0;
  if (abs(dy) < 1e-6) dy = 0;

  // Find intersection with border edges
  let rightEdge = width;
  let leftEdge = 0;
  let topEdge = 0;
  let bottomEdge = height;

  // Calculate distances to each edge
  let t = Infinity;
  if (dx !== 0) {
    let tRight = (rightEdge - centerX) / dx;
    let tLeft = (leftEdge - centerX) / dx;
    if (tRight > 0) t = min(t, tRight);
    if (tLeft > 0) t = min(t, tLeft);
  }
  if (dy !== 0) {
    let tTop = (topEdge - centerY) / dy;
    let tBottom = (bottomEdge - centerY) / dy;
    if (tTop > 0) t = min(t, tTop);
    if (tBottom > 0) t = min(t, tBottom);
  }

  // Calculate end point
  let endX = centerX;
  let endY = centerY;
  if (isFinite(t)) {
    endX = centerX + dx * t;
    endY = centerY + dy * t;
  }

  // If fill is enabled, create a closed shape
  if (useFill) {
    fill(fillColor);
    noStroke();
    beginShape();
    vertex(0, centerY);
    vertex(centerX, centerY);
    vertex(endX, endY);
    endShape(CLOSE);
  }

  // Draw first line segment (horizontal from left edge to center)
  stroke(laserColor);
  strokeWeight(laserWeight);
  noFill();
  line(0, centerY, centerX, centerY);

  // Draw reflected line segment to border
  line(centerX, centerY, endX, endY);

  // Draw the middle "mirror" line
  stroke(mirrorColor);
  strokeWeight(mirrorWeight);
  push();
  translate(centerX, centerY);
  rotate(radians(mirror0_angle));
  line(-100, 0, 100, 0);
  pop();
}

function laserMirror0_mousePressed() {
  // Rotate mirror so its perpendicular faces mouse click
  let centerX = width / 2;
  let centerY = height / 2;
  let dx = mouseX - centerX;
  let dy = mouseY - centerY;
  
  // Calculate angle to mouse
  let angleToMouse = degrees(atan2(dy, dx));
  
  // Subtract 90 degrees so the perpendicular faces the mouse
  mirror0_angle = angleToMouse - 90;
}