// ─── commands/edit-mode.js ──────────────────────────────────────────────────
// /edit-mode — 다른 기능들의 옵션을 켜고 끄는 설정 패널.
// 여기서 바꾼 값은 getSettings()/saveSettings()를 통해 SillyTavern 서버에 저장되므로,
// Termux 서버에 접속하는 어떤 기기(아이폰 포함)에서 봐도 같은 값이 적용됨.

import { SlashCommandParser } from '/scripts/slash-commands/SlashCommandParser.js';
import { SlashCommand } from '/scripts/slash-commands/SlashCommand.js';
import { getSettings, saveSettings } from '../state.js';
import { createPanel, getPanelBody, checkRow } from '../panel-ui.js';

export function openEditModePanel() {
    const settings = getSettings();
    const panel = createPanel('ct-edit-mode-panel', '편집모드');
    const body = getPanelBody(panel);

    body.appendChild(checkRow(
        '하이라이트 사용',
        () => settings.hlEnabled,
        (v) => { settings.hlEnabled = v; saveSettings(); },
    ));
    body.appendChild(checkRow(
        '퀵 메뉴 사용',
        () => settings.quickEditEnabled,
        (v) => { settings.quickEditEnabled = v; saveSettings(); },
    ));
}

export function registerEditModeCommand() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'edit-mode',
        helpString: '편집모드 패널을 엽니다. (/find 하이라이트, 빠른수정 아이콘 켬/끔)',
        callback: async () => {
            openEditModePanel();
            return '';
        },
    }));
}
