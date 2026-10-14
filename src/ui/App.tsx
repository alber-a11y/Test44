import { screen, toast, adPlaying } from '../app/game';
import { Loading, MainMenu, LevelMap } from './screens/Menus';
import { Shop, Forge, Settings } from './screens/Shop';
import { BattleHud } from './screens/Battle';
import { Modals } from './Modals';

export function App() {
  const s = screen.value;
  return (
    <div class="ui-layer" style={{ visibility: adPlaying.value ? 'hidden' : 'visible' }}>
      {s === 'loading' && <Loading />}
      {s === 'menu' && <MainMenu />}
      {s === 'map' && <LevelMap />}
      {s === 'shop' && <Shop />}
      {s === 'forge' && <Forge />}
      {s === 'settings' && <Settings />}
      {s === 'battle' && <BattleHud />}
      <Modals />
      {toast.value && <div class="toast panel">{toast.value}</div>}
    </div>
  );
}
