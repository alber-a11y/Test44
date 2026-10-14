const params = new URLSearchParams(location.search);
if (params.has('viewer')) {
  import('./dev/viewer').then((m) => m.runViewer());
} else if (params.get('dev') === 'battle') {
  import('./dev/battle').then((m) => m.runBattleDev());
}
