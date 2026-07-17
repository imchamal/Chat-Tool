// ─── commands/wordcount.js ──────────────────────────────────────────────────
// /word — 글자수/단어수 세기

import { SlashCommandParser } from '/scripts/slash-commands/SlashCommandParser.js';
import { SlashCommand } from '/scripts/slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '/scripts/slash-commands/SlashCommandArgument.js';
import { parseRange, stripText, countStats } from '../utils.js';
import { getChat } from '../state.js';

export function registerWordCountCommand() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'word',
        helpString: '글자수/단어수를 셉니다. 사용법: /word (전체), /word 2, /word 2-5',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({ description: '메시지 번호 또는 범위 (생략시 전체)', typeList: [ARGUMENT_TYPE.STRING], isRequired: false }),
        ],
        callback: async (_a, value) => {
            const trimmed = String(value ?? '').trim();
            const chat = getChat();
            const idxs = trimmed ? parseRange(trimmed) : chat.map((_, i) => i);
            if (!idxs) { toastr.error('사용법: /word, /word 2, /word 2-5'); return ''; }

            const text = stripText(idxs.map((i) => chat[i]?.mes || '').join('\n'));
            const { chars, charsNoSpace, words } = countStats(text);
            toastr.info(
                `공백 포함: ${chars.toLocaleString()}자<br>공백 제외: ${charsNoSpace.toLocaleString()}자<br>단어수: ${words.toLocaleString()}개`,
                '',
                { timeOut: 8000, escapeHtml: false },
            );
            return '';
        },
    }));
}
