import { startFx } from './fx.js';
import { bindChrome, showTitle, debugApi } from './ui.js';

startFx(document.getElementById('fx'));
bindChrome();
showTitle();
if (location.search.includes('debug')) window.QD = debugApi;
