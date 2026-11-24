// Bolhas de gás subindo atrás da lata, num canvas 2D. A bolha é desenhada uma vez num sprite
// e depois só copiada (drawImage), o que custa quase nada por frame.
export function createBubbles(canvas, { count }) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  const bubbles = [];

  const sprite = document.createElement('canvas');
  const S = 64;
  sprite.width = sprite.height = S;
  const s = sprite.getContext('2d');
  s.strokeStyle = 'rgba(255,255,255,0.75)';
  s.lineWidth = 3;
  s.beginPath(); s.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2); s.stroke();
  s.fillStyle = 'rgba(255,255,255,0.18)'; s.fill();
  s.fillStyle = 'rgba(255,255,255,0.85)';
  s.beginPath(); s.arc(S * 0.36, S * 0.34, S * 0.09, 0, Math.PI * 2); s.fill();

  const spawn = (b, initial) => {
    b.x = Math.random() * W;
    b.y = initial ? Math.random() * H : H + 20;
    b.r = 3 + Math.random() * 11;
    b.v = 30 + Math.random() * 70;
    b.w = Math.random() * Math.PI * 2;
    b.a = 0.35 + Math.random() * 0.5;
    return b;
  };

  function resize(w, h) {
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bubbles.length = 0;
    for (let i = 0; i < count; i++) bubbles.push(spawn({}, true));
  }

  function tick(dt, now) {
    ctx.clearRect(0, 0, W, H);
    for (const b of bubbles) {
      b.y -= b.v * dt;
      if (b.y < -20) spawn(b, false);
      const x = b.x + Math.sin(now * 0.0015 + b.w) * 6;
      ctx.globalAlpha = b.a;
      ctx.drawImage(sprite, x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
  }

  return { resize, tick };
}
