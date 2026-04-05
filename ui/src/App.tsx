import { EuiProvider } from '@elastic/eui';
import '@elastic/eui-theme-borealis/dist/eui_theme_borealis_colors_dark.css';
import '@elastic/eui-theme-borealis/dist/eui_theme_borealis_colors_light.css';

function App() {
  return (
    <EuiProvider colorMode="dark">
      <div>Hermes A2A Chat — Scaffolding complete</div>
    </EuiProvider>
  );
}

export default App;
