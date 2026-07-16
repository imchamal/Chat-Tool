// ─── index.js ───────────────────────────────────────────────────────────────
// 확장 진입점. 조립만 담당 — 실제 로직은 전부 다른 파일에 있음.
// 새 기능을 추가할 땐 이 파일을 거의 건드리지 않고 commands/index.js에만 등록하면 됨.

import { injectThemeCSS } from './panel-ui.js';
import { registerAllCommands } from './commands/index.js';

(async () => {
    injectThemeCSS();
    registerAllCommands();
})();
