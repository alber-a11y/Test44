import '@fontsource/rubik/400.css';
import '@fontsource/rubik/700.css';
import '@fontsource/russo-one/400.css';
import './ui/styles.css';

const params = new URLSearchParams(location.search);

if (params.has('viewer')) {
  import('./dev/viewer').then((m) => m.runViewer());
} else if (params.get('dev') === 'battle') {
  import('./dev/battle').then((m) => m.runBattleDev());
} else {
  Promise.all([import('preact'), import('./ui/App'), import('./app/game')]).then(([{ render, h }, { App }, game]) => {
    render(h(App, {}), document.getElementById('app')!);
    (window as any).__game = game;
    game.boot().catch((e) => {
      console.error(e);
      const b = document.getElementById('boot');
      if (b) b.textContent = 'Error: ' + (e?.message ?? e);
    });
  });
}
