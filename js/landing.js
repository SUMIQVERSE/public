// ================================
// PIIK.ME - LANDING INTERACTIVITY
// ================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    initGlobe();
    initMobileMenu();
    initScrollAnimations();
});

// ================================
// 3D GLOBE VISUALIZATION
// ================================
// ================================
// 3D GLOBE VISUALIZATION (INFINITE PREMIUM UX)
// ================================
function initGlobe() {
    console.log('Initializing globe...');
    const globeContainer = document.getElementById('globeViz');
    
    if (!globeContainer || typeof Globe === 'undefined') return;

    // requestIdleCallback taaki HTML/CSS turant load ho jaye
    window.requestIdleCallback(() => {
        try {
            // 1. GLOBE INITIALIZATION (Hamesha chalta rahega)
            const world = Globe()(globeContainer)
                .globeImageUrl('assets/images/earth-dark.jpg')
                .atmosphereColor('#3b82f6')
                .atmosphereAltitude(0.15)
                .width(globeContainer.offsetWidth || window.innerWidth)
                .height(globeContainer.offsetHeight || window.innerHeight);

            // Hardware Optimization (Saves battery without stopping animation)
            world.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
            world.pointOfView({ altitude: 2.5 });

            // Globe hamesha 0.5 ki mast speed par ghumega
            world.controls().autoRotate = true;
            world.controls().autoRotateSpeed = 0.5;

            // ==========================================
            // LAZY LOAD RINGS (For Initial Load Speed)
            // ==========================================
            // Globe aane ke 3.5 second baad rings smoothly appear hongi
            // aur uske baad HAMESHA chalti rahengi.
            setTimeout(() => {
                console.log('Adding glowing arcs...');
                const N_ARCS = 20;
                const arcsData = [...Array(N_ARCS).keys()].map(() => ({
                    startLat: (Math.random() - 0.5) * 180,
                    startLng: (Math.random() - 0.5) * 360,
                    endLat: (Math.random() - 0.5) * 180,
                    endLng: (Math.random() - 0.5) * 360,
                    color: [['#3b82f6', '#8b5cf6', '#ec4899'][Math.round(Math.random() * 2)], ['#3b82f6', '#8b5cf6', '#ec4899'][Math.round(Math.random() * 2)]]
                }));

                world.arcsData(arcsData)
                    .arcColor('color')
                    .arcDashLength(0.4)
                    .arcDashGap(2)
                    .arcDashInitialGap(1)
                    .arcDashAnimateTime(1000);
            }, 3500);

            // Handle Resize
            window.addEventListener('resize', () => {
                world.width(globeContainer.offsetWidth || window.innerWidth);
                world.height(globeContainer.offsetHeight || window.innerHeight);
            });
            
        } catch (error) {
            console.error('Error initializing globe:', error);
        }
    }, { timeout: 2000 });
}

// ================================
// MOBILE MENU
// ================================
function initMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('mobileMenu');
    const links = document.querySelectorAll('.mobile-link');
    
    if (!toggle || !menu) return;

    let isOpen = false;

    function toggleMenu() {
        isOpen = !isOpen;
        if (isOpen) {
            menu.classList.remove('translate-x-full');
            toggle.innerHTML = '<i class="fas fa-times text-xl"></i>';
            document.body.style.overflow = 'hidden';
        } else {
            menu.classList.add('translate-x-full');
            toggle.innerHTML = '<i class="fas fa-bars text-xl"></i>';
            document.body.style.overflow = '';
        }
    }

    toggle.addEventListener('click', toggleMenu);
    
    // Close on link click
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (isOpen) toggleMenu();
        });
    });
}

// ================================
// SCROLL ANIMATIONS (GSAP)
// ================================
function initScrollAnimations() {
    // Check if GSAP is available
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        try {
            gsap.registerPlugin(ScrollTrigger);

            // Reveal elements on scroll, but exclude the navbar logo
            gsap.utils.toArray('.group:not(.navbar-logo)').forEach(group => {
                gsap.fromTo(group, 
                    { y: 50, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        stagger: 0.2,
                        scrollTrigger: {
                            trigger: group,
                            start: "top 80%",
                            toggleActions: "play none none reverse"
                        }
                    }
                );
            });
        } catch (error) {
            console.warn('GSAP animations not initialized:', error);
        }
    }

    // Navbar Blur Effect (works without GSAP)
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                navbar.classList.add('shadow-lg');
            } else {
                navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                navbar.classList.remove('shadow-lg');
            }
        });
    }
}
