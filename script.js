/* ============================================================
   ORGANIZADOR DE ESTUDOS — app.js
   ============================================================ */

// ---- CATEGORIAS ----
const CATS = {
  matematica: { label: 'Matemática', color: '#378ADD', light: '#E6F1FB' },
  portugues:  { label: 'Português',  color: '#D4537E', light: '#FBEAF0' },
  ciencias:   { label: 'Ciências',   color: '#639922', light: '#EAF3DE' },
  historia:   { label: 'História',   color: '#BA7517', light: '#FAEEDA' },
  ingles:     { label: 'Inglês',     color: '#7F77DD', light: '#EEEDFE' },
  redacao:    { label: 'Redação',    color: '#993C1D', light: '#FAECE7' },
  geral:      { label: 'Geral',      color: '#5F5E5A', light: '#F1EFE8' },
};

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];
const DAYS_LONG  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DAYS_SHORT = ['D','S','T','Q','Q','S','S'];

// ---- ESTADO ----
const today = new Date();
today.setHours(0, 0, 0, 0);

let currentDate  = new Date(today);
let currentView  = 'week';
let showOverdue  = false;
let clickedSlot  = null;

let events = loadEvents();

// ---- PERSISTÊNCIA ----
function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem('study_events') || '[]');
  } catch (e) {
    return [];
  }
}

function saveEvents() {
  try {
    localStorage.setItem('study_events', JSON.stringify(events));
  } catch (e) {
    console.warn('Não foi possível salvar no localStorage.');
  }
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

function getCat(key) {
  return CATS[key] || CATS.geral;
}

function formatPeriod() {
  if (currentView === 'week') {
    const ws = getWeekStart(currentDate);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    if (ws.getMonth() === we.getMonth()) {
      return `${ws.getDate()} – ${we.getDate()} de ${MONTHS[ws.getMonth()]} ${ws.getFullYear()}`;
    }
    return `${ws.getDate()} ${MONTHS[ws.getMonth()].slice(0,3)} – ${we.getDate()} ${MONTHS[we.getMonth()].slice(0,3)} ${we.getFullYear()}`;
  }
  if (currentView === 'month') {
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }
  return `${currentDate.getDate()} de ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
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

// ---- RENDERIZAÇÃO PRINCIPAL ----
function render() {
  document.getElementById('periodLabel').textContent = formatPeriod();

  const main = document.getElementById('mainArea');
  if (currentView === 'week')       main.innerHTML = renderWeekView();
  else if (currentView === 'day')   main.innerHTML = renderDayView();
  else                              main.innerHTML = renderMonthView();

  // scroll para hora atual
  const body = document.getElementById('calBody');
  if (body) {
    const nowH = new Date().getHours();
    body.scrollTop = Math.max(0, (nowH - 1) * 48);

    // clique em slot vazio
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
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    days.push(d);
  }

  // cabeçalho dos dias
  let html = '<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">';
  html += '<div class="cal-header"><div></div>';
  days.forEach(d => {
    const isToday = fmtDate(d) === fmtDate(today);
    html += `<div class="cal-header-cell">
      <div class="day-name">${DAYS_LONG[d.getDay()]}</div>
      <div class="day-num${isToday ? ' today' : ''}">${d.getDate()}</div>
    </div>`;
  });
  html += '</div>';

  // grade de horários
  html += '<div class="cal-body" id="calBody"><div class="time-grid">';
  for (let h = 0; h < 24; h++) {
    html += `<div class="time-label">${h === 0 ? '' : h + ':00'}</div>`;
    days.forEach((d, di) => {
      html += `<div class="time-slot" data-date="${fmtDate(d)}" data-hour="${h}" style="grid-row:${h * 2 + 2}/span 2;grid-column:${di + 2}"></div>`;
    });
  }

  // camada de eventos
  html += '<div id="eventsLayer" style="position:absolute;inset:0;pointer-events:none">';

  const dayEvMap = {};
  days.forEach(d => { dayEvMap[fmtDate(d)] = []; });
  events.forEach(ev => {
    if (dayEvMap[ev.date] !== undefined) dayEvMap[ev.date].push(ev);
  });

  days.forEach((d, di) => {
    dayEvMap[fmtDate(d)].forEach(ev => {
      html += buildEventBlock(ev, di, days.length);
    });
  });

  // linha de hora atual
  const nowH = new Date().getHours(), nowM = new Date().getMinutes();
  const topNow = (nowH + nowM / 60) * 48;
  html += `<div class="current-time-line" style="top:${topNow}px"></div>`;

  html += '</div></div></div></div>';
  return html;
}

function buildEventBlock(ev, colIndex, totalCols) {
  const [sh, sm] = (ev.startTime || '08:00').split(':').map(Number);
  const [eh, em] = (ev.endTime || (String(sh + 1).padStart(2, '0') + ':00')).split(':').map(Number);
  const top    = (sh + sm / 60) * 48;
  const height = Math.max(24, (eh + em / 60 - (sh + sm / 60)) * 48);
  const cat    = getCat(ev.cat);
  const od     = isOverdue(ev);

  const leftExpr  = `calc((100% - 48px) / ${totalCols} * ${colIndex} + 48px + 2px)`;
  const widthExpr = `calc((100% - 48px) / ${totalCols} - 4px)`;

  let html = `<div class="event-block${od ? ' overdue' : ''}"
    data-id="${ev.id}"
    style="top:${top}px;height:${height}px;left:${leftExpr};width:${widthExpr};
           background:${cat.light};border-left-color:${cat.color};pointer-events:all"
    onclick="openEventDetail('${ev.id}')">`;
  html += `<div class="ev-title" style="color:${cat.color}">${od ? '⚠️ ' : ''}${ev.title}</div>`;
  if (height > 28) {
    html += `<div class="ev-time" style="color:${cat.color}">${ev.startTime || ''} – ${ev.endTime || ''}</div>`;
  }
  html += '</div>';
  return html;
}

// ---- VISÃO DIÁRIA ----
function renderDayView() {
  const d = currentDate;
  let html = '<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">';
  html += `<div class="day-header">${DAYS_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}</div>`;
  html += '<div class="cal-body" id="calBody"><div class="time-grid day-time-grid">';

  for (let h = 0; h < 24; h++) {
    html += `<div class="time-label">${h === 0 ? '' : h + ':00'}</div>`;
    html += `<div class="time-slot" data-date="${fmtDate(d)}" data-hour="${h}"></div>`;
  }

  html += '<div id="eventsLayer" style="position:absolute;inset:0;pointer-events:none">';
  events.filter(ev => ev.date === fmtDate(d)).forEach(ev => {
    const [sh, sm] = (ev.startTime || '08:00').split(':').map(Number);
    const [eh, em] = (ev.endTime || (String(sh + 1).padStart(2, '0') + ':00')).split(':').map(Number);
    const top    = (sh + sm / 60) * 48;
    const height = Math.max(24, (eh + em / 60 - (sh + sm / 60)) * 48);
    const cat    = getCat(ev.cat);
    const od     = isOverdue(ev);

    html += `<div class="event-block${od ? ' overdue' : ''}" data-id="${ev.id}"
      style="top:${top}px;height:${height}px;left:50px;right:4px;
             background:${cat.light};border-left-color:${cat.color};pointer-events:all"
      onclick="openEventDetail('${ev.id}')">`;
    html += `<div class="ev-title" style="color:${cat.color}">${od ? '⚠️ ' : ''}${ev.title}</div>`;
    if (height > 28) {
      html += `<div class="ev-time" style="color:${cat.color}">${ev.startTime} – ${ev.endTime}</div>`;
    }
    html += '</div>';
  });

  const nowH = new Date().getHours(), nowM = new Date().getMinutes();
  html += `<div class="current-time-line" style="top:${(nowH + nowM / 60) * 48}px"></div>`;
  html += '</div></div></div></div>';
  return html;
}

// ---- VISÃO MENSAL ----
function renderMonthView() {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const firstDay  = new Date(y, m, 1);
  const startDow  = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // segunda = 0
  const daysInMon = new Date(y, m + 1, 0).getDate();
  const prevDays  = new Date(y, m, 0).getDate();

  let html = '<div class="month-view">';
  html += '<div class="month-header-row">';
  ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].forEach(d => {
    html += `<div class="month-header-cell">${d}</div>`;
  });
  html += '</div><div class="month-body">';

  const cells = [];
  for (let i = startDow - 1; i >= 0; i--)     cells.push({ d: prevDays - i, m: m - 1, y, other: true });
  for (let i = 1; i <= daysInMon; i++)          cells.push({ d: i, m, y, other: false });
  const fill = cells.length % 7 === 0 ? 0 : 7 - cells.length % 7;
  for (let i = 1; i <= fill; i++)               cells.push({ d: i, m: m + 1, y, other: true });

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
                onclick="openEventDetail('${ev.id}')">${od ? '⚠️ ' : ''}${ev.title}</div>`;
    });
    if (dayEvs.length > 3) {
      html += `<div class="month-more">+${dayEvs.length - 3} mais</div>`;
    }
    html += '</div>';
  });

  html += '</div></div>';
  return html;
}

// ---- MINI CALENDÁRIO ----
function renderMiniCal() {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const firstDay  = new Date(y, m, 1);
  const startDow  = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMon = new Date(y, m + 1, 0).getDate();
  const prevDays  = new Date(y, m, 0).getDate();

  let html = `<div class="mini-cal-header">
    <span>${MONTHS[m].slice(0,3)} ${y}</span>
    <div class="mini-nav-btns">
      <button class="mini-btn" onclick="miniNav(-1)"><i class="ti ti-chevron-left" style="font-size:12px"></i></button>
      <button class="mini-btn" onclick="miniNav(1)"><i class="ti ti-chevron-right" style="font-size:12px"></i></button>
    </div>
  </div>`;

  html += '<div class="mini-grid">';
  ['S','T','Q','Q','S','S','D'].forEach(d => {
    html += `<div class="mini-day-name">${d}</div>`;
  });

  for (let i = startDow - 1; i >= 0; i--) {
    html += `<div class="mini-day other-month">${prevDays - i}</div>`;
  }
  for (let i = 1; i <= daysInMon; i++) {
    const dt   = new Date(y, m, i);
    const ds   = fmtDate(dt);
    const isT  = ds === fmtDate(today);
    const hasEv = events.some(ev => ev.date === ds);
    html += `<div class="mini-day${isT ? ' today' : ''}${hasEv ? ' has-event' : ''}"
              onclick="jumpToDate('${ds}')">${i}</div>`;
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
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const overdueEvs = events.filter(ev => isOverdue(ev) && ev.date !== ds);

  let html = `<div class="todo-label">${currentView === 'day' ? 'Tarefas do dia' : 'Tarefas de hoje'}</div>`;

  if (todayEvs.length === 0) {
    html += '<div class="todo-empty">Nenhuma tarefa</div>';
  }

  todayEvs.forEach(ev => {
    const cat = getCat(ev.cat);
    const od  = isOverdue(ev);
    html += `<div class="todo-item${ev.done ? ' done' : ''}" onclick="toggleDone('${ev.id}')">
      <input type="checkbox" ${ev.done ? 'checked' : ''} onclick="event.stopPropagation();toggleDone('${ev.id}')">
      <div class="todo-cat-dot" style="background:${cat.color}"></div>
      <div class="todo-text">${ev.title}${od && !ev.done ? '<br><span class="todo-overdue-tag">Atrasada</span>' : ''}</div>
    </div>`;
  });

  // botão tarefas atrasadas
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
          <div class="todo-text">${ev.title}<br><span class="todo-date-tag">${ev.date}</span></div>
        </div>`;
      });
    }
  }

  document.getElementById('todoSection').innerHTML = html;
}

// ---- MODAL ----
function openModal() {
  const d = clickedSlot ? clickedSlot.date : fmtDate(currentView === 'day' ? currentDate : today);
  const h = clickedSlot ? clickedSlot.hour : 8;
  document.getElementById('fDate').value  = d;
  document.getElementById('fStart').value = String(h).padStart(2, '0') + ':00';
  document.getElementById('fEnd').value   = String(Math.min(h + 1, 23)).padStart(2, '0') + ':00';
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

  const ev = {
    id:        'ev_' + Date.now(),
    title,
    cat:       document.getElementById('fCat').value,
    date:      document.getElementById('fDate').value,
    startTime: document.getElementById('fStart').value,
    endTime:   document.getElementById('fEnd').value,
    notes:     document.getElementById('fNotes').value,
    done:      false,
    createdAt: new Date().toISOString(),
  };

  events.push(ev);
  saveEvents();
  closeModal();
  render();
}

// ---- AÇÕES ----
function toggleDone(id) {
  const ev = events.find(e => e.id === id);
  if (ev) { ev.done = !ev.done; saveEvents(); render(); }
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
    `${od ? '⚠️ ATRASADA — ' : ''}${ev.title}\n` +
    `📅 ${ev.date}  ${ev.startTime} – ${ev.endTime}\n` +
    `🏷️ ${cat.label}` +
    (ev.notes ? `\n📝 ${ev.notes}` : '') +
    `\n\nExcluir esta tarefa?`
  )) {
    events = events.filter(e => e.id !== id);
    saveEvents();
    render();
  }
}

function jumpToDate(ds) {
  currentDate = new Date(ds + 'T12:00:00');
  render();
}

// ---- EVENTOS DE INTERFACE ----
document.getElementById('prevBtn').addEventListener('click',  () => navigate(-1));
document.getElementById('nextBtn').addEventListener('click',  () => navigate(1));
document.getElementById('todayBtn').addEventListener('click', goToday);
document.getElementById('addFab').addEventListener('click',   () => { clickedSlot = null; openModal(); });
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('saveBtn').addEventListener('click',   saveEvent);

document.getElementById('modalBg').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && document.getElementById('modalBg').classList.contains('open')) {
    e.preventDefault();
    saveEvent();
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
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return fmtDate(dt);
  };

  const samples = [
    { title: 'Revisão de Álgebra',       cat: 'matematica', date: offset(0),  startTime: '08:00', endTime: '09:30' },
    { title: 'Leitura Dom Casmurro',     cat: 'portugues',  date: offset(0),  startTime: '10:00', endTime: '11:00' },
    { title: 'Exercícios de Física',     cat: 'ciencias',   date: offset(1),  startTime: '14:00', endTime: '15:30' },
    { title: 'Segunda Guerra Mundial',   cat: 'historia',   date: offset(2),  startTime: '09:00', endTime: '10:00' },
    { title: 'Vocabulary & Grammar',     cat: 'ingles',     date: offset(3),  startTime: '16:00', endTime: '17:00' },
    { title: 'Redação ENEM',             cat: 'redacao',    date: offset(5),  startTime: '13:00', endTime: '14:30' },
    { title: 'Simulado Geral',           cat: 'geral',      date: offset(7),  startTime: '08:00', endTime: '12:00' },
    { title: 'Geometria Plana',          cat: 'matematica', date: offset(-1), startTime: '15:00', endTime: '16:00' },
    { title: 'Conjunções e Pronomes',    cat: 'portugues',  date: offset(-2), startTime: '11:00', endTime: '12:00' },
  ];

  events = samples.map((s, i) => ({
    ...s,
    id: 'ev_demo_' + i,
    done: false,
    notes: '',
    createdAt: new Date().toISOString(),
  }));

  saveEvents();
}

// ---- INICIALIZAÇÃO ----
seedDemoData();
render();