// ================================
// PIIK.ME - LANDING INTERACTIVITY
// ================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    initWorkerGlobe();
    initMobileMenu();
    initScrollAnimations();
});

function initWorkerGlobe() {
    const canvas = document.getElementById('globeVis');
    if (!canvas) return;

    if (!('transferControlToOffscreen' in canvas)) {
        console.error('OffscreenCanvas is not supported in this browser.');
        return; 
    }

    // Detach canvas from Main Thread
    const offscreenCanvas = canvas.transferControlToOffscreen();

    // Start Worker
    const worker = new Worker('js/globe-worker.js');

    worker.postMessage({ 
        type: 'INIT', 
        canvas: offscreenCanvas,
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: Math.min(window.devicePixelRatio, 1.2)
    }, [offscreenCanvas]); 

    window.addEventListener('resize', () => {
        worker.postMessage({
            type: 'RESIZE',
            width: window.innerWidth,
            height: window.innerHeight
        });
    });

    console.log('Main thread is free! God-Tier Web Worker Active 🚀');
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
