/**
 * Injects a <style> that disables all CSS transitions, returns a cleanup
 * function that forces a synchronous restyle then removes the <style>.
 *
 * Usage:
 *   const restore = disableTransitions()
 *   // ... apply theme changes ...
 *   restore()
 */
export function disableTransitions(): () => void {
  const style = document.createElement('style');
  style.textContent = [
    '*,*::before,*::after{',
    '-webkit-transition:none!important;',
    '-moz-transition:none!important;',
    '-o-transition:none!important;',
    '-ms-transition:none!important;',
    'transition:none!important',
    '}',
  ].join('');
  document.head.appendChild(style);

  return () => {
    // Force the browser to compute styles with transitions disabled,
    // ensuring the new theme is fully applied before re-enabling.
    window.getComputedStyle(document.body);
    // Remove on next tick so the forced restyle takes effect.
    setTimeout(() => document.head.removeChild(style), 1);
  };
}
