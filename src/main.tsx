import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/cyrillic-400.css';
import '@fontsource/rubik/cyrillic-700.css';
import '@fontsource/russo-one/latin-400.css';
import '@fontsource/russo-one/cyrillic-400.css';
import './ui/styles.css';

const params = new URLSearchParams(location.search);

if (import.meta.env.DEV && params.has('viewer')) {
  import('./dev/viewer').then((m) => m.runViewer());
} else if (import.meta.env.DEV && params.get('dev') === 'battle') {
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
