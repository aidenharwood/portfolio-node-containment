export interface Backdrop {
  readonly element: HTMLCanvasElement;
  dispose(): void;
}

export function createBackdrop(): Backdrop {
  const canvas = document.createElement('canvas');
  canvas.className = 'backdrop';
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;
  let frame = 0;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const draw = (now: number) => {
    const time = now / 1000;
    const { width, height } = canvas;
    context.fillStyle = '#04080b';
    context.fillRect(0, 0, width, height);

    context.save();
    context.translate(width / 2, height * 0.62);
    context.strokeStyle = 'rgba(79, 216, 255, 0.08)';
    context.lineWidth = 1;
    const spacing = 48;
    const scroll = (time * 12) % spacing;
    for (let row = -20; row <= 20; row++) {
      const y = row * spacing * 0.5 + scroll * 0.5;
      context.beginPath();
      context.moveTo(-width, y - width * 0.5);
      context.lineTo(width, y + width * 0.5);
      context.moveTo(width, y - width * 0.5);
      context.lineTo(-width, y + width * 0.5);
      context.stroke();
    }
    context.restore();

    const sweep = ((time * 0.15) % 1) * height;
    const gradient = context.createLinearGradient(0, sweep - 80, 0, sweep);
    gradient.addColorStop(0, 'rgba(79, 216, 255, 0)');
    gradient.addColorStop(1, 'rgba(79, 216, 255, 0.06)');
    context.fillStyle = gradient;
    context.fillRect(0, sweep - 80, width, 80);

    const vignette = context.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, Math.max(width, height) * 0.8);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);

  return {
    element: canvas,
    dispose: () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    },
  };
}
