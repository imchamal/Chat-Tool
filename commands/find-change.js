// ─── commands/find-change.js ────────────────────────────────────────────────
// /find, /change — 검색(하이라이트 + 결과 패널), 찾아바꾸기
// 검색옵션(대소문자 구분/띄어쓰기 무시/온전한 단어/태그 무시)은 '옵션' 버튼을
// 눌러야 펼쳐짐 — Slashie의 정규식 엔진을 이식해서 지원.

import { SlashCommandParser } from '/scripts/slash-commands/SlashCommandParser.js';
import { SlashCommand } from '/scripts/slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '/scripts/slash-commands/SlashCommandArgument.js';
import { getChat, editMessage, getSettings } from '../state.js';
import { createPanel, getPanelBody, btn, inputBox, checkRow } from '../panel-ui.js';
import { buildSearchRegex, maskTags } from '../utils.js';
import {
    highlightKeyword, focusNext, focusPrev, clearHighlights,
    getMarkCount, getCurrentIndex, getCurrentMatch,
} from '../highlight.js';

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

// 켜진 옵션들을 "(대소문자, 온전한단어)" 형태로 옅게 표시
function optionBadgesHtml(options) {
    const labels = [];
    if (options?.caseSensitive) labels.push('대소문자');
    if (options?.ignoreSpace) labels.push('띄어쓰기무시');
    if (options?.wholeWord) labels.push('온전한단어');
    if (options?.ignoreTags) labels.push('태그무시');
    if (!labels.length) return '';
    return ` <span class="ct-dim" style="font-size:11px;">(${labels.join(', ')})</span>`;
}

// 패널 제목: "검색어" N개 발견 (옵션뱃지). 위치 표시(#4 (4/23))는
// createPanel이 항상 만들어주는 우측 슬롯(#ct-pos)에 따로 채워짐.
function resultTitleHtml(keyword, count, options) {
    return `"${escapeHtml(keyword)}" <span class="ct-dim">${count}개 발견</span>${optionBadgesHtml(options)}`;
}

// 제목 옆 위치 표시(#메시지번호 (몇번째/전체))를 지금 상태에 맞게 갱신
function updatePositionLabel(panel) {
    const el = panel.querySelector('#ct-pos');
    if (!el) return;
    const total = getMarkCount();
    const match = getCurrentMatch();
    if (!total || !match) { el.textContent = ''; return; }
    el.textContent = `#${match.msgIdx} (${getCurrentIndex() + 1}/${total})`;
}

// 입력 패널에서 공용으로 쓰는 "옵션" 접이식 토글 — 기본은 접힌 상태.
// 반환된 getOptions()로 지금 체크 상태를 읽어옴.
function buildOptionsToggle() {
    const state = { caseSensitive: false, ignoreSpace: false, wholeWord: false, ignoreTags: false };
    const wrap = document.createElement('div');

    const checklist = document.createElement('div');
    checklist.style.cssText = 'display:none; margin-top:2px; margin-bottom:8px;';
    checklist.appendChild(checkRow('대소문자 구분', () => state.caseSensitive, (v) => { state.caseSensitive = v; }));
    checklist.appendChild(checkRow('띄어쓰기 무시', () => state.ignoreSpace, (v) => { state.ignoreSpace = v; }));
    checklist.appendChild(checkRow('온전한 단어', () => state.wholeWord, (v) => { state.wholeWord = v; }));
    checklist.appendChild(checkRow('태그 무시', () => state.ignoreTags, (v) => { state.ignoreTags = v; }));

    const toggleBtn = btn('옵션', () => {
        checklist.style.display = checklist.style.display === 'none' ? '' : 'none';
    });
    wrap.appendChild(toggleBtn);
    wrap.appendChild(checklist);

    return { wrap, getOptions: () => ({ ...state }) };
}

// ── /find ────────────────────────────────────────────────────────────────────

function runFind(keyword, options = {}) {
    const settings = getSettings();
    if (!settings.hlEnabled) { toastr.info('편집모드(/edit-mode)에서 하이라이트가 꺼져있습니다.'); return; }

    const count = highlightKeyword(keyword, options);
    if (!count) { toastr.info('검색 결과가 없습니다.'); return; }

    const panel = createPanel('ct-find-panel', resultTitleHtml(keyword, count, options), () => clearHighlights());
    const body = getPanelBody(panel);
    const row = document.createElement('div');
    row.appendChild(btn('◀ 이전', () => { focusPrev(); updatePositionLabel(panel); }));
    row.appendChild(btn('다음 ▶', () => { focusNext(); updatePositionLabel(panel); }));
    body.appendChild(row);

    updatePositionLabel(panel);
}

function openFindInputPanel() {
    const panel = createPanel('ct-find-panel', '검색');
    const body = getPanelBody(panel);
    const input = inputBox('검색어를 입력하세요');
    body.appendChild(input);
    const { wrap: optWrap, getOptions } = buildOptionsToggle();
    body.appendChild(optWrap);

    const doFind = () => {
        const kw = input.value.trim();
        if (!kw) return;
        const options = getOptions();
        panel.remove();
        runFind(kw, options);
    };
    body.appendChild(btn('검색', doFind));
    input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        doFind();
    });
    input.focus();
}

// ── /change ──────────────────────────────────────────────────────────────────

// 메시지 전체(채팅 전체)에서 find를 replace로 전부 바꿈. 옵션(대소문자/띄어쓰기/
// 온전한단어/태그무시)에 맞는 정규식으로 원본 텍스트(msg.mes)를 직접 치환.
async function runChangeAll(find, replace, options = {}) {
    if (!find) { toastr.error('원본텍스트가 비어있습니다.'); return; }
    const chat = getChat();
    let changedCount = 0;
    for (let idx = 0; idx < chat.length; idx++) {
        const msg = chat[idx];
        if (!msg) continue;
        const raw = msg.mes;
        const searchText = options.ignoreTags ? maskTags(raw) : raw;
        const re = buildSearchRegex(find, options);

        const found = [];
        let m;
        while ((m = re.exec(searchText)) !== null) {
            if (m.index === re.lastIndex) { re.lastIndex++; continue; }
            found.push({ start: m.index, end: m.index + m[0].length });
        }
        if (!found.length) continue;

        let newMes = '';
        let cursor = 0;
        found.forEach(({ start, end }) => {
            newMes += raw.slice(cursor, start) + replace;
            cursor = end;
        });
        newMes += raw.slice(cursor);

        await editMessage(idx, newMes);
        changedCount++;
    }
    if (changedCount) toastr.success(`${changedCount}개 메시지에서 바꿨습니다.`);
    else toastr.info('일치하는 내용이 없습니다.');
}

function showChangeResultPanel(find, replaceValue, options) {
    const panel = createPanel('ct-change-panel', resultTitleHtml(find, getMarkCount(), options), () => clearHighlights());
    const body = getPanelBody(panel);
    updatePositionLabel(panel);

    const replaceInput = inputBox('바꿀 텍스트');
    replaceInput.value = replaceValue;
    body.appendChild(replaceInput);

    // 이전/다음 화살표는 "하나씩 검토"를 누르기 전까지 숨겨둠
    const navRow = document.createElement('div');
    navRow.style.display = 'none';
    navRow.appendChild(btn('◀ 이전', () => { focusPrev(); updatePositionLabel(panel); }));
    navRow.appendChild(btn('다음 ▶', () => { focusNext(); updatePositionLabel(panel); }));
    body.appendChild(navRow);

    const actionRow = document.createElement('div');
    actionRow.className = 'ct-action-row';

    const reviewBtn = btn('하나씩 검토', () => {
        navRow.style.display = '';
        reviewBtn.style.visibility = 'hidden';
        reviewBtn.disabled = true;
    });
    actionRow.appendChild(reviewBtn);

    const allBtn = btn('모두 바꾸기', async () => {
        clearHighlights();
        panel.remove();
        await runChangeAll(find, replaceInput.value, options);
    });
    allBtn.classList.add('ct-btn-primary');
    actionRow.appendChild(allBtn);

    body.appendChild(actionRow);
}

function runChangeSearch(find, replaceValue, options = {}) {
    const settings = getSettings();
    if (!settings.hlEnabled) { toastr.info('편집모드(/edit-mode)에서 하이라이트가 꺼져있습니다.'); return; }

    const count = highlightKeyword(find, options);
    if (!count) { toastr.info('검색 결과가 없습니다.'); return; }

    showChangeResultPanel(find, replaceValue, options);
}

function openChangeInputPanel() {
    const panel = createPanel('ct-change-panel', '찾아바꾸기');
    const body = getPanelBody(panel);
    const findInput = inputBox('찾을 텍스트');
    body.appendChild(findInput);
    const { wrap: optWrap, getOptions } = buildOptionsToggle();
    body.appendChild(optWrap);

    const doSearch = () => {
        const find = findInput.value.trim();
        if (!find) return;
        const options = getOptions();
        panel.remove();
        runChangeSearch(find, '', options);
    };
    body.appendChild(btn('검색', doSearch));
    findInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        doSearch();
    });
    findInput.focus();
}

// ── 명령어 등록 ────────────────────────────────────────────────────────────────

export function registerFindChangeCommands() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'find',
        helpString: '채팅에서 검색합니다. 사용법: /find 키워드, 또는 키워드 없이 /find 만 입력하면 옵션을 고를 수 있는 입력 패널이 뜹니다.',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({ description: '검색어 (생략시 입력 패널)', typeList: [ARGUMENT_TYPE.STRING], isRequired: false }),
        ],
        callback: async (_a, value) => {
            const keyword = String(value ?? '').trim();
            if (!keyword) { openFindInputPanel(); return ''; }
            runFind(keyword);
            return '';
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'change',
        helpString: '채팅에서 찾아 바꿉니다. 검색 후 검토/바꾸기를 선택합니다. 사용법: /change 원본텍스트/바꿀텍스트, 또는 인자 없이 /change 만 입력하면 옵션을 고를 수 있는 입력 패널이 뜹니다.',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({ description: '원본/바꿀텍스트 (생략시 입력 패널)', typeList: [ARGUMENT_TYPE.STRING], isRequired: false }),
        ],
        callback: async (_a, value) => {
            const raw = String(value ?? '');
            if (!raw.trim()) { openChangeInputPanel(); return ''; }
            const slashIdx = raw.indexOf('/');
            if (slashIdx === -1) { toastr.error('사용법: /change 원본텍스트/바꿀텍스트'); return ''; }
            const find = raw.slice(0, slashIdx);
            const replace = raw.slice(slashIdx + 1);
            runChangeSearch(find, replace);
            return '';
        },
    }));
}
