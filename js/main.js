import { startFx } from './fx.js';
import { bindChrome, boot, debugApi } from './ui.js';

startFx(document.getElementById('fx'));
bindChrome();
boot();
if (location.search.includes('debug')) window.QD = debugApi;
