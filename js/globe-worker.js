importScripts("https://unpkg.com/three@0.150.0/build/three.min.js");

let renderer, scene, camera;
let earthGroup = new THREE.Group(); 
let arcs = [];

// INTRO ANIMATION VARIABLES
let isIntroAnimation = true;
let introProgress = 0;

// CONFIGURATION
const GLOBE_RADIUS = 100;
const N_ARCS = 25; 
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899"];

self.onmessage = function (e) {
  const data = e.data;

  if (data.type === "INIT") {
    const canvas = data.canvas;

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(data.pixelRatio);
    renderer.setSize(data.width, data.height, false);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#000b1a", 0.002);

    camera = new THREE.PerspectiveCamera(45, data.width / data.height, 1, 1000);
    camera.position.z = 400; 

    scene.add(earthGroup);

    // 1. ADD LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.5); 
    frontLight.position.set(0, 1000, 400); 
    scene.add(frontLight);

    // 2. CREATE EARTH SKIN
    const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const textureLoader = new THREE.ImageBitmapLoader();
    
    textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-dark.jpg",
      (imageBitmap) => {
        const texture = new THREE.Texture(imageBitmap);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        
        const material = new THREE.MeshPhongMaterial({ 
            map: texture,
            shininess: 15
        });
        const earthMesh = new THREE.Mesh(geometry, material);
        earthGroup.add(earthMesh);

        // 3. BULLETPROOF DEEP BLUE GLOW
        const atmosGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, 64, 64);
        const atmosMaterial = new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            void main() {
              // max() safely prevents the GPU from crashing
              float intensity = pow(max(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 0.0), 2.0);
              vec3 glowColor = vec3(0.15, 0.35, 1.0);
              gl_FragColor = vec4(glowColor * intensity * 0.4, intensity);
            }
          `,
          blending: THREE.AdditiveBlending, 
          side: THREE.BackSide, 
          transparent: true,
          depthWrite: false
        });

        const atmosMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
        earthGroup.add(atmosMesh);

        // 4. GENERATE ARCS (Bulletproof LineBasicMaterial)
        createArcs();

        // GLOBE KO STARTING MEIN CHOTA KAR DO
        earthGroup.scale.set(0.001, 0.001, 0.001);

        // START ANIMATION LOOP
        animate();
      }
    );
  } else if (data.type === "RESIZE" && renderer && camera) {
    camera.aspect = data.width / data.height;
    camera.updateProjectionMatrix();
    renderer.setSize(data.width, data.height, false);
  }
};

// --- MATH UTILITIES ---

function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    
    return new THREE.Vector3(x, y, z);
}

function getCurveFromLatLng(lat1, lng1, lat2, lng2) {
    const p1 = latLngToVector3(lat1, lng1, GLOBE_RADIUS);
    const p2 = latLngToVector3(lat2, lng2, GLOBE_RADIUS);

    const distance = p1.distanceTo(p2);
    const midPoint = p1.clone().lerp(p2, 0.5);

    const maxAltitude = GLOBE_RADIUS + (distance * 0.4); 
    midPoint.normalize().multiplyScalar(maxAltitude);

    const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
    return curve.getPoints(100); 
}

// --- GENERATE ARCS ---

function createArcs() {
  for (let i = 0; i < N_ARCS; i++) {
    const startLat = (Math.random() - 0.5) * 180;
    const startLng = (Math.random() - 0.5) * 360;
    const endLat = (Math.random() - 0.5) * 180;
    const endLng = (Math.random() - 0.5) * 360;

    const curvePoints = getCurveFromLatLng(startLat, startLng, endLat, endLng);
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Using the stable LineBasicMaterial
    const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(randomColor),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending 
    });

    const arcLine = new THREE.Line(geometry, material);
    arcLine.geometry.setDrawRange(0, 0); 

    arcs.push({
      mesh: arcLine,
      progress: Math.random(), 
      speed: 0.005 + Math.random() * 0.008 
    });

    earthGroup.add(arcLine);
  }
}

// --- ANIMATION ENGINE ---

function animate() {
  requestAnimationFrame(animate);

  // === INTRO ANIMATION LOGIC ===
  if (isIntroAnimation) {
    introProgress += 0.015; 
    
    let scale = 1 - Math.pow(1 - introProgress, 3);
    earthGroup.scale.set(scale, scale, scale);
    
    earthGroup.rotation.y -= 0.04 * (1 - introProgress);
    
    if (introProgress >= 1) {
        isIntroAnimation = false;
        earthGroup.scale.set(1, 1, 1); 
    }
  } else {
    // NORMAL BEHAVIOR
    earthGroup.rotation.y += 0.001; 
  }

  // === COMET ANIMATION ===
  const N_POINTS = 100;
  const TAIL_LENGTH = 20;

  arcs.forEach((arc) => {
    arc.progress += arc.speed;
    
    if (arc.progress > 1.2) {
        arc.progress = -0.2; 
    }

    const currentPoint = Math.floor(arc.progress * N_POINTS);
    const startPoint = Math.max(0, currentPoint - TAIL_LENGTH);
    const pointsToDraw = Math.min(currentPoint, N_POINTS) - startPoint;

    arc.mesh.geometry.setDrawRange(startPoint, Math.max(0, pointsToDraw));
  });

  renderer.render(scene, camera);
}