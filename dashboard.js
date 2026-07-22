import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig={apiKey:'AIzaSyAa39XCZwLiIz0xlzjEGAVUbMl5r8Y6dWQ',authDomain:'ai-class-dashboard-f0fbd.firebaseapp.com',databaseURL:'https://ai-class-dashboard-f0fbd-default-rtdb.firebaseio.com',projectId:'ai-class-dashboard-f0fbd',storageBucket:'ai-class-dashboard-f0fbd.firebasestorage.app',messagingSenderId:'1009369795925',appId:'1:1009369795925:web:c2de08f7a5c5bbc19773dc'};
const students=['UF-4602','SH-9733','NG-3471','AR-8540','IS-3124','AK-5118','YP-9838','JG-8036','DL-5638','MR-8419','MB-5198','AW-2413','SS-3900','PL-1623','SB-3139','MF-5462','AG-4344','AS-5720','ZT-4302','MG-8004','MH-4597','EB-7098','ZK-9057','DP-7669','SJ-6047','YF-9052','TE-5169','JB-5915','SS-4558','MG-3297','JK-3407','JW-9447'];
const app=initializeApp(firebaseConfig),db=getDatabase(app);
let state={sessions:{},meta:{}};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const session=i=>state.sessions?.[i]||{};
const count=(s,key)=>students.filter(id=>s?.[key]?.[id]).length;
const percent=(n,d=students.length)=>d?Math.round(n/d*100):0;
const studentStats=id=>{let a=0,r=0;for(let i=1;i<=8;i++){a+=session(i).attendance?.[id]?1:0;r+=session(i).review?.[id]?1:0}return{a,r,overall:Math.round((a+r)/16*100)}};

const TRAINING_TIME_ZONE='America/New_York';
let countdownTimer=null;

function zonedDateTimeToUtc(dateString,hour,minute){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateString||'')) return null;
  const [year,month,day]=dateString.split('-').map(Number);
  let guess=Date.UTC(year,month-1,day,hour,minute,0);
  const formatter=new Intl.DateTimeFormat('en-US',{timeZone:TRAINING_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let pass=0;pass<3;pass++){
    const parts=Object.fromEntries(formatter.formatToParts(new Date(guess)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
    const shown=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);
    const wanted=Date.UTC(year,month-1,day,hour,minute,0);
    guess+=wanted-shown;
  }
  return new Date(guess);
}

function scheduledSessions(){
  const items=[];
  for(let i=1;i<=8;i++){
    const s=session(i);
    if(!s.date) continue;
    const start=zonedDateTimeToUtc(s.date,20,0);
    const end=zonedDateTimeToUtc(s.date,22,30);
    if(start&&end) items.push({i,s,start,end});
  }
  return items.sort((a,b)=>a.start-b.start);
}

function setCountdownValues(ms){
  const seconds=Math.max(0,Math.floor(ms/1000));
  const days=Math.floor(seconds/86400);
  const hours=Math.floor((seconds%86400)/3600);
  const minutes=Math.floor((seconds%3600)/60);
  const secs=seconds%60;
  $('#countDays').textContent=String(days);
  $('#countHours').textContent=String(hours).padStart(2,'0');
  $('#countMinutes').textContent=String(minutes).padStart(2,'0');
  $('#countSeconds').textContent=String(secs).padStart(2,'0');
}

function updateClassCountdown(){
  const box=$('#nextClassCountdown');
  if(!box) return;
  const items=scheduledSessions();
  const now=new Date();
  const remaining=items.filter(item=>item.end>now);
  $('#classesRemaining').textContent=`${remaining.length} ${remaining.length===1?'class':'classes'} remaining`;
  box.classList.remove('finished');

  if(!items.length){
    $('#countdownTitle').textContent='Add class dates in the admin page';
    $('#countdownSession').textContent='Classes run 8:00 PM–10:30 PM Eastern Time';
    setCountdownValues(0);
    return;
  }
  if(!remaining.length){
    box.classList.add('finished');
    $('#countdownTitle').textContent='No more sessions left';
    $('#countdownSession').textContent='All scheduled classes are complete';
    return;
  }

  const current=remaining.find(item=>item.start<=now&&now<item.end);
  const target=current||remaining.find(item=>item.start>now)||remaining[0];
  const targetTime=current?target.end:target.start;
  $('#countdownTitle').textContent=current?`${target.s.title||`Class ${target.i}`} ends in`:`${target.s.title||`Class ${target.i}`} starts in`;
  const dateLabel=target.start.toLocaleDateString('en-US',{timeZone:TRAINING_TIME_ZONE,weekday:'short',month:'short',day:'numeric',year:'numeric'});
  $('#countdownSession').textContent=`${dateLabel} · 8:00 PM–10:30 PM Eastern Time`;
  setCountdownValues(targetTime-now);
}

function startClassCountdown(){
  if(countdownTimer) clearInterval(countdownTimer);
  updateClassCountdown();
  countdownTimer=setInterval(updateClassCountdown,1000);
}

function statusInfo(s){const raw=s.status||'not-started';return {key:raw,label:raw==='completed'?'Completed':raw==='in-progress'?'In Progress':'Not Started'}}
function openModal(title,subtitle,html){$('#modalTitle').textContent=title;$('#modalSubtitle').textContent=subtitle||'';$('#modalBody').innerHTML=html;$('#detailModal').classList.add('open')}
function studentProfile(id){const st=studentStats(id);const rows=Array.from({length:8},(_,x)=>{const i=x+1,s=session(i);return `<tr><td>${esc(s.title||`Class ${i}`)}</td><td><span class="state-dot ${s.attendance?.[id]?'yes':'no'}"></span>${s.attendance?.[id]?'Attended':'Absent'}</td><td><span class="state-dot ${s.review?.[id]?'yes':'no'}"></span>${s.review?.[id]?'Reviewed':'Pending'}</td></tr>`}).join('');openModal(id,`${st.a}/8 attended · ${st.r}/8 reviewed · ${st.overall}% overall`,`<div class="profile-summary"><div><strong>${percent(st.a,8)}%</strong><span>Attendance</span></div><div><strong>${percent(st.r,8)}%</strong><span>Reviews</span></div><div><strong>${st.overall}%</strong><span>Overall</span></div></div><div class="table-card"><table class="profile-table"><thead><tr><th>Session</th><th>Attendance</th><th>Review</th></tr></thead><tbody>${rows}</tbody></table></div>`)}
function detailList(i,type){const s=session(i),map=s[type]||{},yes=students.filter(x=>map[x]),no=students.filter(x=>!map[x]);openModal(`${s.title||`Class ${i}`} · ${type==='attendance'?'Attendance':'Review'}`,`${yes.length} completed · ${no.length} not completed`,`<div class="split-lists"><div class="list-box"><h3>${type==='attendance'?'Attended':'Reviewed'}</h3>${yes.map(x=>`<button class="student-chip" data-student="${x}">${x}</button>`).join('')||'<span class="muted">None yet</span>'}</div><div class="list-box"><h3>${type==='attendance'?'Did not attend':'Not reviewed'}</h3>${no.map(x=>`<button class="student-chip muted-chip" data-student="${x}">${x}</button>`).join('')||'<span class="muted">None</span>'}</div></div>`)}
function resourceModal(i){const s=session(i),resources=Array.isArray(s.resources)?s.resources.filter(x=>x?.url):[];openModal(`${s.title||`Class ${i}`} · Resources`,resources.length?`${resources.length} available`:'No resources added',resources.length?`<div class="resource-list">${resources.map(x=>`<a class="resource-item" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><span>↗</span><div><strong>${esc(x.label||'Open resource')}</strong><small>${esc(x.url)}</small></div></a>`).join('')}</div>`:'<div class="empty">No files or links have been added for this class.</div>')}
function donutStyle(v,color){return `background:conic-gradient(${color} 0 ${v}%,rgba(125,132,155,.18) ${v}% 100%)`}

function renderHome(){let totalA=0,totalR=0;const grid=$('#classGrid');grid.innerHTML='';for(let i=1;i<=8;i++){const s=session(i),a=count(s,'attendance'),r=count(s,'review'),ap=percent(a),rp=percent(r),complete=Math.round((a+r)/64*100),si=statusInfo(s),resources=Array.isArray(s.resources)?s.resources.filter(x=>x?.url).length:0;totalA+=a;totalR+=r;const card=document.createElement('article');card.className='card session-card';card.innerHTML=`<div class="card-head"><div><div class="status-badge ${si.key}">${si.label}</div><h3>${esc(s.title||`Class ${i}`)}</h3><small>${s.date?new Date(`${s.date}T12:00:00`).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}):'Session date not set'}</small></div><span class="completion-badge">${complete}% complete</span></div><div class="charts"><button class="chart-button" data-session="${i}" data-type="attendance"><div class="donut" style="${donutStyle(ap,'#16a36a')}"><div class="donut-content"><strong>${a}</strong><span>${ap}% attended</span></div></div><div class="legend">${students.length-a} absent</div></button><button class="chart-button" data-session="${i}" data-type="review"><div class="donut" style="${donutStyle(rp,'#148cc8')}"><div class="donut-content"><strong>${r}</strong><span>${rp}% reviewed</span></div></div><div class="legend">${students.length-r} pending</div></button></div><div class="progress"><i style="width:${complete}%"></i></div>${s.notes?`<div class="session-note"><strong>Instructor note</strong><p>${esc(s.notes)}</p></div>`:''}<div class="card-footer"><button class="text-btn" data-resources="${i}">Resources <span>${resources}</span></button><button class="text-btn" data-session="${i}" data-type="attendance">View roster</button></div>`;grid.appendChild(card)}
 const stats=students.map(studentStats);const perfect=stats.filter(x=>x.a===8&&x.r===8).length,perfectA=stats.filter(x=>x.a===8).length,follow=stats.filter(x=>x.overall<50).length;$('#attendedCount').textContent=totalA;$('#reviewCount').textContent=totalR;$('#overallAttendance').textContent=`${percent(totalA,256)}%`;$('#overallReview').textContent=`${percent(totalR,256)}%`;$('#perfectCount').textContent=perfect;$('#fullAttendance').textContent=perfectA;$('#followUpCount').textContent=follow;}
function renderDirectory(filter=''){const q=filter.trim().toUpperCase();$('#directoryGrid').innerHTML=students.filter(id=>id.includes(q)).map(id=>{const s=studentStats(id);return `<button class="student-card" data-student="${id}"><div class="avatar">${id.slice(0,2)}</div><div class="student-card-main"><strong>${id}</strong><span>${s.a}/8 attended · ${s.r}/8 reviewed</span><div class="student-progress"><i style="width:${s.overall}%"></i></div></div><b>${s.overall}%</b></button>`}).join('')||'<div class="empty">No students match that search.</div>'}
function renderLeaderboard(){const ranked=students.map(id=>({id,...studentStats(id)})).sort((a,b)=>b.overall-a.overall||b.a-a.a||a.id.localeCompare(b.id));$('#leaderboardBody').innerHTML=ranked.map((x,n)=>`<tr data-student="${x.id}" class="click-row"><td><span class="rank rank-${n+1}">${n+1}</span></td><td><strong>${x.id}</strong></td><td>${x.a}/8 <small>${percent(x.a,8)}%</small></td><td>${x.r}/8 <small>${percent(x.r,8)}%</small></td><td><div class="score"><i style="width:${x.overall}%"></i><b>${x.overall}%</b></div></td></tr>`).join('')}
function renderBars(target,key,color){$(target).innerHTML=Array.from({length:8},(_,x)=>{const i=x+1,s=session(i),n=count(s,key),p=percent(n);return `<div class="bar-row"><span>${esc(s.title||`Class ${i}`)}</span><div class="bar-track"><i style="width:${p}%;background:${color}"></i></div><b>${p}%</b></div>`}).join('')}
function renderAnalytics(){renderBars('#attendanceBars','attendance','#16a36a');renderBars('#reviewBars','review','#148cc8');const risk=students.map(id=>({id,...studentStats(id)})).filter(x=>x.overall<50).sort((a,b)=>a.overall-b.overall);$('#atRiskList').innerHTML=risk.length?risk.map(x=>`<button class="risk-item" data-student="${x.id}"><strong>${x.id}</strong><span>${x.a}/8 attended · ${x.r}/8 reviewed</span><b>${x.overall}%</b></button>`).join(''):'<div class="success-box">Great work — no students are currently below 50% completion.</div>'}
function renderAll(){renderHome();renderDirectory($('#directorySearch')?.value||'');renderLeaderboard();renderAnalytics()}

$$('.nav-btn[data-view]').forEach(btn=>btn.onclick=()=>{$$('.nav-btn[data-view]').forEach(x=>x.classList.toggle('active',x===btn));$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${btn.dataset.view}`));window.scrollTo({top:0,behavior:'smooth'})});
document.addEventListener('click',e=>{const st=e.target.closest('[data-student]');if(st){studentProfile(st.dataset.student);return}const chart=e.target.closest('[data-session][data-type]');if(chart){detailList(+chart.dataset.session,chart.dataset.type);return}const res=e.target.closest('[data-resources]');if(res)resourceModal(+res.dataset.resources)});
$('#closeModal').onclick=()=>$('#detailModal').classList.remove('open');$('#detailModal').onclick=e=>{if(e.target===$('#detailModal'))$('#detailModal').classList.remove('open')};document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#detailModal').classList.remove('open')});
$('#studentSearch').addEventListener('input',e=>{const q=e.target.value.trim().toUpperCase(),hit=students.find(s=>s===q);if(hit)studentProfile(hit)});$('#directorySearch').addEventListener('input',e=>renderDirectory(e.target.value));
const theme=localStorage.getItem('theme')||'light';document.documentElement.dataset.theme=theme;$('#themeBtn').onclick=()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;localStorage.setItem('theme',n)};

onValue(ref(db,'trainingDashboard'),snap=>{state=snap.val()||{sessions:{},meta:{}};$('#connection').textContent='● Live data connected';const u=state.meta?.updatedAt;$('#updated').textContent=`Last updated: ${u?new Date(u).toLocaleString():'No saves yet'}`;$('#updatedBy').textContent=`Updated by: ${state.meta?.updatedBy||'—'}`;renderAll();startClassCountdown()},err=>{startClassCountdown();$('#connection').textContent='Connection error';$('#classGrid').innerHTML=`<div class="empty">Unable to load Firebase data: ${esc(err.message)}</div>`});
