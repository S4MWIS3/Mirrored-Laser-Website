// A3 dimensions in mm
const A3_WIDTH_MM = 420;
const A3_HEIGHT_MM = 297;
const MARGIN_MM = 15;

// Scale for screen preview (pixels per mm)
const SCREEN_SCALE = 2;
let exportMode = false;

function setup() {
  // Start with regular canvas for preview
  let w = A3_WIDTH_MM * SCREEN_SCALE;
  let h = A3_HEIGHT_MM * SCREEN_SCALE;
  createCanvas(w, h);
  pixelDensity(1);
  noLoop();
}

function draw() {
  drawArtwork();
}

function drawArtwork() {
  background(255);
  
  // Convert mm to current canvas units
  let margin = mm(MARGIN_MM);
  
  // IMPORTANT: Plotters draw lines, not fills
  noFill();
  stroke(0);
  strokeWeight(exportMode ? 1 : 2);
  
  // ========================================
  // YOUR ARTWORK GOES HERE
  // ========================================

  // Middle line angle
  let centerX = width / 2;
  let centerY = height / 2;
  let angle = 45; // Angle of the middle line in degrees

  // Draw first line segment (horizontal from left edge to center)
  stroke(255,0,0);
  line(margin, centerY, centerX, centerY);

  // Calculate reflection angle (this is your current logic)
  let reflectionAngle = angle * 2;

  // Calculate direction (guard against zero)
  let dx = cos(radians(reflectionAngle));
  let dy = sin(radians(reflectionAngle));
  if (abs(dx) < 1e-6) dx = 0;
  if (abs(dy) < 1e-6) dy = 0;

  // Find intersection with border edges
  let rightEdge = width - margin;
  let topEdge = margin;
  let bottomEdge = height - margin;

  // Calculate distances to each edge (only if dx/dy non-zero)
  let t = Infinity;
  if (dx !== 0) {
    let tRight = (rightEdge - centerX) / dx;
    if (tRight > 0) t = min(t, tRight);
  }
  if (dy !== 0) {
    let tTop = (topEdge - centerY) / dy;
    let tBottom = (bottomEdge - centerY) / dy;
    if (tTop > 0) t = min(t, tTop);
    if (tBottom > 0) t = min(t, tBottom);
  }

  // Calculate end point (if no intersection found, default to center)
  let endX = centerX;
  let endY = centerY;
  if (isFinite(t)) {
    endX = centerX + dx * t;
    endY = centerY + dy * t;
  }

  // Draw reflected line segment to border
  line(centerX, centerY, endX, endY);

  // Draw the middle "mirror" line
  stroke(0);
  push();
  translate(centerX, centerY);
  rotate(radians(angle));
  line(-100, 0, 100, 0);
  pop();
  
  // Border
  rect(margin, margin, width - margin * 2, height - margin * 2);
}
  // ========================================
  // YOUR ARTWORK ENDS HERE
  // ========================================

// Convert mm to pixels based on current mode
function mm(value) {
  return exportMode ? value * 3.7795 : value * SCREEN_SCALE;
}

// Export function - called by button in HTML
function exportSVG() {
  console.log("Exporting SVG...");
  
  exportMode = true;
  
  // Remove old canvas
  let oldCanvas = select('canvas');
  if (oldCanvas) oldCanvas.remove();
  
  // Create SVG canvas
  createCanvas(
    A3_WIDTH_MM * 3.7795, 
    A3_HEIGHT_MM * 3.7795, 
    SVG
  );
  
  // Draw artwork
  drawArtwork();
  
  // Save
  save('plotter-output.svg');
  
  console.log("SVG saved! Now restoring preview...");
  
  // Wait a moment then restore preview canvas
  setTimeout(() => {
    exportMode = false;
    
    // Remove SVG canvas
    let svgCanvas = select('canvas');
    if (svgCanvas) svgCanvas.remove();
    
    // Wait for DOM to settle
    setTimeout(() => {
      // Recreate preview canvas
      createCanvas(A3_WIDTH_MM * SCREEN_SCALE, A3_HEIGHT_MM * SCREEN_SCALE);
      pixelDensity(1);
      drawArtwork();
      
      console.log("Preview restored. Check Downloads for plotter-output.svg");
    }, 100);
  }, 500);
}