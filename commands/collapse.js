// ─── commands/collapse.js ───────────────────────────────────────────────────
// /collapse, /expand — 메시지를 <details> 태그로 접고 펼치기

import { SlashCommandParser } from '/scripts/slash-commands/SlashCommandParser.js';
import { SlashCommand } from '/scripts/slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '/scripts/slash-commands/SlashCommandArgument.js';
import { parseRange } from '../utils.js';
import { getChat, editMessage } from '../state.js';

const SUMMARY = '접힌 메시지';

export function registerCollapseCommands() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'collapse',
        helpString: '메시지를 접습니다. 사용법: /collapse 2 또는 /collapse 2-5',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({ description: '메시지 번호 또는 범위', typeList: [ARGUMENT_TYPE.STRING], isRequired: true }),
        ],
        callback: async (_a, value) => {
            const idxs = parseRange(value);
            if (!idxs) { toastr.error('사용법: /collapse 2 또는 /collapse 2-5'); return ''; }
            for (const idx of idxs) {
                const msg = getChat()[idx];
                if (!msg || msg.mes.includes(`<summary>${SUMMARY}</summary>`)) continue;
                await editMessage(idx, `<details>\n<summary>${SUMMARY}</summary>\n\n${msg.mes}\n\n</details>`);
            }
            return '';
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'expand',
        helpString: '접힌 메시지를 펼칩니다. 사용법: /expand 2 또는 /expand 2-5',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({ description: '메시지 번호 또는 범위', typeList: [ARGUMENT_TYPE.STRING], isRequired: true }),
        ],
        callback: async (_a, value) => {
            const idxs = parseRange(value);
            if (!idxs) { toastr.error('사용법: /expand 2 또는 /expand 2-5'); return ''; }
            for (const idx of idxs) {
                const msg = getChat()[idx];
                if (!msg) continue;
                const m = msg.mes.match(/^<details>\n<summary>.*?<\/summary>\n\n([\s\S]*?)\n\n<\/details>$/);
                if (m) await editMessage(idx, m[1]);
            }
            return '';
        },
    }));
}
