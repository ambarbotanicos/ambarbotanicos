document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');

    let scrolled = false;
    let ticking = false;

    const ON_Y = 160;  // ativa compacto
    const OFF_Y = 10;  // só volta ao normal quase no topo

    function update() {
        const y = window.scrollY;

        if (!scrolled && y > ON_Y) {
            header.classList.add('scrolled');
            scrolled = true;
        } else if (scrolled && y < OFF_Y) {
            header.classList.remove('scrolled');
            scrolled = false;
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
});
