(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.navigation');
  const closeMenu = () => {
    nav?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
  };
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
      closeMenu(); toggle?.focus();
    }
  });
  nav?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => {
    if (!event.target.closest('.header-inner')) closeMenu();
  });
  const desktopLayout = window.matchMedia('(min-width: 961px)');
  if (desktopLayout.addEventListener) desktopLayout.addEventListener('change', closeMenu);
  else if (desktopLayout.addListener) desktopLayout.addListener(closeMenu);
  const toast = document.querySelector('[role="status"]');
  let toastTimer;
  const announce = message => {
    if (!toast) return;
    toast.textContent = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.textContent = ''; }, 5000);
  };
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch { /* Use the local-file fallback. */ }
    }
    const previous = document.activeElement;
    const area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly', '');
    area.className = 'clipboard-buffer';
    document.body.append(area); area.select();
    const copied = document.execCommand('copy');
    area.remove(); previous?.focus();
    if (!copied) throw new Error('Clipboard unavailable');
  }
  document.querySelectorAll('[data-copy-email]').forEach(button => {
    button.addEventListener('click', async () => {
      try { await copyText(button.dataset.copyEmail); announce('Email address copied.'); }
      catch { announce('Select the email address to copy it manually.'); }
    });
  });
  document.querySelectorAll('[data-copy-signal]').forEach(button => {
    button.addEventListener('click', async () => {
      try { await copyText(button.dataset.copySignal); announce('Signal username copied.'); }
      catch { announce('Select the Signal username to copy it manually.'); }
    });
  });
  document.querySelectorAll('[data-copy-pgp]').forEach(button => {
    button.addEventListener('click', async () => {
      try { await copyText(button.dataset.copyPgp); announce('Full PGP fingerprint copied.'); }
      catch { announce('Open the public key to view and copy its fingerprint.'); }
    });
  });
  document.querySelectorAll('.code-block').forEach(block => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'copy-code'; button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code');
    button.addEventListener('click', async () => {
      try { await copyText(block.querySelector('code').textContent); announce('Code copied.'); }
      catch { announce('Select the code to copy it manually.'); }
    });
    block.prepend(button);
  });
  document.querySelectorAll('[data-gif]').forEach(button => {
    const image = document.getElementById(button.getAttribute('aria-controls'));
    if (!image || image.tagName !== 'IMG' || !button.dataset.still) return;
    const reducedSource = image.closest('picture')?.querySelector('source');
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let playing;
    const setPlaying = next => {
      playing = next;
      const source = playing ? button.dataset.gif : button.dataset.still;
      // Keep the picture fallback in sync, including an explicit Play override.
      if (reducedSource) reducedSource.srcset = source;
      if (image.getAttribute('src') !== source) image.setAttribute('src', source);
      button.textContent = playing ? 'Pause animation' : 'Play animation';
    };
    button.addEventListener('click', () => setPlaying(!playing));
    const followPreference = () => setPlaying(!preference.matches);
    if (preference.addEventListener) preference.addEventListener('change', followPreference);
    else if (preference.addListener) preference.addListener(followPreference);
    followPreference();
  });
  const progress = document.querySelector('.progress-bar');
  if (progress) {
    let frame = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0}%`;
      frame = false;
    };
    const schedule = () => { if (!frame) { frame = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', update);
    update();
  }

  // Motion is an enhancement: content is never hidden while awaiting JavaScript.
  // Links and scrolling stay native, including new tabs, history and file:// use.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && typeof Element.prototype.animate === 'function') {
    const selector = [
      'main h2', 'main h3', 'main p', 'main .actions',
      '.work-card', '.qualification-card', '.credential', '.timeline > li',
      '.personal-photo', '.personal-humour', '.email-card',
      '.article-figure', '.code-block'
    ].join(', ');
    // Reveal paragraphs separately, but keep cards and their contents together.
    const targets = [...document.querySelectorAll(selector)].filter(
      element => !element.parentElement?.closest(selector)
    );
    const seen = new WeakSet();
    const active = new Map();
    let observer;
    const entrance = (element, bounds) => {
      const viewportWidth = document.documentElement.clientWidth;
      const compact = viewportWidth <= 720;
      const heading = element.tagName === 'H2' || element.tagName === 'H3';
      const paragraph = element.tagName === 'P';
      const distance = compact ? 12 : 28;
      let x = 0;
      // Keep lateral movement inside the viewport, including at narrow widths.
      if (heading) x = -Math.min(distance, Math.max(0, bounds.left - 8));
      else if (paragraph) x = Math.min(distance, Math.max(0, viewportWidth - bounds.right - 8));
      const y = heading || paragraph ? (compact ? 6 : 10) : (compact ? 14 : 24);
      return {
        transform: `translate3d(${x}px, ${y}px, 0)`,
        duration: compact ? 560 : heading ? 760 : 700
      };
    };
    const stopMotion = () => {
      observer?.disconnect();
      active.forEach(animation => animation.cancel());
      active.clear();
    };
    const startMotion = () => {
      stopMotion();
      if (reducedMotion.matches) return;
      observer = new IntersectionObserver(entries => {
        const arriving = entries
          .filter(entry => entry.isIntersecting && !seen.has(entry.target))
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
        let sequence = 0;
        for (const entry of arriving) {
          const element = entry.target;
          observer.unobserve(element);
          seen.add(element);
          // Deep links, restored scroll positions and focused controls stay still.
          if (reducedMotion.matches || document.hidden || entry.boundingClientRect.top < 96 || element.contains(document.activeElement)) continue;
          const motion = entrance(element, entry.boundingClientRect);
          const animation = element.animate([
            { opacity: 0, transform: motion.transform },
            { opacity: 1, transform: 'translate3d(0, 0, 0)' }
          ], {
            duration: motion.duration,
            delay: 60 + Math.min(sequence++, 3) * 60,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            // Apply the first frame during the short stagger, then release all styles.
            fill: 'backwards'
          });
          active.set(element, animation);
          animation.onfinish = animation.oncancel = () => active.delete(element);
        }
      }, { threshold: 0, rootMargin: '0px 0px 16px 0px' });
      for (const element of targets) {
        if (seen.has(element)) continue;
        if (element.getBoundingClientRect().top < window.innerHeight) seen.add(element);
        else observer.observe(element);
      }
    };
    document.addEventListener('focusin', event => {
      active.forEach((animation, element) => {
        if (element.contains(event.target)) animation.cancel();
      });
      targets.forEach(element => {
        if (element.contains(event.target)) {
          seen.add(element);
          observer?.unobserve(element);
        }
      });
    });
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', startMotion);
    else if (reducedMotion.addListener) reducedMotion.addListener(startMotion);
    window.addEventListener('pagehide', stopMotion);
    window.addEventListener('pageshow', event => { if (event.persisted) startMotion(); });
    window.addEventListener('beforeprint', stopMotion);
    window.addEventListener('afterprint', startMotion);
    startMotion();
  }
})();
