async function boot(root: HTMLElement): Promise<void> {
  try {
    const { startViewer } = await import('./viewer.ts');
    startViewer(root);
  } catch (error) {
    const report = document.createElement('pre');
    report.className = 'load-error';
    report.textContent = `The game content failed to load, so no district can be shown.\n\n${error instanceof Error ? error.message : String(error)}`;
    root.replaceChildren(report);
  }
}

void boot(document.getElementById('editor') as HTMLElement);
