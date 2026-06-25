/* ============================================================
   ORGANIZADOR DE ESTUDOS — app.js
   ============================================================ */

// ---- CATEGORIAS PADRÃO ----
const DEFAULT_CATS = {
  matematica: { label: 'Matemática', emoji: '📘', color: '#378ADD', light: '#E6F1FB', locked: true },
  portugues:  { label: 'Português',  emoji: '📗', color: '#D4537E', light: '#FBEAF0', locked: true },
  ciencias:   { label: 'Ciências',   emoji: '🔬', color: '#639922', light: '#EAF3DE', locked: true },
  historia:   { label: 'História',   emoji: '🏛️', color: '#BA7517', light: '#FAEEDA', locked: true },
  ingles:     { label: 'Inglês',     emoji: '🌍', color: '#7F77DD', light: '#EEEDFE', locked: true },
  redacao:    { label: 'Redação',    emoji: '✍️', color: '#993C1D', light: '#FAECE7', locked: true },
  geral:      { label: 'Geral',      emoji: '📌', color: '#5F5E5A', light: '#F1EFE8', locked: true },
};

// Paleta de emojis disponíveis para escolha
const EMOJI_OPTIONS = [
  '📘','📗','📙','📕','📓','📔','📒','📖',
  '🔬','🔭','🧪','🧬','⚗️','🧲','🔋','💡',
  '🏛️','🗺️','🌍','🌎','🌏','🗼','🏰','⛩️',
  '🎨','🎭','🎬','🎤','🎵','🎸','🎹','🎺',
  '🏃','⚽','🏀','🎾','🏋️','🤸','🧘','🚴',
  '💻','📱','🖥️','⌨️','🖱️','📡','🛰️','🤖',
  '✍️','📝','📄','📋','🗒️','📊','📈','📉',
  '🌱','🌿','🍀','🌸','🌻','🌲','🍃','🌾',
  '⭐','🎯','🏆','🥇','💡','🔑','🎓','📌',
  '🧠','💭','💬','🗣️','👁️','👂','🤔','💪',
  '🚀','✈️','🚂','🚢','🌐','🗾','🏔️','🌋',
  '🍎','🍕','☕','🎂','🍰','🥗','🍜','🧁',
];

// Paleta de cores disponíveis
const COLOR_OPTIONS = [
  { color: '#378ADD', light: '#E6F1FB' },
  { color: '#D4537E', light: '#FBEAF0' },
  { color: '#639922', light: '#EAF3DE' },
  { color: '#BA7517', light: '#FAEEDA' },
  { color: '#7F77DD', light: '#EEEDFE' },
  { color: '#993C1D', light: '#FAECE7' },
  { color: '#1D9E75', light: '#E1F5EE' },
  { color: '#E24B4A', light: '#FCEBEB' },
  { color: '#5F5E5A', light: '#F1EFE8' },
  { color: '#0F6E56', light: '#E1F5EE' },
  { color: '#533AB7', light: '#EEEDFE' },
  { color: '#185FA5', light: '#E6F1FB' },
];

// ---- CONSTANTES DE CALENDÁRIO ----
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];
const DAYS_LONG  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ---- ESTADO ----
const today = new Date();
today.setHours(0, 0, 0, 0);

let currentDate = new Date(today);
let currentView = 'week';
let showOverdue = false;
let clickedSlot = null;

// Emoji e cor selecionados no modal de categorias
let selectedEmoji = '🎯';
let selectedColor = COLOR_OPTIONS[0];

// ---- PERSISTÊNCIA ----
function loadData(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
  catch (e) { return fallback; }
}
function saveData(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

let events    = loadData('study_events', []);
let customCats = loadData('study_custom_cats', {});   // categorias criadas pelo usuário

// Combina padrão + custom
function getAllCats() {
  return { ...DEFAULT_CATS, ...customCats };
}

function getCat(key) {
  return getAllCats()[key] || DEFAULT_CATS.geral;
}

// ---- UTILITÁRIOS ----
function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function isOverdue(ev) {
  const evEnd = new Date(ev.date + 'T' + (ev.endTime || ev.startTime || '23:59'));
  return evEnd < new Date() && !ev.done;
}

function getWeekStart(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// Gera uma cor "light" clareada a partir da cor principal
function hexToLight(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const mix = v => Math.round(v + (255 - v) * 0.82);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function formatPeriod() {
  if (currentView === 'week') {
    const ws = getWeekStart(currentDate);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    if (ws.getMonth() === we.getMonth())
      return `${ws.getDate()} – ${we.getDate()} de ${MONTHS[ws.getMonth()]} ${ws.getFullYear()}`;
    return `${ws.getDate()} ${MONTHS[ws.getMonth()].slice(0,3)} – ${we.getDate()} ${MONTHS[we.getMonth()].slice(0,3)} ${we.getFullYear()}`;
  }
  if (currentView === 'month')
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  return `${currentDate.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

// ---- SELECT DE CATEGORIAS (modal de evento) ----
function populateCatSelect() {
  const sel = document.getElementById('fCat');
  const prev = sel.value;
  sel.innerHTML = '';
  const cats = getAllCats();
  Object.entries(cats).forEach(([key, cat]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${cat.emoji} ${cat.label}`;
    sel.appendChild(opt);
  });
  if (prev && sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
}

// ---- NAVEGAÇÃO ----
function navigate(dir) {
  if (currentView === 'week')       currentDate.setDate(currentDate.getDate() + dir * 7);
  else if (currentView === 'month') currentDate.setMonth(currentDate.getMonth() + dir);
  else                              currentDate.setDate(currentDate.getDate() + dir);
  render();
}

function goToday() {
  currentDate = new Date(today);
  render();
}

// ---- RENDER PRINCIPAL ----
function render() {
  document.getElementById('periodLabel').textContent = formatPeriod();
  populateCatSelect();

  const main = document.getElementById('mainArea');
  if (currentView === 'week')     main.innerHTML = renderWeekView();
  else if (currentView === 'day') main.innerHTML = renderDayView();
  else                            main.innerHTML = renderMonthView();

  // scroll para hora atual (visão semana/dia)
  const body = document.getElementById('calBody');
  if (body) {
    const nowH = new Date().getHours();
    body.scrollTop = Math.max(0, (nowH - 1) * 48);
    body.addEventListener('click', function (e) {
      const slot = e.target.closest('.time-slot');
      if (slot) {
        clickedSlot = { date: slot.dataset.date, hour: parseInt(slot.dataset.hour) };
        openModal();
      }
    });
  }

  renderMiniCal();
  renderTodo();
}

// ---- VISÃO SEMANAL ----
function renderWeekView() {
  const ws = getWeekStart(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws); d.setDate(ws.getDate() + i); return d;
  });

  let html = '<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">';

  // cabeçalho
  html += '<div class="cal-header"><div></div>';
  days.forEach(d => {
    const isToday = fmtDate(d) === fmtDate(today);
    html += `<div class="cal-header-cell">
      <div class="day-name">${DAYS_LONG[d.getDay()]}</div>
      <div class="day-num${isToday ? ' today' : ''}">${d.getDate()}</div>
    </div>`;
  });
  html += '</div>';

  // corpo com scroll
  html += '<div class="cal-body" id="calBody">';
  html += '<div class="time-grid">';
  for (let h = 0; h < 24; h++) {
    html += `<div class="time-label">${h === 0 ? '' : h + ':00'}</div>`;
    days.forEach((d) => {
      html += `<div class="time-slot" data-date="${fmtDate(d)}" data-hour="${h}"></div>`;
    });
  }
  html += '</div>'; // fecha time-grid

  // camada de eventos FORA do grid, mas dentro do cal-body (position:relative)
  html += '<div id="eventsLayer" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none">';
  const dayEvMap = {};
  days.forEach(d => { dayEvMap[fmtDate(d)] = []; });
  events.forEach(ev => { if (dayEvMap[ev.date] !== undefined) dayEvMap[ev.date].push(ev); });
  days.forEach((d, di) => {
    dayEvMap[fmtDate(d)].forEach(ev => {
      html += buildEventBlock(ev, di, 7);
    });
  });

  const nowH = new Date().getHours(), nowM = new Date().getMinutes();
  html += `<div class="current-time-line" style="top:${(nowH + nowM/60)*48}px"></div>`;
  html += '</div>'; // fecha eventsLayer
  html += '</div>'; // fecha cal-body
  html += '</div>'; // fecha flex container
  return html;
}

function buildEventBlock(ev, colIndex, totalCols) {
  const [sh, sm] = (ev.startTime || '08:00').split(':').map(Number);
  const [eh, em] = (ev.endTime   || (String(sh+1).padStart(2,'0')+':00')).split(':').map(Number);
  const top    = (sh + sm/60) * 48;
  const height = Math.max(24, (eh + em/60 - sh - sm/60) * 48);
  const cat = getCat(ev.cat);
  const od  = isOverdue(ev);
  const leftExpr  = `calc((100% - 48px) / ${totalCols} * ${colIndex} + 48px + 2px)`;
  const widthExpr = `calc((100% - 48px) / ${totalCols} - 4px)`;

  return `<div class="event-block${od ? ' overdue' : ''}" data-id="${ev.id}"
    style="top:${top}px;height:${height}px;left:${leftExpr};width:${widthExpr};
           background:${cat.light};border-left-color:${cat.color};pointer-events:all"
    onclick="openEventDetail('${ev.id}')">
    <div class="ev-title" style="color:${cat.color}">${od ? '⚠️ ' : ''}${cat.emoji} ${ev.title}</div>
    ${height > 28 ? `<div class="ev-time" style="color:${cat.color}">${ev.startTime||''} – ${ev.endTime||''}</div>` : ''}
  </div>`;
}

// ---- VISÃO DIÁRIA ----
function renderDayView() {
  const d = currentDate;
  let html = '<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">';
  html += `<div class="day-header">${DAYS_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}</div>`;
  html += '<div class="cal-body" id="calBody">';
  html += '<div class="time-grid day-time-grid">';
  for (let h = 0; h < 24; h++) {
    html += `<div class="time-label">${h === 0 ? '' : h + ':00'}</div>`;
    html += `<div class="time-slot" data-date="${fmtDate(d)}" data-hour="${h}"></div>`;
  }
  html += '</div>'; // fecha time-grid

  html += '<div id="eventsLayer" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none">';
  events.filter(ev => ev.date === fmtDate(d)).forEach(ev => {
    const [sh, sm] = (ev.startTime || '08:00').split(':').map(Number);
    const [eh, em] = (ev.endTime   || (String(sh+1).padStart(2,'0')+':00')).split(':').map(Number);
    const top    = (sh + sm/60) * 48;
    const height = Math.max(24, (eh + em/60 - sh - sm/60) * 48);
    const cat = getCat(ev.cat);
    const od  = isOverdue(ev);
    html += `<div class="event-block${od ? ' overdue' : ''}" data-id="${ev.id}"
      style="top:${top}px;height:${height}px;left:50px;right:4px;
             background:${cat.light};border-left-color:${cat.color};pointer-events:all"
      onclick="openEventDetail('${ev.id}')">
      <div class="ev-title" style="color:${cat.color}">${od ? '⚠️ ' : ''}${cat.emoji} ${ev.title}</div>
      ${height > 28 ? `<div class="ev-time" style="color:${cat.color}">${ev.startTime} – ${ev.endTime}</div>` : ''}
    </div>`;
  });

  const nowH = new Date().getHours(), nowM = new Date().getMinutes();
  html += `<div class="current-time-line" style="top:${(nowH+nowM/60)*48}px"></div>`;
  html += '</div>'; // fecha eventsLayer
  html += '</div>'; // fecha cal-body
  html += '</div>'; // fecha flex container
  return html;
}

// ---- VISÃO MENSAL ----
function renderMonthView() {
  const y = currentDate.getFullYear(), m = currentDate.getMonth();
  const firstDay  = new Date(y, m, 1);
  const startDow  = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMon = new Date(y, m+1, 0).getDate();
  const prevDays  = new Date(y, m, 0).getDate();

  let html = '<div class="month-view"><div class="month-header-row">';
  ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].forEach(d => {
    html += `<div class="month-header-cell">${d}</div>`;
  });
  html += '</div><div class="month-body">';

  const cells = [];
  for (let i = startDow-1; i >= 0; i--) cells.push({ d: prevDays-i, m: m-1, y, other: true });
  for (let i = 1; i <= daysInMon; i++)   cells.push({ d: i, m, y, other: false });
  const fill = cells.length % 7 === 0 ? 0 : 7 - cells.length % 7;
  for (let i = 1; i <= fill; i++)        cells.push({ d: i, m: m+1, y, other: true });

  cells.forEach(cell => {
    const dt  = new Date(cell.y, cell.m, cell.d);
    const ds  = fmtDate(dt);
    const isT = ds === fmtDate(today);
    const dayEvs = events.filter(ev => ev.date === ds);

    html += `<div class="month-cell${cell.other ? ' other-month' : ''}">`;
    html += `<div class="month-cell-num${isT ? ' today' : ''}">${cell.d}</div>`;
    dayEvs.slice(0, 3).forEach(ev => {
      const cat = getCat(ev.cat);
      const od  = isOverdue(ev);
      html += `<div class="month-event" style="background:${cat.light};color:${cat.color}"
                onclick="openEventDetail('${ev.id}')">${od ? '⚠️ ' : ''}${cat.emoji} ${ev.title}</div>`;
    });
    if (dayEvs.length > 3) html += `<div class="month-more">+${dayEvs.length-3} mais</div>`;
    html += '</div>';
  });

  html += '</div></div>';
  return html;
}

// ---- MINI CALENDÁRIO ----
function renderMiniCal() {
  const y = currentDate.getFullYear(), m = currentDate.getMonth();
  const firstDay  = new Date(y, m, 1);
  const startDow  = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMon = new Date(y, m+1, 0).getDate();
  const prevDays  = new Date(y, m, 0).getDate();

  let html = `<div class="mini-cal-header">
    <span>${MONTHS[m].slice(0,3)} ${y}</span>
    <div class="mini-nav-btns">
      <button class="mini-btn" onclick="miniNav(-1)"><i class="ti ti-chevron-left" style="font-size:12px"></i></button>
      <button class="mini-btn" onclick="miniNav(1)"><i class="ti ti-chevron-right" style="font-size:12px"></i></button>
    </div>
  </div><div class="mini-grid">`;

  ['S','T','Q','Q','S','S','D'].forEach(d => { html += `<div class="mini-day-name">${d}</div>`; });
  for (let i = startDow-1; i >= 0; i--) html += `<div class="mini-day other-month">${prevDays-i}</div>`;
  for (let i = 1; i <= daysInMon; i++) {
    const ds   = fmtDate(new Date(y, m, i));
    const isT  = ds === fmtDate(today);
    const hasEv = events.some(ev => ev.date === ds);
    html += `<div class="mini-day${isT?' today':''}${hasEv?' has-event':''}" onclick="jumpToDate('${ds}')">${i}</div>`;
  }
  html += '</div>';
  document.getElementById('miniCal').innerHTML = html;
}

function miniNav(dir) {
  const mc = new Date(currentDate);
  mc.setMonth(mc.getMonth() + dir);
  currentDate = mc;
  render();
}

// ---- TO-DO SIDEBAR ----
function renderTodo() {
  const ds = currentView === 'day' ? fmtDate(currentDate) : fmtDate(today);
  const todayEvs = events
    .filter(ev => ev.date === ds)
    .sort((a, b) => (a.startTime||'').localeCompare(b.startTime||''));
  const overdueEvs = events.filter(ev => isOverdue(ev) && ev.date !== ds);

  let html = `<div class="todo-label">${currentView === 'day' ? 'Tarefas do dia' : 'Tarefas de hoje'}</div>`;
  if (todayEvs.length === 0) html += '<div class="todo-empty">Nenhuma tarefa</div>';

  todayEvs.forEach(ev => {
    const cat = getCat(ev.cat);
    const od  = isOverdue(ev);
    html += `<div class="todo-item${ev.done?' done':''}" onclick="toggleDone('${ev.id}')">
      <input type="checkbox" ${ev.done?'checked':''} onclick="event.stopPropagation();toggleDone('${ev.id}')">
      <div class="todo-cat-dot" style="background:${cat.color}"></div>
      <div class="todo-text">${cat.emoji} ${ev.title}${od&&!ev.done?'<br><span class="todo-overdue-tag">Atrasada</span>':''}</div>
    </div>`;
  });

  html += `<button class="overdue-toggle" onclick="toggleOverdue()">
    <i class="ti ti-alert-triangle overdue-icon"></i>
    Atrasadas (${overdueEvs.length})
  </button>`;

  if (showOverdue) {
    if (overdueEvs.length === 0) {
      html += '<div class="todo-empty" style="padding:4px 0 0">Nenhuma atrasada!</div>';
    } else {
      overdueEvs.slice(0, 10).forEach(ev => {
        const cat = getCat(ev.cat);
        html += `<div class="todo-item is-overdue" onclick="toggleDone('${ev.id}')">
          <input type="checkbox" onclick="event.stopPropagation();toggleDone('${ev.id}')">
          <div class="todo-cat-dot" style="background:${cat.color}"></div>
          <div class="todo-text">${cat.emoji} ${ev.title}<br><span class="todo-date-tag">${ev.date}</span></div>
        </div>`;
      });
    }
  }

  document.getElementById('todoSection').innerHTML = html;
}

// ---- MODAL DE EVENTO ----
function openModal() {
  const d = clickedSlot ? clickedSlot.date : fmtDate(currentView === 'day' ? currentDate : today);
  const h = clickedSlot ? clickedSlot.hour : 8;
  document.getElementById('fDate').value  = d;
  document.getElementById('fStart').value = String(h).padStart(2,'0') + ':00';
  document.getElementById('fEnd').value   = String(Math.min(h+1, 23)).padStart(2,'0') + ':00';
  document.getElementById('fTitle').value = '';
  document.getElementById('fNotes').value = '';
  document.getElementById('modalBg').classList.add('open');
  setTimeout(() => document.getElementById('fTitle').focus(), 60);
}

function closeModal() {
  document.getElementById('modalBg').classList.remove('open');
  clickedSlot = null;
}

function saveEvent() {
  const title = document.getElementById('fTitle').value.trim();
  if (!title) { document.getElementById('fTitle').focus(); return; }
  events.push({
    id:        'ev_' + Date.now(),
    title,
    cat:       document.getElementById('fCat').value,
    date:      document.getElementById('fDate').value,
    startTime: document.getElementById('fStart').value,
    endTime:   document.getElementById('fEnd').value,
    notes:     document.getElementById('fNotes').value,
    done:      false,
    createdAt: new Date().toISOString(),
  });
  saveData('study_events', events);
  closeModal();
  render();
}

// ---- MODAL DE CATEGORIAS ----
function openCatModal() {
  selectedEmoji = '🎯';
  selectedColor = COLOR_OPTIONS[0];
  document.getElementById('cName').value = '';
  buildEmojiGrid();
  buildColorSwatches();
  renderCatList();
  document.getElementById('catModalBg').classList.add('open');
  // fecha grid de emoji se aberto
  document.getElementById('emojiGrid').classList.remove('open');
  document.getElementById('emojiPreviewBtn').classList.remove('active');
  document.getElementById('emojiPreviewBtn').textContent = selectedEmoji;
}

function closeCatModal() {
  document.getElementById('catModalBg').classList.remove('open');
}

function renderCatList() {
  const cats = getAllCats();
  let html = '';
  Object.entries(cats).forEach(([key, cat]) => {
    html += `<div class="cat-item">
      <span class="cat-item-emoji">${cat.emoji}</span>
      <span class="cat-item-label" style="color:${cat.color}">${cat.label}</span>
      <div class="cat-color-bar" style="background:${cat.color}"></div>
      ${cat.locked
        ? `<span class="cat-locked" title="Categoria padrão"><i class="ti ti-lock" style="font-size:13px"></i></span>`
        : `<button class="cat-delete-btn" onclick="deleteCustomCat('${key}')" title="Excluir"><i class="ti ti-trash" style="font-size:14px"></i></button>`
      }
    </div>`;
  });
  document.getElementById('catList').innerHTML = html || '<div class="todo-empty">Nenhuma categoria</div>';
}

function buildEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  grid.innerHTML = EMOJI_OPTIONS.map(em =>
    `<button class="emoji-opt${em === selectedEmoji ? ' selected' : ''}" onclick="selectEmoji('${em}')">${em}</button>`
  ).join('');
}

function buildColorSwatches() {
  const cont = document.getElementById('colorSwatches');
  cont.innerHTML = COLOR_OPTIONS.map((c, i) =>
    `<div class="swatch${c.color === selectedColor.color ? ' selected' : ''}"
      style="background:${c.color}"
      onclick="selectColor(${i})"
      title="${c.color}"></div>`
  ).join('');
}

function selectEmoji(em) {
  selectedEmoji = em;
  document.getElementById('emojiPreviewBtn').textContent = em;
  document.getElementById('emojiGrid').classList.remove('open');
  document.getElementById('emojiPreviewBtn').classList.remove('active');
  // atualiza seleção visual no grid
  document.querySelectorAll('.emoji-opt').forEach(btn => {
    btn.classList.toggle('selected', btn.textContent === em);
  });
}

function selectColor(i) {
  selectedColor = COLOR_OPTIONS[i];
  document.querySelectorAll('.swatch').forEach((sw, idx) => {
    sw.classList.toggle('selected', idx === i);
  });
}

function saveCustomCat() {
  const name = document.getElementById('cName').value.trim();
  if (!name) { document.getElementById('cName').focus(); return; }

  const key = 'custom_' + Date.now();
  customCats[key] = {
    label:  name,
    emoji:  selectedEmoji,
    color:  selectedColor.color,
    light:  selectedColor.light || hexToLight(selectedColor.color),
    locked: false,
  };
  saveData('study_custom_cats', customCats);
  document.getElementById('cName').value = '';
  selectedEmoji = '🎯';
  selectedColor = COLOR_OPTIONS[0];
  buildEmojiGrid();
  buildColorSwatches();
  document.getElementById('emojiPreviewBtn').textContent = selectedEmoji;
  renderCatList();
  populateCatSelect();
}

function deleteCustomCat(key) {
  if (!customCats[key]) return;
  if (!confirm(`Excluir a categoria "${customCats[key].label}"?\nEventos desta categoria ficarão com a cor padrão.`)) return;
  delete customCats[key];
  saveData('study_custom_cats', customCats);
  renderCatList();
  populateCatSelect();
  render();
}

// ---- AÇÕES ----
function toggleDone(id) {
  const ev = events.find(e => e.id === id);
  if (ev) { ev.done = !ev.done; saveData('study_events', events); render(); }
}

function toggleOverdue() {
  showOverdue = !showOverdue;
  renderTodo();
}

function openEventDetail(id) {
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  const cat = getCat(ev.cat);
  const od  = isOverdue(ev);
  if (confirm(
    `${od ? '⚠️ ATRASADA — ' : ''}${cat.emoji} ${ev.title}\n` +
    `📅 ${ev.date}  ${ev.startTime} – ${ev.endTime}\n` +
    `🏷️ ${cat.label}` +
    (ev.notes ? `\n📝 ${ev.notes}` : '') +
    `\n\nExcluir esta tarefa?`
  )) {
    events = events.filter(e => e.id !== id);
    saveData('study_events', events);
    render();
  }
}

function jumpToDate(ds) {
  currentDate = new Date(ds + 'T12:00:00');
  render();
}

// ---- EVENTOS DE INTERFACE ----
document.getElementById('prevBtn').addEventListener('click', () => navigate(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigate(1));
document.getElementById('todayBtn').addEventListener('click', goToday);
document.getElementById('addFab').addEventListener('click', () => { clickedSlot = null; openModal(); });
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('saveBtn').addEventListener('click', saveEvent);
document.getElementById('manageCatsBtn').addEventListener('click', openCatModal);
document.getElementById('catCancelBtn').addEventListener('click', closeCatModal);
document.getElementById('catSaveBtn').addEventListener('click', saveCustomCat);

// Toggle grid de emojis
document.getElementById('emojiPreviewBtn').addEventListener('click', function () {
  const grid = document.getElementById('emojiGrid');
  const open = grid.classList.toggle('open');
  this.classList.toggle('active', open);
});

// Fechar modais ao clicar fora
document.getElementById('modalBg').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
document.getElementById('catModalBg').addEventListener('click', function (e) {
  if (e.target === this) closeCatModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeCatModal(); }
  if (e.key === 'Enter' && document.getElementById('modalBg').classList.contains('open')) {
    e.preventDefault(); saveEvent();
  }
});

document.querySelectorAll('.view-tab').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentView = this.dataset.view;
    render();
  });
});

// ---- DADOS DE EXEMPLO (apenas na primeira vez) ----
function seedDemoData() {
  if (events.length > 0) return;
  const offset = d => {
    const dt = new Date(today); dt.setDate(dt.getDate() + d); return fmtDate(dt);
  };
  const samples = [
    { title: 'Revisão de Álgebra',     cat: 'matematica', date: offset(0),  startTime: '08:00', endTime: '09:30' },
    { title: 'Leitura Dom Casmurro',   cat: 'portugues',  date: offset(0),  startTime: '10:00', endTime: '11:00' },
    { title: 'Exercícios de Física',   cat: 'ciencias',   date: offset(1),  startTime: '14:00', endTime: '15:30' },
    { title: 'Segunda Guerra Mundial', cat: 'historia',   date: offset(2),  startTime: '09:00', endTime: '10:00' },
    { title: 'Vocabulary & Grammar',   cat: 'ingles',     date: offset(3),  startTime: '16:00', endTime: '17:00' },
    { title: 'Redação ENEM',           cat: 'redacao',    date: offset(5),  startTime: '13:00', endTime: '14:30' },
    { title: 'Simulado Geral',         cat: 'geral',      date: offset(7),  startTime: '08:00', endTime: '12:00' },
    { title: 'Geometria Plana',        cat: 'matematica', date: offset(-1), startTime: '15:00', endTime: '16:00' },
    { title: 'Conjunções e Pronomes',  cat: 'portugues',  date: offset(-2), startTime: '11:00', endTime: '12:00' },
  ];
  events = samples.map((s, i) => ({ ...s, id: 'ev_demo_'+i, done: false, notes: '', createdAt: new Date().toISOString() }));
  saveData('study_events', events);
}

// ---- INICIALIZAÇÃO ----
seedDemoData();
render();