importScripts('https://unpkg.com/three@0.150.0/build/three.min.js');

let renderer, scene, camera;
let earthGroup = new THREE.Group(); // Earth aur Arcs dono isme rahenge
let arcs = [];

self.onmessage = function(e) {
    const data = e.data;

    if (data.type === 'INIT') {
        const canvas = data.canvas;
        
        // Setup Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(data.pixelRatio);
        renderer.setSize(data.width, data.height, false);

        scene = new THREE.Scene();
        // Slight blue atmosphere tint
        scene.fog = new THREE.FogExp2('#000b1a', 0.001); 

        camera = new THREE.PerspectiveCamera(45, data.width / data.height, 1, 1000);
        camera.position.z = 250;
        
        scene.add(earthGroup);

        // 1. CREATE EARTH
        const geometry = new THREE.SphereGeometry(100, 64, 64);
        
        const textureLoader = new THREE.ImageBitmapLoader();
        textureLoader.load('https://unpkg.com/three-globe/example/img/earth-dark.jpg', (imageBitmap) => {
            const texture = new THREE.CanvasTexture(imageBitmap);
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.MeshBasicMaterial({ map: texture });
            
            const earthMesh = new THREE.Mesh(geometry, material);
            earthGroup.add(earthMesh);
            
            // Earth load hone ke 2 second baad rings add karo
            setTimeout(createArcs, 2000); 

            // Start Animation Loop
            animate();
        });
    } 
    
    else if (data.type === 'RESIZE' && renderer && camera) {
        camera.aspect = data.width / data.height;
        camera.updateProjectionMatrix();
        renderer.setSize(data.width, data.height, false);
    }
};

function createArcs() {
    const N_ARCS = 20;
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899'];
    const radius = 101; // Earth se thoda upar

    for(let i=0; i<N_ARCS; i++) {
        // Random points create karo
        const lat = (Math.random() - 0.5) * Math.PI; // -90 to 90
        const lng = (Math.random() - 0.5) * Math.PI * 2; // -180 to 180
        
        // Simple Ring geometry instead of complex flight paths for worker compatibility
        const arcGeometry = new THREE.TorusGeometry( radius + (Math.random()*15), 0.3, 8, 50, Math.PI * (0.3 + Math.random()*0.5) );
        
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const arcMaterial = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(randomColor),
            transparent: true,
            opacity: 0.8
        });

        const arcMesh = new THREE.Mesh(arcGeometry, arcMaterial);
        
        // Randomly position and rotate rings around the earth
        arcMesh.rotation.x = lat;
        arcMesh.rotation.y = lng;
        arcMesh.rotation.z = Math.random() * Math.PI;

        // Save animation data
        arcs.push({
            mesh: arcMesh,
            speed: 0.002 + (Math.random() * 0.005),
            axis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize()
        });

        earthGroup.add(arcMesh);
    }
    console.log("Arcs generated in background thread!");
}

function animate() {
    self.requestAnimationFrame(animate);
    
    // Rotate the whole earth group slowly
    earthGroup.rotation.y += 0.002;
    
    // Animate individual arcs
    arcs.forEach(arc => {
        arc.mesh.rotateOnAxis(arc.axis, arc.speed);
    });

    renderer.render(scene, camera);
}