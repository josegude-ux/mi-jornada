'use strict';
const CJ_VERSION='0.9.0';
const CJ_RELEASE='2026-10-22';
let updateStatus='Sin comprobar';
let updateAvailable=false;
let updateRegistration=null;
const SAVE_KEY='control-jornada-empresa-v01';
// Modo consulta: solo datos de la última copia Excel incorporada al paquete.
let data=JSON.parse(JSON.stringify(window.INITIAL_DATA));
if(!Array.isArray(data.audit))data.audit=[];
if(!data.markNotes || typeof data.markNotes!=='object')data.markNotes={};
if(!Array.isArray(data.undoMarks))data.undoMarks=[];
if(!Array.isArray(data.records)||!Array.isArray(data.employees)||!data.marks)data=JSON.parse(JSON.stringify(window.INITIAL_DATA));
const TODAY=(()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})();
const viewState={page:'calendario',year:2026,month:9,emp:data.employees.find(e=>e.status==='ACTIVO')?.id||'1',recordFilter:'all',query:'',employeeQuery:'',calendarMode:'equipo',reviewLimit:60};
const NAME_MONTH=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const VIEWS=[['calendario','▦','Control mensual'],['ficha','♙','Ficha empleado'],['resumen','◫','Resumen anual'],['empleados','♧','Empleados'],['revision','☷','Fichajes'],['importar','⇪','Importar PDF'],['vacaciones','☀','Vacaciones'],['cobertura','◷','Cobertura'],['ajustes','⚙','Ajustes']];
const STATES={V:['Vacaciones','blue'],E:['Enfermedad','yellow'],C:['Ausencia injust.','red'],AP:['Asuntos propios','violet'],FESTIVO:['Festivo','gray'],ALTA:['Alta','green'],VP:['Vacaciones programadas','blue'],'':['Sin incidencia','gray']};
const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const en=x=>data.employees.find(e=>e.id===String(x));
const iso=(year,month,date)=>`${year}-${String(month+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
const dshort=s=>s?String(s).split('-').reverse().join('/'): '—';
const currentDays=()=>new Date(viewState.year,viewState.month+1,0).getDate();
const fmtMonth=()=>`${NAME_MONTH[viewState.month].charAt(0).toUpperCase()}${NAME_MONTH[viewState.month].slice(1)} ${viewState.year}`;
const displayStatus=s=>{let a=STATES[s]||[s,'gray'];return `<span class="pill ${a[1]}">${h(a[0])}</span>`;};
const mkey=(date,emp)=>`${date}|${emp}`;
const mark=(date,emp)=>data.marks[mkey(date,emp)]||'';
const initials=name=>String(name).split(/\s+/).slice(0,2).map(x=>x.slice(0,1)).join('');
const person=e=>`<div class="person"><div class="avatar">${h(initials(e.name))}</div><div><strong class="personname">${h(e.name)}</strong><small>${e.status==='ACTIVO'?'En activo':'Baja'} ${e.start?'· Alta '+dshort(e.start):''}</small></div></div>`;
function persist(){} // Esta aplicación no guarda ni modifica datos.
function audit(type,details){} // Solo presentación
function notify(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),3200);}
function download(blob,name){const a=document.createElement('a');let url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);}
function nav(page){if(!VIEWS.some(p=>p[0]===page))return;viewState.page=page;viewState.query='';render();window.scrollTo({top:0,behavior:'instant'});}
function changeMonth(delta){let v=new Date(viewState.year,viewState.month+delta,1);viewState.year=v.getFullYear();viewState.month=v.getMonth();render();}
function countAbsences(date){const ab={V:[],E:[],C:[],AP:[]};data.employees.filter(e=>e.status==='ACTIVO').forEach(e=>{let state=mark(date,e.id);if(ab[state])ab[state].push(e.name);});return {count:Object.values(ab).reduce((n,a)=>n+a.length,0),by:ab};}
const daysOfMonth=(y,m)=>Array.from({length:new Date(y,m+1,0).getDate()},(_,i)=>iso(y,m,i+1));
function getIssues(){return data.records.filter(r=>r.warning||r.control==='REVISAR'||r.action==='REVISAR'||r.pdfStatus.includes('INCOMPLETO')||r.correctionState.includes('PENDIENTE')||r.edit?.pending);}
function metricsCard(name,value,foot,ico){return `<div class="metric"><div class="m-top"><span>${h(name)}</span><span class="m-icon">${ico}</span></div><strong class="mono">${h(value)}</strong><small>${h(foot)}</small></div>`;}
function topbar(){const titles={inicio:'Vista general',calendario:'Control mensual',ficha:'Ficha de empleado',resumen:'Resumen anual',empleados:'Plantilla de empleados',revision:'Consulta de fichajes',vacaciones:'Vacaciones del Excel',cobertura:'Cobertura visual',importar:'Importación de PDF',ajustes:'Origen de datos'};return `<div class="topline"><div><div class="eyebrow">CONTROL JORNADA / EMPRESA</div><h1>${titles[viewState.page]}</h1><p class="subhead">Control Jornada v0.9 · Consulta Excel y revisión de fichajes PDF · Sin cálculos</p></div><div class="topactions"><span class="chip"><span class="dot"></span>Modo presentación · Solo lectura</span><button class="btn secondary" data-action="backup">⇩ Exportar datos</button></div></div>`;}
function monthPicker(){return `<div class="monthnav"><button data-action="prev-month" aria-label="Mes anterior">‹</button><b>${fmtMonth()}</b><button data-action="next-month" aria-label="Mes siguiente">›</button></div>`;}
function filterEmployee(){return `<select class="field" id="employee-select" aria-label="Seleccionar empleado">${data.employees.map(e=>`<option value="${e.id}" ${e.id===viewState.emp?'selected':''}>${h(e.name)}</option>`).join('')}</select>`;}
function inicio(){let active=data.employees.filter(x=>x.status==='ACTIVO').length,issues=getIssues().length,now=dateBestForApp(),lastDate=countAbsences(now),monthly=daysOfMonth(viewState.year,viewState.month),alerts=monthly.map(d=>({date:d,...countAbsences(d)})).filter(x=>x.count>=data.settings.maxAbsences);let recent=data.records.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);let latestMonth=`${viewState.year}-${String(viewState.month+1).padStart(2,'0')}`;
 return `<div class="cards">${metricsCard('Empleados activos',active,'Plantilla gestionada','♙')}${metricsCard('Registros importados',data.records.length,'Histórico procedente del Excel','☷')}${metricsCard('Posibles incidencias',issues,'Pendientes / requieren revisión','⚠')}${metricsCard('Alertas de cobertura',alerts.length,fmtMonth(),'◷')}</div>
 <div class="columns"><div><section class="panel"><div class="panelhead"><div><h2>Últimos fichajes importados</h2><p class="sectionnote">Consulta los datos originales y revisa incidencias desde un solo lugar.</p></div><button class="panel-link" data-go="revision">Ver todos →</button></div><div class="tablewrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Empleado</th><th>Horario</th><th>Estado</th></tr></thead><tbody>${recent.map(r=>`<tr><td class="mono">${dshort(r.date)}</td><td>${h(en(r.emp)?.name||'')}</td><td class="mono">${tstr(r.start)} – ${tstr(r.end)}</td><td>${displayRecordStatus(r)}</td></tr>`).join('')}</tbody></table></div></section>
 <section class="panel"><div class="panelhead"><h2>Accesos rápidos</h2></div><div class="quicklinks"><button data-go="calendario"><span>▦</span>Marcar incidencia</button><button data-go="vacaciones"><span>☀</span>Vacaciones</button><button data-go="cobertura"><span>◷</span>Consultar cobertura</button></div></section></div>
 <div><section class="panel"><div class="panelhead"><h2>Ausencias · ${fmtMonth()}</h2>${monthPicker()}</div><p class="sectionnote">Umbral del Excel: <b>${data.settings.maxAbsences} ausentes</b> al mismo tiempo.</p>${alerts.length?alerts.slice(0,9).map(x=>`<div class="kpi-line"><span><i class="date-flag ${x.count>data.settings.maxAbsences?'red':'yellow'}"></i>${dshort(x.date)}</span><span class="pill ${x.count>data.settings.maxAbsences?'red':'yellow'}">${x.count} ausentes</span></div>`).join(''):`<p class="empty">Sin alertas de cobertura este mes.</p>`}<button class="panel-link" data-go="cobertura" style="margin-top:15px">Ver calendario completo →</button></section>
 <section class="panel"><div class="panelhead"><h2>Resumen operativo</h2></div><div class="kpi-list"><div class="kpi-line"><span>Vacaciones programadas 2026</span><b>${data.employees.reduce((n,e)=>n+e.planned2026,0)} días</b></div><div class="kpi-line"><span>Vacaciones pendientes 2026</span><b>${data.employees.reduce((n,e)=>n+e.pending2026,0)} días</b></div><div class="kpi-line"><span>Correcciones registradas en esta app</span><b>${data.audit.filter(a=>a.type==='CORRECCIÓN').length}</b></div></div><p class="footer-note">Las cifras de vacaciones de esta tarjeta son los saldos de referencia importados del Excel.</p></section></div></div>`;}
function dateBestForApp(){return TODAY.startsWith('2026-')||TODAY.startsWith('2027-')?TODAY:iso(viewState.year,viewState.month,1);}
function selectedMonthStats(year,month){
 const prefix=`${year}-${String(month+1).padStart(2,'0')}-`;
 let marked=0,absenceDays=0,alerts=0;
 Object.entries(data.marks).forEach(([key,code])=>{if(key.startsWith(prefix)&&['V','E','C','AP'].includes(code))marked++;});
 const dayCount=new Date(year,month+1,0).getDate();
 for(let day=1;day<=dayCount;day++){
  const count=countAbsences(iso(year,month,day)).count;
  if(count)absenceDays++;
  if(count>=data.settings.maxAbsences)alerts++;
 }
 return {marked,absenceDays,alerts};
}
function yearStrip(){
 const months=NAME_MONTH.map((name,m)=>{
  const stats=selectedMonthStats(viewState.year,m),active=viewState.month===m;
  return `<button type="button" class="month-tile ${active?'active':''}" data-action="pick-month" data-month="${m}" aria-pressed="${active}" title="${h(name)} ${viewState.year}, ${stats.marked} incidencias"><span>${h(name.slice(0,3))}</span><b>${stats.marked}</b>${stats.alerts?`<i class="tile-alert" title="${stats.alerts} días con aviso"></i>`:''}</button>`;
 }).join('');
 return `<div class="month-overview"><div class="month-overview-head"><div><b>Vista anual</b><span>Selecciona un mes para ver toda la plantilla</span></div><div class="year-select"><button class="year-arrow" data-action="prev-year" aria-label="Año anterior">‹</button><strong>${viewState.year}</strong><button class="year-arrow" data-action="next-year" aria-label="Año siguiente">›</button></div></div><div class="month-tiles">${months}</div></div>`;
}
function equipoMensual(){
 const dates=daysOfMonth(viewState.year,viewState.month),codes=['V','E','C','AP','VP'];
 const workforce=data.employees;
 let counters={V:0,E:0,C:0,AP:0,VP:0},dayAbs=dates.map(d=>countAbsences(d).count);
 const totalIssues=dayAbs.filter(n=>n>=data.settings.maxAbsences).length,tooMany=dayAbs.filter(n=>n>data.settings.maxAbsences).length;
 const saturdaySunday=date=>[0,6].includes(new Date(date+'T12:00:00').getDay());
 const holidayDates=new Set(data.holidays.filter(x=>x.date.startsWith(`${viewState.year}-`)).map(x=>x.date));
 const isHoliday=d=>holidayDates.has(d);
 const header=`<tr><th class="matrix-name sticky-col"><div class="name-heading"><span>EMPLEADO</span><small>${workforce.length} en plantilla</small></div></th>${dates.map(d=>{
  let w=['Do','Lu','Ma','Mi','Ju','Vi','Sá'][new Date(d+'T12:00:00').getDay()];
  return `<th class="matrix-date ${saturdaySunday(d)?'weekend':''} ${isHoliday(d)?'national-holiday':''} ${d===TODAY?'current-day':''}" title="${dshort(d)}"><span>${w}</span><b>${Number(d.slice(-2))}</b></th>`;
 }).join('')}${codes.map(c=>`<th class="matrix-total-header ${c==='VP'?'last-total':''}" title="${({V:'Vacaciones disfrutadas',E:'Enfermedad',C:'Ausencia sin justificar',AP:'Asuntos propios',VP:'Vacaciones programadas'})[c]}">${c==='VP'?'V prog.':c}</th>`).join('')}</tr>`;
 const body=workforce.map((e,index)=>{
  let personCount={V:0,E:0,C:0,AP:0,VP:0},cells=dates.map(d=>{
   let code=mark(d,e.id),cls=code==='FESTIVO'?'festivo':code==='ALTA'?'alta':code==='VP'?'vp':code.toLowerCase(),off=saturdaySunday(d),holiday=isHoliday(d);
   if(personCount[code]!==undefined){personCount[code]++;counters[code]++;}
   const words=STATES[code]?.[0]||({VP:'Vacaciones programadas'})[code]||'Sin incidencia';
   return `<td class="matrix-cell ${off?'weekend':''} ${holiday?'national-holiday':''} ${d===TODAY?'current-day':''}"><button type="button" class="mark-cell ${cls?`marked is-${cls}`:'no-mark'}" data-action="mark-day" data-date="${d}" data-emp="${e.id}" aria-label="${h(e.name)}, ${dshort(d)}: ${h(words)}" title="${h(e.name)} · ${dshort(d)} · ${h(words)}">${code==='FESTIVO'?'F':code==='ALTA'?'A':h(code)}${data.markNotes[mkey(d,e.id)]?'<span class="note-indicator" aria-label="Con nota"></span>':''}</button></td>`;
  }).join('');
  const fixed=`<th class="matrix-name sticky-col"><button class="matrix-person" data-action="open-worker-month" data-emp="${e.id}" title="Ver calendario de ${h(e.name)}"><span class="matrix-avatar">${h(initials(e.name))}</span><span class="matrix-person-text"><strong>${h(e.name)}</strong><small>${e.status==='ACTIVO'?'En plantilla':'Baja'}</small></span><span class="matrix-person-arrow">›</span></button></th>`;
  const right=codes.map(c=>`<td class="matrix-number ${c==='VP'?'last-total':''}">${personCount[c]||'<span class="muted-zero">–</span>'}</td>`).join('');
  return `<tr class="${index%2?'even':''}">${fixed}${cells}${right}</tr>`;
 }).join('');
 const coverageRow=`<tr class="matrix-coverage"><th class="matrix-name sticky-col"><span class="coverage-title">● Ausentes / día</span><small>Amarillo = ${data.settings.maxAbsences} · Rojo = más</small></th>${dates.map((d,i)=>{
  let n=dayAbs[i],cls=n>data.settings.maxAbsences?'alert-red':n===data.settings.maxAbsences?'alert-yellow':n?'some-absence':'';
  return `<td class="matrix-cell coverage-cell ${cls}"><button type="button" data-action="coverage-detail" data-date="${d}" title="${dshort(d)}: ${n} ausentes · Ver detalle">${n||'–'}</button></td>`;
 }).join('')}${codes.map(c=>`<td class="matrix-number coverage-number">${counters[c]||'–'}</td>`).join('')}</tr>`;
 return `<section class="panel matrix-panel">
  <div class="matrix-intro"><div><div class="eyebrow">VISTA DE TODA LA PLANTILLA</div><h2>Control mensual · ${fmtMonth()}</h2><p>Como en el Excel: trabajadores en filas, días en columnas y totales a la derecha. Pulsa una casilla para consultar su detalle.</p></div><div class="matrix-intro-action"><span class="chip">${totalIssues} días con aviso</span>${monthPicker()}</div></div>
  ${yearStrip()}
  <div class="matrix-toolbar"><div class="matrix-legend"><span class="legend-chip code-v"><b>V</b> Vacaciones</span><span class="legend-chip code-e"><b>E</b> Enfermedad</span><span class="legend-chip code-c"><b>C</b> No justificada</span><span class="legend-chip code-ap"><b>AP</b> Asuntos propios</span><span class="legend-chip code-festivo"><b>F</b> Festivo</span></div><div class="matrix-actions"><button class="btn secondary small" data-action="today-month">Mes actual</button><button class="btn secondary small" data-action="export-month">⇩ Exportar mes</button><button class="btn secondary small" data-action="matrix-mode">Vista individual →</button></div></div>
  <div class="matrix-scroll" id="matrix-scroll" tabindex="0" aria-label="Tabla mensual: desplázate lateralmente para consultar los días y totales"><table class="month-matrix"><thead>${header}</thead><tbody>${body}${coverageRow}</tbody></table></div>
  <div class="matrix-bottom"><span><span class="status-dot ok"></span> Normal</span><span><span class="status-dot warning"></span> ${data.settings.maxAbsences} ausentes</span><span><span class="status-dot critical"></span> Más de ${data.settings.maxAbsences}</span><span class="matrix-hint">← Desplaza la tabla horizontalmente para ver todos los días y totales →</span></div>
  <div class="matrix-summary"><div><span>Incidencias marcadas</span><b>${counters.V+counters.E+counters.C+counters.AP}</b></div><div><span>Días con ausencias</span><b>${dayAbs.filter(n=>n>0).length}</b></div><div><span>Días en límite de cobertura</span><b>${totalIssues-tooMany}</b></div><div><span>Días con exceso</span><b class="red-number">${tooMany}</b></div></div>
  <p class="footer-note">Las marcas proceden de la copia del Excel incluida en esta versión. Los recuentos de esta pantalla son ayudas visuales, no cálculos de jornada ni saldos oficiales. Los valores de vacaciones se muestran tal como fueron importados.</p>
 </section>`;
}
function calendarioIndividual(){let emp=en(viewState.emp)||data.employees[0],dates=daysOfMonth(viewState.year,viewState.month),skip=(new Date(viewState.year,viewState.month,1).getDay()+6)%7;
 const active=dates.map(d=>mark(d,emp.id)); const dist=Object.fromEntries(['V','E','C','AP'].map(s=>[s,active.filter(v=>v===s).length]));let calendarCells=Array.from({length:skip},()=>`<div class="day blank"></div>`).concat(dates.map(d=>{let x=mark(d,emp.id),weekday=new Date(d+'T12:00:00').getDay(),off=weekday===0||weekday===6;return `<button class="day ${off?'off':''} ${d===TODAY?'today':''}" data-action="mark-day" data-date="${d}" data-emp="${emp.id}" title="Editar ${dshort(d)}"><span class="daynum">${Number(d.slice(-2))}</span>${x?displayStatus(x):''}${data.markNotes[mkey(d,emp.id)]?'<small class="note-label">✎ Nota</small>':''}</button>`;})).join('');
 return `<div class="panel"><div class="panelhead"><div><h2>Incidencias del trabajador</h2><p class="sectionnote">Pulsa un día para consultar la marca procedente del Excel.</p></div><div class="flex">${filterEmployee()}${monthPicker()}</div></div><div class="matrix-actions" style="margin-bottom:14px"><button class="btn secondary" data-action="matrix-mode">← Volver a toda la plantilla</button></div><div class="mini-grid"><div class="mini"><span>Vacaciones marcadas</span><strong>${dist.V}</strong></div><div class="mini"><span>Días enfermedad</span><strong>${dist.E}</strong></div><div class="mini"><span>Otras ausencias</span><strong>${dist.C+dist.AP}</strong></div></div><div class="legend" style="margin-bottom:13px">${['V','E','C','AP','FESTIVO'].map(displayStatus).join('')}</div><div class="calendar">${['L','M','X','J','V','S','D'].map(x=>`<div class="weekday">${x}</div>`).join('')}${calendarCells}</div><div class="notice" style="margin-top:22px">El calendario se carga con las marcas reales del Excel. Toda edición queda guardada únicamente en este dispositivo y genera una entrada en el historial local.</div></div><div class="panel"><div class="panelhead"><h2>Resumen importado del empleado</h2><button class="panel-link" data-go="vacaciones">Ver vacaciones →</button></div><div class="mini-grid"><div class="mini"><span>Pendientes 2026 (Excel)</span><strong>${emp.pending2026}</strong></div><div class="mini"><span>Programadas 2026 (Excel)</span><strong>${emp.planned2026}</strong></div><div class="mini"><span>Restantes 2027 (Excel)</span><strong>${emp.remaining2027}</strong></div></div><p class="footer-note">Los saldos de vacaciones del Excel no se recalculan todavía tras editar una marca del calendario.</p></div>`;}
function calendario(){return viewState.calendarMode==='equipo'?equipoMensual():calendarioIndividual();}

function empleados(){let filtered=data.employees.filter(e=>e.name.toLowerCase().includes(viewState.employeeQuery.toLowerCase()));return `<section class="panel"><div class="panelhead"><div><h2>Directorio de trabajadores</h2><p class="sectionnote">Selecciona un trabajador para ver su ficha de consulta, con datos importados.</p></div><input id="employee-search" class="field search" placeholder="Buscar trabajador…" value="${h(viewState.employeeQuery)}"></div><div class="tablewrap"><table class="data-table"><thead><tr><th>Empleado</th><th>Situación</th><th>Pend. 2026</th><th>Prog. 2026</th><th>Restantes 2027</th><th></th></tr></thead><tbody>${filtered.map(e=>`<tr><td>${person(e)}</td><td><span class="pill ${e.status==='ACTIVO'?'green':'gray'}">${h(e.status)}</span></td><td>${e.pending2026} días</td><td>${e.planned2026} días</td><td><b>${e.remaining2027} días</b></td><td><button class="btn ghost small" data-action="view-emp" data-emp="${e.id}">Abrir ficha →</button></td></tr>`).join('')}</tbody></table></div></section>`;}
function vacaciones(){
 return `<div class="notice"><b>Vacaciones · información del Excel original.</b> Los saldos, consumos y días programados son campos importados, sin cálculos dentro de la aplicación.</div>
 <section class="panel"><div class="panelhead"><div><h2>Vacaciones por trabajador</h2><p class="sectionnote">Selecciona un empleado para consultar la ficha con 2026 y 2027.</p></div><button class="btn secondary" data-go="resumen">Resumen anual →</button></div>
 <div class="tablewrap"><table class="data-table"><thead><tr><th>Trabajador</th><th>Disfrutadas 2026</th><th>Programadas 2026</th><th>Pendientes 2026</th><th>Restantes 2027</th><th></th></tr></thead><tbody>${data.employees.map(e=>`<tr><td>${person(e)}</td><td class="mono">${h(e.used2026)}</td><td class="mono">${h(e.planned2026)}</td><td class="mono"><strong>${h(e.pending2026)}</strong></td><td class="mono">${h(e.remaining2027)}</td><td><button class="link-button" data-action="view-emp" data-emp="${e.id}">Ver ficha →</button></td></tr>`).join('')}</tbody></table></div></section>`;
}
function coverageRow(d){let x=countAbsences(d),max=data.settings.maxAbsences,c=x.count;return `<tr><td>${dshort(d)}</td><td><b>${data.employees.filter(e=>e.status==='ACTIVO').length-c}</b></td><td>${x.by.V.length}</td><td>${x.by.E.length}</td><td>${x.by.C.length+x.by.AP.length}</td><td><span class="pill ${c>max?'red':c===max?'yellow':'green'}">${c>max?'Exceso':c===max?'En el límite':'Correcto'} · ${c}</span></td><td><button class="link-button" data-action="coverage-detail" data-date="${d}">Ver detalle</button></td></tr>`;}
function cobertura(){let dates=daysOfMonth(viewState.year,viewState.month),alertDays=dates.map(d=>({date:d,count:countAbsences(d).count})).filter(x=>x.count>=data.settings.maxAbsences);return `<div class="cards">${metricsCard('Límite simultáneo',data.settings.maxAbsences,'De acuerdo con el Excel','♙')}${metricsCard('Días en el límite',alertDays.filter(x=>x.count===data.settings.maxAbsences).length,'Ausencias coincidentes','⚠')}${metricsCard('Días sobre el límite',alertDays.filter(x=>x.count>data.settings.maxAbsences).length,'Necesitan revisión','!')}${metricsCard('Empleados activos',data.employees.filter(e=>e.status==='ACTIVO').length,'Plantilla disponible','▤')}</div><section class="panel"><div class="panelhead"><div><h2>Cobertura y ausencias por día</h2><p class="sectionnote">Se consideran V, E, C y AP. No incluye todavía la previsión automática de bajas del día siguiente.</p></div>${monthPicker()}</div><div class="tablewrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Disponibles</th><th>Vacaciones</th><th>Enfermedad</th><th>Otras</th><th>Semáforo</th><th>Detalle</th></tr></thead><tbody>${dates.map(coverageRow).join('')}</tbody></table></div></section>`;}
function tstr(v){if(v===null||v===undefined||v==='')return '—';let mins=Math.round(Number(v)*1440);if(!Number.isFinite(mins))return '—';return String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');}
function mstr(v){if(v===null||!Number.isFinite(Number(v)))return '—';return (Number(v)*24).toFixed(2).replace('.',',')+' h';}
function displayRecordStatus(r){if(r.origin==='MANUAL')return '<span class="pill blue">Manual · validar</span>';if(r.edit)return '<span class="pill yellow">Modificado</span>';if(r.warning||r.control==='REVISAR'||r.action==='REVISAR'||r.pdfStatus.includes('INCOMPLETO'))return '<span class="pill yellow">Revisar</span>';if(r.status==='TRABAJO')return '<span class="pill green">Trabajo</span>';return '<span class="pill gray">'+h(r.status)+'</span>';}
function revision(){let filtered=data.records.filter(r=>{
 if(viewState.recordFilter==='issues'&&!getIssueFlag(r))return false;
 if(viewState.recordFilter==='edited'&&!r.edit)return false;
 let q=viewState.query.toLowerCase();return !q||(en(r.emp)?.name||'').toLowerCase().includes(q)||r.date.includes(q)||r.pdfStatus.toLowerCase().includes(q);
 }).sort((a,b)=>b.date.localeCompare(a.date)||Number(b.id)-Number(a.id));return `<section class="panel"><div class="panelhead"><div><h2>Fichajes históricos · ${data.records.length} registros</h2><p class="sectionnote">Consulta los fichajes cargados del Excel. Sin edición: las correcciones se realizan en el Excel original.</p></div><div class="flex"><button class="btn secondary" data-action="export-csv">Exportar CSV</button></div></div><div class="filters"><input id="record-search" class="field search" placeholder="Buscar por empleado o fecha…" value="${h(viewState.query)}"><select class="field" id="record-filter"><option value="all" ${viewState.recordFilter==='all'?'selected':''}>Todos</option><option value="issues" ${viewState.recordFilter==='issues'?'selected':''}>A revisar</option><option value="edited" ${viewState.recordFilter==='edited'?'selected':''}>Modificados</option></select><span class="muted">${filtered.length} resultados</span></div><div class="tablewrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Trabajador</th><th>Estado</th><th>Entrada / salida</th><th>Trabajo</th><th>H. extra</th><th>Noche</th><th>Acción</th></tr></thead><tbody>${filtered.slice(0,viewState.reviewLimit).map(r=>`<tr><td class="mono">${dshort(r.date)}</td><td>${h(en(r.emp)?.name||'')}</td><td>${displayRecordStatus(r)}</td><td class="mono">${r.edit?h(r.edit.start||'—')+' – '+h(r.edit.end||'—'):tstr(r.start)+' – '+tstr(r.end)}</td><td>${mstr(r.worked)}</td><td>${mstr(r.overtime)}</td><td>${mstr(r.night)}</td><td><button class="btn ghost small" data-action="edit-record" data-id="${r.id}">Consultar</button></td></tr>`).join('')}</tbody></table></div>${filtered.length>viewState.reviewLimit?`<div style="text-align:center;padding:16px"><button class="btn secondary" data-action="show-more">Mostrar más (${filtered.length-viewState.reviewLimit})</button></div>`:''}<div class="notice warn" style="margin-top:18px">Los cálculos de horas trabajadas, nocturnidad, déficit y saldo de los registros originales proceden del Excel. La pantalla es de solo lectura y muestra exactamente los resultados importados. No realiza cálculos de jornada.</div></section>`;}
function getIssueFlag(r){return Boolean(r.warning||r.control==='REVISAR'||r.action==='REVISAR'||r.pdfStatus.includes('INCOMPLETO')||r.correctionState.includes('PENDIENTE')||r.edit?.pending);}
function ajustes(){
 return `<div class="notice"><b>Modo presentación.</b> Esta versión lee los datos de la copia de CONTROL_HORARIO(1).xlsx incluida en el programa y no permite modificar trabajadores, jornadas, horas ni vacaciones.</div>
 <div class="settings-grid">
 <section class="panel"><h2>Versión y actualizaciones</h2>
  <div class="settings-box"><b>Versión instalada</b><p><strong>v${CJ_VERSION}</strong> · ${CJ_RELEASE}</p><span class="pill blue">Aplicación móvil</span></div>
  <div class="settings-box" style="margin-top:12px"><b>Estado</b><p>${h(updateStatus)}</p><button class="btn" data-action="check-update">Comprobar actualizaciones</button> ${updateAvailable?'<button class="btn secondary" data-action="install-update">Actualizar ahora</button>':''}</div>
  <p class="footer-note">Las actualizaciones desde esta pantalla requieren que la aplicación esté instalada desde una dirección HTTPS privada y que se publique allí la nueva versión. Abrir un ZIP desde Archivos no habilita actualizaciones remotas. Los datos de empleados no deben publicarse en una web pública.</p>
 </section>
 <section class="panel"><h2>Origen de información</h2>
  <div class="settings-box"><b>Archivo de referencia</b><p>${h(data.importedFrom||'CONTROL_HORARIO(1).xlsx')}</p><span class="pill blue">Copia local</span></div>
  <div class="settings-box" style="margin-top:12px"><b>Sincronización manual</b><p>La conexión OneDrive queda aparcada. Esta versión no busca cambios del Excel por sí sola; los datos mostrados son una fotografía de la copia importada.</p></div>
  <div class="settings-box" style="margin-top:12px"><b>Exportar datos visibles</b><p>Guarda una copia JSON de los datos que está mostrando la aplicación.</p><button class="btn" data-action="backup">Descargar JSON</button></div>
 </section>
 <section class="panel"><h2>Responsabilidades</h2>
 <div class="settings-box"><b>Excel original</b><p>Conserva todos los cálculos, fórmulas, saldos, reglas e histórico oficial.</p></div>
 <div class="settings-box" style="margin-top:12px"><b>Aplicación</b><p>Muestra marcas mensuales, fichajes existentes y resultados importados. No recalcula horas, nocturnidad, déficit ni vacaciones.</p></div>
 <div class="settings-box" style="margin-top:12px"><b>Privacidad</b><p>El paquete incluye datos reales de empleados: guárdalo en una carpeta privada y no lo publiques en Internet ni lo compartas sin autorización.</p></div>
 </section></div>`;
}
function fichaEmpleado(){
 const e=en(viewState.emp)||data.employees[0];
 const registros=data.records.filter(r=>String(r.emp)===String(e.id)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14);
 const v=(n)=>n===null||n===undefined||n===''?'—':h(n);
 const field=(label,value,sub='')=>`<div class="reader-stat"><small>${h(label)}</small><strong>${v(value)}</strong>${sub?`<span>${h(sub)}</span>`:''}</div>`;
 return `<div class="reader-lead"><div><div class="eyebrow">DATOS IMPORTADOS · SOLO CONSULTA</div><h2>${h(e.name)}</h2><p>Ficha individual de los valores de la hoja Excel de referencia.</p></div><div class="reader-lead-actions">${filterEmployee()}<button class="btn secondary" data-action="worker-calendar" data-emp="${e.id}">Ver calendario →</button></div></div>
 <div class="reader-cards"><section class="panel"><div class="reader-heading"><h2>Datos de plantilla</h2><span class="pill ${e.status==='ACTIVO'?'green':'gray'}">${h(e.status)}</span></div><div class="reader-grid">${field('Identificador',e.id)}${field('Fecha de alta',e.start?dshort(e.start):'—')}${field('Fecha de baja',e.end?dshort(e.end):'—')}</div></section>
 <section class="panel"><div class="reader-heading"><h2>Vacaciones · 2026</h2><span class="pill blue">Excel</span></div><div class="reader-grid">${field('Disfrutadas',e.used2026,'días')}${field('Programadas',e.planned2026,'días')}${field('Pendientes',e.pending2026,'días')}</div></section>
 <section class="panel"><div class="reader-heading"><h2>Vacaciones · 2027</h2><span class="pill blue">Excel</span></div><div class="reader-grid">${field('Derecho',e.entitlement2027,'días')}${field('Disfrutadas',e.used2027,'días')}${field('Programadas',e.planned2027,'días')}${field('Restantes',e.remaining2027,'días')}</div></section></div>
 <section class="panel"><div class="panelhead"><div><h2>Últimos fichajes disponibles</h2><p class="sectionnote">Valores de jornada, extras y nocturnidad almacenados en el Excel; no se vuelven a calcular.</p></div><button class="btn secondary" data-go="revision">Ver todos →</button></div>
 <div class="tablewrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Estado</th><th>Entrada</th><th>Salida</th><th>Trabajadas</th><th>Extras</th><th>Nocturnidad</th><th></th></tr></thead><tbody>${registros.map(r=>`<tr><td>${dshort(r.date)}</td><td>${displayRecordStatus(r)}</td><td class="mono">${tstr(r.start)}</td><td class="mono">${tstr(r.end)}</td><td>${mstr(r.worked)}</td><td>${mstr(r.overtime)}</td><td>${mstr(r.night)}</td><td><button class="link-button" data-action="edit-record" data-id="${r.id}">Ver →</button></td></tr>`).join('')||'<tr><td colspan="8">No hay fichajes importados para este trabajador.</td></tr>'}</tbody></table></div></section>
 <p class="reader-disclaimer">La ficha no representa un saldo calculado por la aplicación. Las cantidades provienen de los campos importados del Excel.</p>`;
}
function resumenAnual(){
 const year=viewState.year===2027?2027:2026;
 const columns=year===2026?[
 ['used2026','Disfrutadas'],['planned2026','Programadas'],['pending2026','Pendientes'],['carry2026','Arrastre registrado']
 ]:[
 ['entitlement2027','Derecho'],['used2027','Disfrutadas'],['planned2027','Programadas'],['remaining2027','Restantes']
 ];
 return `<section class="panel"><div class="panelhead"><div><div class="eyebrow">VISTA DE RESULTADOS DEL EXCEL</div><h2>Resumen anual · ${year}</h2><p class="sectionnote">Cada número es un valor importado. No se suman ni se recalculan vacaciones o jornadas.</p></div><div class="reader-year-switch"><button class="btn ${year===2026?'':'secondary'}" data-action="reader-year" data-year="2026">2026</button><button class="btn ${year===2027?'':'secondary'}" data-action="reader-year" data-year="2027">2027</button></div></div>
 <div class="tablewrap"><table class="data-table reader-summary"><thead><tr><th>Trabajador</th><th>Estado</th>${columns.map(([,t])=>`<th>${h(t)}</th>`).join('')}<th>Ficha</th></tr></thead><tbody>${data.employees.map(e=>`<tr><td>${person(e)}</td><td><span class="pill ${e.status==='ACTIVO'?'green':'gray'}">${h(e.status)}</span></td>${columns.map(([k])=>`<td class="mono"><strong>${e[k]===undefined||e[k]===null?'—':h(e[k])}</strong> <span class="reader-unit">d</span></td>`).join('')}<td><button class="link-button" data-action="view-emp" data-emp="${e.id}">Consultar →</button></td></tr>`).join('')}</tbody></table></div>
 <p class="footer-note">Campos copiados de la hoja «Vacaciones pendientes». Esta pantalla no muestra por ahora un total oficial de horas del año, porque dicho resultado debe importarse directamente del Excel antes de presentarlo.</p></section>`;
}


// Importación de PDF: área de preparación independiente. Nunca añade datos al histórico Excel.
const pdfState={files:[],rows:[],messages:[],selected:-1,mode:'review'};
const statusClass=x=>x==='REVISAR'?'yellow':x==='SIN MARCAJE'?'red':'green';
const escapeCsv=x=>{let v=String(x??'');if(/^[=+@-]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
function importarPDF(){
 const total=pdfState.rows.length,err=pdfState.rows.filter(x=>x.state!=='COMPLETO').length;
 return `<div class="notice"><b>Importación y revisión · borrador local.</b> Puedes seleccionar varios PDF desde Archivos/OneDrive. Los PDF de texto compatibles se intentan leer localmente. Antes de pasar información al Excel debes revisar cada resultado. No se calculan horas, no se actualizan saldos ni se modifica el Excel.</div>
 <section class="panel"><div class="panelhead"><div><h2>1. Seleccionar documentos</h2><p class="sectionnote">PDF de control de fichajes, no hojas de carga de mercancía.</p></div></div>
 <div class="pdf-drop" id="pdf-drop"><span style="font-size:28px">⇪</span><strong>Arrastra los PDF aquí</strong><span>o selecciónalos desde Archivos / OneDrive</span><label class="btn" for="pdf-files">Seleccionar PDF</label><input type="file" id="pdf-files" accept="application/pdf,.pdf" multiple hidden></div>
 <div class="pdf-file-list">${pdfState.files.length?pdfState.files.map((f,i)=>`<div class="pdf-file"><span>▤ ${h(f.name)}</span><span class="pill ${f.ok?'green':'yellow'}">${f.ok?'Texto extraído':'Requiere revisión'}</span></div>`).join(''):'<p class="muted">Aún no has seleccionado ningún archivo.</p>'}</div>
 ${pdfState.messages.map(t=>`<p class="pdf-message">${h(t)}</p>`).join('')}
 <div class="settings-box" style="margin-top:15px"><b>Si el PDF no se reconoce</b><p>Abre el PDF, copia el texto de los registros y pégalo aquí. Esto permite probar el formato sin enviar documentación a servicios externos.</p><textarea id="pdf-paste" class="field" rows="5" style="width:100%;resize:vertical" placeholder="Ej.: 21/10/2026  José Gude Bermúdez  15:00  23:00"></textarea><div class="actions"><button class="btn secondary" data-action="pdf-parse-paste">Analizar texto</button></div></div>
 </section>
 <section class="panel"><div class="panelhead"><div><h2>2. Revisar registros extraídos</h2><p class="sectionnote">Identificación orientativa. Marca de ausencia o registro incompleto se presenta para revisión, nunca se interpreta como jornada calculada.</p></div><div class="flex"><span class="pill ${err?'yellow':'green'}">${total} registros · ${err} por revisar</span></div></div>
 <div class="tablewrap"><table class="data-table"><thead><tr><th>Archivo</th><th>Fecha</th><th>Trabajador detectado</th><th>Entrada</th><th>Salida</th><th>Estado</th><th>Texto original</th></tr></thead><tbody>${pdfState.rows.map((r,i)=>`<tr><td>${h(r.file)}</td><td class="mono">${h(r.date||'—')}</td><td>${h(r.employee||'Por identificar')}</td><td class="mono">${h(r.start||'—')}</td><td class="mono">${h(r.end||'—')}</td><td><span class="pill ${statusClass(r.state)}">${h(r.state)}</span></td><td><button class="link-button" data-action="pdf-line" data-line="${i}">Ver →</button></td></tr>`).join('')||'<tr><td colspan="7" class="muted">Importa un PDF o pega texto para comenzar.</td></tr>'}</tbody></table></div>
 <div class="actions" style="margin-top:16px"><button class="btn secondary" data-action="pdf-clear">Vaciar borrador</button><button class="btn" data-action="pdf-export" ${total?'':'disabled'}>Exportar revisión CSV</button></div><p class="footer-note">La exportación es un CSV de revisión, no una importación directa en la hoja original. Adaptaremos las columnas cuando validemos un PDF real de fichajes.</p></section>`;
}
function parsePdfLines(source,file){
 const lines=source.replace(/\r/g,'\n').split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>7);
 let n=0;for(let line of lines){
  const dateMatch=line.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d\d)\b|\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/);
  if(!dateMatch)continue;
  const date=dateMatch[4]?`${dateMatch[4]}-${dateMatch[5].padStart(2,'0')}-${dateMatch[6].padStart(2,'0')}`:`${dateMatch[3]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`;
  const times=[...line.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map(m=>m[0]);
  const names=data.employees.filter(e=>{const clean=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return clean(line).includes(clean(e.name));});
  let employee=names.length===1?names[0].name:'';
  let state=/SIN MARCAJE|NO FICHA|SIN FICHA/i.test(line)?'SIN MARCAJE':(!employee||times.length!==2||/INCOMPLETO|REVISAR/i.test(line))?'REVISAR':'COMPLETO';
  pdfState.rows.push({file,date,employee,start:times[0]||'',end:times[1]||'',state,line});n++;
 }
 return n;
}
async function pdfExtract(file){
 // Lectura básica de operadores de texto PDF. No reemplaza PDF.js; falla de forma segura si no se obtiene texto legible.
 const bytes=new Uint8Array(await file.arrayBuffer()), raw=new TextDecoder('latin1').decode(bytes);
 if(!raw.startsWith('%PDF-'))throw new Error('Archivo sin cabecera PDF válida');
 let chunks=[]; const streams=/<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/gs;let m;
 while((m=streams.exec(raw))){let text=m[2];if(/FlateDecode/.test(m[1])){
   if(!('DecompressionStream' in window))continue;
   try{let b=new Uint8Array(text.length);for(let i=0;i<text.length;i++)b[i]=text.charCodeAt(i);let response=new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate')));text=new TextDecoder('latin1').decode(await response.arrayBuffer());}catch(e){continue;}
  }
  if(!/\bBT\b/.test(text))continue;
  const blocks=text.match(/BT[\s\S]*?ET/g)||[];
  for(const block of blocks){let words=[];for(const tok of block.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:[^\]]|\\\])*)\]\s*TJ/g)){
    let part=tok[1]??tok[2];const entries=[...part.matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map(x=>x[1]);if(entries.length)part=entries.join('');
    words.push(part.replace(/\\([()\\])/g,'$1').replace(/\\[nrt]/g,' '));
  }if(words.length)chunks.push(words.join(' '));}
 }
 return chunks.join('\n');
}
async function pdfAdd(files){
 for(const file of [...files].filter(f=>/\.pdf$/i.test(f.name)||f.type==='application/pdf')){
   try{const t=await pdfExtract(file),count=parsePdfLines(t,file.name);pdfState.files.push({name:file.name,ok:count>0});pdfState.messages.push(count?`${file.name}: ${count} líneas con fecha detectadas. Comprueba empleados y horarios.`:`${file.name}: no se obtuvo un formato de texto reconocible. Copia y pega el texto para analizarlo; si es imagen hará falta OCR.`);}
   catch(e){pdfState.files.push({name:file.name,ok:false});pdfState.messages.push(`${file.name}: ${e.message}`);}
 }render();}
function pdfExport(){const cols=['Archivo','Fecha','Empleado detectado','Entrada','Salida','Estado','Texto original'];const rows=pdfState.rows.map(r=>[r.file,r.date,r.employee,r.start,r.end,r.state,r.line]);const csv='\uFEFF'+[cols,...rows].map(r=>r.map(escapeCsv).join(';')).join('\r\n');download(new Blob([csv],{type:'text/csv;charset=utf-8'}),`ControlJornada-revision-PDF-${TODAY}.csv`);notify('CSV de revisión preparado');}

function render(){const side=`<aside class="sidebar"><div class="brand"><div class="brandmark">✓</div><div><b>Control Jornada</b><small>GESTIÓN DE PERSONAL</small></div></div><div class="navsmall">MENÚ PRINCIPAL</div><nav>${VIEWS.map(([name,ico,label])=>`<button class="navitem ${viewState.page===name?'active':''}" data-go="${name}"><span>${ico}</span>${label}</button>`).join('')}</nav><div class="sidefoot"><strong>Versión 0.9 · Móvil</strong><br>Solo lectura · sin cálculos laborales<br>Datos del Excel 2026–2027</div></aside>`;
const pages={inicio,calendario,fichaEmpleado,resumenAnual,empleados,revision,vacaciones,cobertura,ajustes,importar:importarPDF,ficha:fichaEmpleado,resumen:resumenAnual};document.getElementById('app').innerHTML=side+`<main class="main">${topbar()}${pages[viewState.page]()}</main><nav class="bottomnav">${[['calendario','▦','Mes'],['ficha','♙','Ficha'],['resumen','◫','Anual'],['revision','☷','Fichajes'],['importar','⇪','Importar PDF'],['ajustes','⚙','Datos']].map(([p,ic,label])=>`<button class="${viewState.page===p?'active':''}" data-go="${p}"><span>${ic}</span>${label}</button>`).join('')}</nav>`;}
function modal(inner){document.getElementById('modal-root').innerHTML=`<div class="modal-back"><div class="dialog" role="dialog" aria-modal="true">${inner}</div></div>`;}
function closeModal(){document.getElementById('modal-root').innerHTML='';}
function markModal(date){
 const e=en(viewState.emp);if(!e)return;
 const current=mark(date,e.id),note=data.markNotes[mkey(date,e.id)]||'';
 modal(`<button class="modal-x" data-action="close-modal">✕</button><div class="eyebrow">CONSULTA DEL CALENDARIO</div><h2>${dshort(date)}</h2>
 <p><b>${h(e.name)}</b></p><div class="settings-box"><b>Marca del Excel</b><p>${current?h(STATES[current]?.[0]||current):'Sin incidencia registrada'}</p></div>
 ${note?`<div class="settings-box" style="margin-top:12px"><b>Nota de origen</b><p>${h(note)}</p></div>`:''}
 <p class="footer-note">Vista de solo lectura. Para cambiar la información se utiliza el Excel original.</p>
 <div class="actions"><button class="btn" data-action="close-modal">Cerrar</button></div>`);
}
function empModal(id){let e=en(id);if(!e)return;modal(`<button class="modal-x" data-action="close-modal">✕</button><div class="eyebrow">FICHA DEL EMPLEADO</div><h2>${h(e.name)}</h2><p>Estado: <b>${h(e.status)}</b>${e.start?' · Alta '+dshort(e.start):''}${e.end?' · Baja '+dshort(e.end):''}</p><div class="two-cols"><div class="mini"><span>Usadas 2026</span><strong>${e.used2026}</strong></div><div class="mini"><span>Programadas 2026</span><strong>${e.planned2026}</strong></div><div class="mini"><span>Pendientes 2026</span><strong>${e.pending2026}</strong></div><div class="mini"><span>Restantes 2027</span><strong>${e.remaining2027}</strong></div></div><p>Resumen de vacaciones procedente de la hoja original.</p><div class="actions"><button class="btn secondary" data-action="close-modal">Cerrar</button><button class="btn" data-action="emp-calendar" data-emp="${e.id}">Ver su calendario →</button></div>`);}
function coverageModal(date){let info=countAbsences(date);modal(`<button class="modal-x" data-action="close-modal">✕</button><div class="eyebrow">CONTROL DE COBERTURA</div><h2>${dshort(date)}</h2><p><b>${info.count} personas ausentes</b> · Límite configurado: ${data.settings.maxAbsences}</p>${Object.entries(info.by).filter(([,x])=>x.length).map(([code,names])=>`<label>${h(STATES[code][0])} (${names.length})</label><p>${names.map(h).join('<br>')}</p>`).join('')||'<p>Todos los trabajadores disponibles según las marcas del calendario.</p>'}<div class="actions"><button class="btn" data-action="close-modal">Cerrar</button></div>`);}
function editModal(id){
 const r=data.records.find(x=>String(x.id)===String(id));if(!r)return;
 modal(`<button class="modal-x" data-action="close-modal">✕</button><div class="eyebrow">FICHAJE IMPORTADO · SOLO LECTURA</div><h2>${dshort(r.date)}</h2>
 <p><b>${h(en(r.emp)?.name||'')}</b></p>
 <div class="two-cols">
 <div class="mini"><span>Entrada</span><strong>${tstr(r.start)}</strong></div>
 <div class="mini"><span>Salida</span><strong>${tstr(r.end)}</strong></div>
 <div class="mini"><span>Horas del Excel</span><strong>${mstr(r.worked)}</strong></div>
 <div class="mini"><span>Nocturnidad del Excel</span><strong>${mstr(r.night)}</strong></div>
 </div>
 <p><b>Estado:</b> ${h(r.pdfStatus||r.status||'—')}</p>
 ${r.warning?`<p class="notice warn">${h(r.warning)}</p>`:''}
 <p class="footer-note">Los valores se muestran como estaban en el Excel. Esta pantalla no realiza ningún recálculo.</p>
 <div class="actions"><button class="btn" data-action="close-modal">Cerrar</button></div>`);
}
function addRecordModal(){modal(`<button class="modal-x" data-action="close-modal">✕</button><div class="eyebrow">NUEVA JORNADA</div><h2>Fichaje manual</h2><p>Añade una jornada que no existe en el Excel. La duración se calcula de forma orientativa; el resto de reglas quedan pendientes de validar.</p><form id="new-record-form"><label for="new-worker">Empleado</label><select class="field" name="emp" id="new-worker" required>${data.employees.filter(e=>e.status==='ACTIVO').map(e=>`<option value="${e.id}">${h(e.name)}</option>`).join('')}</select><label for="new-date">Fecha de la jornada</label><input id="new-date" class="field" type="date" name="date" required value="${TODAY}"><div class="two-cols"><div><label for="new-start">Entrada</label><input id="new-start" class="field" name="start" required placeholder="15:00" pattern="[0-9]{1,2}:[0-5][0-9]"></div><div><label for="new-end">Salida</label><input id="new-end" class="field" name="end" required placeholder="01:00" pattern="[0-9]{1,2}:[0-5][0-9]"></div></div><label for="new-note">Observaciones</label><textarea class="field" name="note" placeholder="Motivo del registro manual" style="min-height:68px"></textarea><div class="actions"><button type="button" class="btn secondary" data-action="close-modal">Cancelar</button><button class="btn" type="submit">Añadir jornada</button></div></form>`);}
function saveNewRecord(){notify('Esta versión es de solo lectura');}
function exportBackup(){let str=JSON.stringify(data,null,2);download(new Blob([str],{type:'application/json'}),`ControlJornada-copia-${TODAY}.json`);notify('Copia de seguridad preparada');}
function exportCSV(){let header=['Fecha','Empleado','Estado','Entrada','Salida','Trabajadas (h)','Extras (h)','Nocturnidad (h)','Control','Corrección pendiente'];let rows=data.records.map(r=>[r.date,en(r.emp)?.name||'',r.status,r.edit?.start||tstr(r.start),r.edit?.end||tstr(r.end),r.worked==null?'':(r.worked*24).toFixed(2),r.overtime==null?'':(r.overtime*24).toFixed(2),r.night==null?'':(r.night*24).toFixed(2),r.control,r.edit?'SI':'NO']);const csv='\uFEFF'+[header,...rows].map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');download(new Blob([csv],{type:'text/csv;charset=utf-8'}),`ControlJornada-registros-${TODAY}.csv`);notify('CSV exportado');}
function saveMark(){notify('Esta versión es de solo lectura');}
function undoLastMark(){notify('Esta versión es de solo lectura');}
function exportMonth(){
 const y=viewState.year,m=viewState.month,dates=daysOfMonth(y,m);
 const rows=[['Fecha','Empleado','Código','Incidencia','Nota','Ausentes en la fecha']];
 for(const e of data.employees)for(const d of dates){const state=mark(d,e.id);rows.push([d,e.name,state,STATES[state]?.[0]||state,data.markNotes[mkey(d,e.id)]||'',countAbsences(d).count]);}
 const csvValue=x=>{let v=String(x??'');if(/^[=+@-]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';};
 const csv='\uFEFF'+rows.map(row=>row.map(csvValue).join(';')).join('\r\n');
 download(new Blob([csv],{type:'text/csv;charset=utf-8'}),`ControlJornada-${y}-${String(m+1).padStart(2,'0')}-calendario.csv`);
 notify('Calendario mensual exportado');
}
function saveRecord(){notify('Esta versión es de solo lectura');}
async function loadBackup(){notify('Esta versión es de solo lectura');}
document.addEventListener('click',event=>{const target=event.target.closest('[data-go],[data-action]');if(!target)return;
 if(target.dataset.go){nav(target.dataset.go);return;}
 let act=target.dataset.action;
 switch(act){case'check-update':checkMobileUpdate();break;case'install-update':installMobileUpdate();break;case'backup':exportBackup();break;case'pdf-export':pdfExport();break;case'pdf-clear':pdfState.files=[];pdfState.rows=[];pdfState.messages=[];render();break;case'pdf-line':{let r=pdfState.rows[Number(target.dataset.line)];if(r)modal(`<h2>Texto del PDF</h2><p style="white-space:pre-wrap;overflow-wrap:anywhere">${h(r.line)}</p><div class="actions"><button class="btn" data-action="close-modal">Cerrar</button></div>`);break;}case'pdf-parse-paste':{let el=document.getElementById('pdf-paste'),t=el?.value||'';if(!t.trim())return notify('Pega primero el texto');let n=parsePdfLines(t,'Texto pegado');pdfState.messages.push(`${n} líneas encontradas en texto pegado`);render();break;}case'view-emp':viewState.emp=target.dataset.emp;nav('ficha');break;case'worker-calendar':viewState.emp=target.dataset.emp;viewState.calendarMode='individual';nav('calendario');break;case'reader-year':viewState.year=Number(target.dataset.year);render();break;case'prev-month':changeMonth(-1);break;case'next-month':changeMonth(1);break;case'mark-day':if(target.dataset.emp)viewState.emp=target.dataset.emp;markModal(target.dataset.date);break;case'matrix-mode':viewState.calendarMode=viewState.calendarMode==='equipo'?'individual':'equipo';render();break;case'open-worker-month':viewState.emp=target.dataset.emp;viewState.calendarMode='individual';render();break;case'pick-month':viewState.month=Number(target.dataset.month);render();break;case'prev-year':viewState.year--;render();break;case'next-year':viewState.year++;render();break;case'today-month':{let dt=new Date();viewState.month=dt.getMonth();viewState.year=dt.getFullYear();render();break;}case'export-month':exportMonth();break;case'undo-mark':undoLastMark();break;case'close-modal':closeModal();break;case'show-emp':empModal(target.dataset.emp);break;case'emp-calendar':viewState.emp=target.dataset.emp;viewState.calendarMode='individual';closeModal();nav('calendario');break;case'coverage-detail':coverageModal(target.dataset.date);break;case'edit-record':editModal(target.dataset.id);break;case'add-record':notify('Esta versión es de solo lectura');break;case'export-csv':exportCSV();break;case'show-more':viewState.reviewLimit+=100;render();break;case'restore':notify('Esta versión es de solo lectura');break;case'reset':notify('Esta versión es de solo lectura');break;case'save-settings':notify('La configuración oficial pertenece al Excel');break;}
});
document.addEventListener('change',event=>{const t=event.target;if(t.id==='pdf-files'&&t.files?.length){pdfAdd(t.files);t.value='';}if(t.id==='employee-select'){viewState.emp=t.value;render();}if(t.id==='record-filter'){viewState.recordFilter=t.value;viewState.reviewLimit=60;render();}if(t.id==='file-restore'&&t.files[0])loadBackup(t.files[0]);});
document.addEventListener('input',event=>{const t=event.target;if(t.id==='record-search'){viewState.query=t.value;viewState.reviewLimit=60;let pos=t.selectionStart;render();let x=document.getElementById('record-search');x?.focus();x?.setSelectionRange(pos,pos);}if(t.id==='employee-search'){viewState.employeeQuery=t.value;let pos=t.selectionStart;render();let x=document.getElementById('employee-search');x?.focus();x?.setSelectionRange(pos,pos);}});
document.addEventListener('submit',event=>{if(event.target.id==='mark-form'){event.preventDefault();notify('Esta versión es de solo lectura');}if(event.target.id==='edit-form'){event.preventDefault();notify('Esta versión es de solo lectura');}if(event.target.id==='new-record-form'){event.preventDefault();notify('Esta versión es de solo lectura');}});
window.CJBridge={getData:()=>data,setData:next=>{data=next;persist();render();},render,persist,notify};
document.getElementById('modal-root').addEventListener('click',event=>{if(event.target.classList.contains('modal-back'))closeModal();});
render();

async function checkMobileUpdate(){
 if(location.protocol==='file:' || !navigator.onLine){updateStatus='Sin conexión de publicación: abre la aplicación desde su URL privada HTTPS.';render();return;}
 updateStatus='Buscando nueva versión…';render();
 try{
  const response=await fetch('./version.json?check='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('No se pudo consultar version.json');
  const release=await response.json();
  if(!/^\d+\.\d+\.\d+$/.test(release.version||''))throw new Error('Formato de versión no válido');
  const cmp=(a,b)=>{const aa=a.split('.').map(Number),bb=b.split('.').map(Number);for(let i=0;i<3;i++){if(aa[i]!==bb[i])return aa[i]-bb[i];}return 0;};
  updateAvailable=cmp(release.version,CJ_VERSION)>0;
  updateStatus=updateAvailable?'Disponible: v'+release.version:'Estás utilizando la última versión publicada (v'+CJ_VERSION+').';
  if(updateRegistration)await updateRegistration.update();
 }catch(e){updateStatus='No se pudo verificar: '+e.message+'. Comprueba la conexión y la publicación privada.';}
 render();
}
async function installMobileUpdate(){
 if(!updateAvailable)return;
 if(!updateRegistration){updateStatus='No hay instalador móvil activo. Se necesita una URL HTTPS privada.';render();return;}
 try{
  await updateRegistration.update();
  if(updateRegistration.waiting){updateStatus='Aplicando actualización…';render();updateRegistration.waiting.postMessage({type:'SKIP_WAITING'});return;}
  updateStatus='Nueva versión detectada. Cierra y vuelve a abrir la aplicación si no se actualiza todavía.';render();
 }catch(e){updateStatus='No se pudo aplicar: '+e.message;render();}
}
if('serviceWorker' in navigator && location.protocol==='https:'){
 navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{updateRegistration=reg;}).catch(()=>{});
}

document.addEventListener('dragover',e=>{if(e.target.closest('#pdf-drop'))e.preventDefault();});
document.addEventListener('drop',e=>{if(e.target.closest('#pdf-drop')){e.preventDefault();pdfAdd(e.dataTransfer.files);}});
