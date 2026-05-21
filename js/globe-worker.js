importScripts("https://unpkg.com/three@0.150.0/build/three.min.js");

let renderer, scene, camera;
let earthGroup = new THREE.Group(); 
let arcs = [];

// INTRO ANIMATION VARIABLES
let isIntroAnimation = true;
let introProgress = 0;

// CONFIGURATION
const GLOBE_RADIUS = 100;
const N_ARCS = 30; // Thode arcs badha diye taaki video jaisa bhara hua lage
// Exact video matching colors (Pink, Purple, Deep Blue)
const COLORS = ["#ec4899", "#8b5cf6", "#d946ef", "#6366f1"];

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

    const aspect = data.width / data.height;
    const fov = aspect < 1 ? 55 : 45; // Mobile par thoda zoom out
    camera = new THREE.PerspectiveCamera(fov, aspect, 1, 1000);
    camera.position.z = 400; 

    scene.add(earthGroup);

    // 1. ADD LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.5); 
    frontLight.position.set(0, 1000, 400); 
    scene.add(frontLight);

    // 2. CREATE EARTH SKIN
    const isMobile = data.width < 768;
    const globeSegments = isMobile ? 48 : 64;
    const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, globeSegments, globeSegments);
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

        // 4. GENERATE ARCS (Custom Fading Comet Shader)
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
    return curve;
}

// --- GENERATE EXACT VIDEO ARCS (GPU SHADERS) ---

function createArcs() {
  const N_POINTS = 100; // Line resolution

  for (let i = 0; i < N_ARCS; i++) {
    const startLat = (Math.random() - 0.5) * 180;
    const startLng = (Math.random() - 0.5) * 360;
    const endLat = (Math.random() - 0.5) * 180;
    const endLng = (Math.random() - 0.5) * 360;

    const curve = getCurveFromLatLng(startLat, startLng, endLat, endLng);
    const curvePoints = curve.getPoints(N_POINTS - 1); // Get 100 points
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

    // [NEW] Har point ko ek "progress" value di (0.0 se 1.0 tak) taaki tail fade ho sake
    const progressArray = new Float32Array(N_POINTS);
    for(let j = 0; j < N_POINTS; j++) {
        progressArray[j] = j / (N_POINTS - 1);
    }
    geometry.setAttribute('aProgress', new THREE.BufferAttribute(progressArray, 1));

    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    // [NEW] Custom Shader Material for Fading Comet Tail
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(randomColor) },
            uTime: { value: Math.random() * 2.0 }, // Random start time
            uTailLength: { value: 0.25 + Math.random() * 0.2 } // Random tail lengths (25% to 45% of arc)
        },
        vertexShader: `
            attribute float aProgress;
            varying float vProgress;
            void main() {
                vProgress = aProgress;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uTime;
            uniform float uTailLength;
            varying float vProgress;
            void main() {
                float dist = uTime - vProgress;
                float opacity = 0.0;
                
                // Agar point comet ki tail ke andar hai, toh fade effect lagao
                if (dist >= 0.0 && dist <= uTailLength) {
                    opacity = 1.0 - (dist / uTailLength);
                    opacity = pow(opacity, 1.5); // Exponential fade (Premium look)
                }
                
                gl_FragColor = vec4(uColor, opacity);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const arcLine = new THREE.Line(geometry, material);

    arcs.push({
      mesh: arcLine,
      speed: 0.003 + Math.random() * 0.004 // Smooth, variable speeds
    });

    earthGroup.add(arcLine);
  }
}

// --- ANIMATION ENGINE ---

function animate() {
  requestAnimationFrame(animate);

  // === INTRO ANIMATION LOGIC ===
  if (isIntroAnimation) {
    introProgress += 0.01; 
    
    let t = Math.min(introProgress, 1);
    let scale = 1 - Math.pow(1 - t, 3);
    
    earthGroup.scale.set(scale, scale, scale);
    earthGroup.rotation.y = (1 - t) * Math.PI * 0.5; 
    
    if (introProgress >= 1) {
        isIntroAnimation = false;
        earthGroup.scale.set(1, 1, 1);
        earthGroup.rotation.y = 0; 
    }
  } else {
    // NORMAL BEHAVIOR
    earthGroup.rotation.y += 0.001; 
  }

  // === COMET ANIMATION (GPU CONTROLLED) ===
  arcs.forEach((arc) => {
    let uniforms = arc.mesh.material.uniforms;
    uniforms.uTime.value += arc.speed;
    
    // Comet curve cross kar jaye toh usko wapas shuru se bhejo
    if (uniforms.uTime.value > 1.0 + uniforms.uTailLength.value) {
        uniforms.uTime.value = -uniforms.uTailLength.value;
    }
  });

  renderer.render(scene, camera);
}