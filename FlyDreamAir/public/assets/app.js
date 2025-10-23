/* Airline Pro v3.1 (UI-focused but keeps realistic behaviors) */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];

function toast(msg){ const t = $('#toast'); t.textContent = msg; t.style.display='block'; setTimeout(()=> t.style.display='none', 2200); }
function modal(title, content, actions=[{label:'Close'}]){
  const backdrop = $('#modalBackdrop'); const box = backdrop.querySelector('.modal');
  box.innerHTML = `<h3 style="margin:0 0 8px">${title}</h3><div class="body">${content}</div><div class="actions"></div>`;
  const actionsEl = box.querySelector('.actions');
  actions.forEach(a=>{ const btn = document.createElement('button'); btn.className='btn inline'+(a.variant==='ghost'?' ghost':''); btn.textContent=a.label; btn.onclick=()=>{ if(a.onClick) a.onClick(); backdrop.style.display='none'; }; actionsEl.appendChild(btn); });
  backdrop.style.display='grid';
}
function spinnerHTML(){ return `<span class="spinner" aria-hidden="true"></span>`; }



document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  /* ===== BOOK ===== */
  if(page === 'book'){
    // Tabs
    const tabs = $$('.tab'); const panels = $$('.panel');
    tabs.forEach(t=> t.addEventListener('click', ()=>{
      tabs.forEach(x=>x.setAttribute('aria-selected','false'));
      t.setAttribute('aria-selected','true');
      panels.forEach(p=> p.hidden = p.id !== t.dataset.for);
      $('#'+t.dataset.for).animate([{opacity:.6},{opacity:1}], {duration:200});
    }));

    const searchBtn = $('#searchBtn'), clearBtn = $('#clearBtn'), results = $('#results');
    const sortChips = $$('.chip[data-sort]');
    let flights = []; let currentSort = null;

    clearBtn.addEventListener('click', ()=>{
      $('#from').value=''; $('#to').value=''; $('#depart').value=''; $('#return').value='';
      $('#pax').value='1'; $('#cabin').value='Economy'; $('#nonstop').checked=false; results.innerHTML=''; toast('Cleared form');
    });

    function renderResults(){
      let arr = [...flights];
      if(currentSort){ const k=currentSort; arr.sort((a,b)=> (a[k]||0) - (b[k]||0)); }
      results.innerHTML = arr.map(f => `
        <div class="result-row" data-id="${f.id}" role="group" aria-label="Flight ${f.number}">
          <div>
            <div><strong>${f.origin} → ${f.destination}</strong> <span class="badge">${f.stops===0?'Non-stop': f.stops+' stop'}</span></div>
            <div class="result-meta">${f.number} • ${f.depart} → ${f.arrive} • ${f.duration}m</div>
          </div>
          <div>${f.aircraft}</div>
          <div>${f.cabin}</div>
          <div>$${f.price}</div>
          <div style="display:flex; gap:8px; justify-content:flex-end">
            <button class="btn inline details">View Details</button>
            <button class="btn inline select">Select Flight</button>
          </div>
        </div>
      `).join('') || `<p class="helper">No flights found. Try searching.</p>`;

      $$('.result-row .select').forEach(btn=> btn.addEventListener('click', (e)=>{
        const id = e.currentTarget.closest('.result-row').dataset.id;
        const f = flights.find(x=>x.id===id);
        modal('Confirm booking', `<p>Confirm booking for <strong>${f.number}</strong> - $${f.price}?</p>`, [
          {label:'Cancel', variant:'ghost'},
          {label:'Confirm', onClick: ()=> toast('Booked • PNR ABC123')}
        ]);
      }));

      $$('.result-row .details').forEach(btn=> btn.addEventListener('click', (e)=>{
        const id = e.currentTarget.closest('.result-row').dataset.id;
        const f = flights.find(x=>x.id===id);
        modal('Flight details', `<ul style="margin:0; padding-left:18px">
          <li>Aircraft: ${f.aircraft}</li>
          <li>Meal: Standard</li>
          <li>Baggage: 1x 23kg checked + 7kg cabin</li>
          <li>Onboard Wi-Fi: Available</li>
        </ul>`);
      }));
    }

    function doSearch(){
      const o = $('#from').value.trim().toUpperCase() || 'SYD';
      const d = $('#to').value.trim().toUpperCase() || 'DXB';

      // Stable mock data with departNum so sorting works
      flights = [
        {id:'1', origin:o, destination:d, number:'AP101', depart:'08:30', arrive:'17:45', duration: 555, price: 980, stops: 1, cabin:'Economy', aircraft:'B777-300ER'},
        {id:'2', origin:o, destination:d, number:'AP202', depart:'09:15', arrive:'15:00', duration: 345, price: 420, stops: 0, cabin:'Economy', aircraft:'A350-900'},
        {id:'3', origin:o, destination:d, number:'AP204', depart:'21:10', arrive:'06:20', duration: 790, price: 920, stops: 1, cabin:'Economy', aircraft:'A380-800'}
      ].map(f => ({...f, departNum: parseInt(f.depart.replace(':',''),10)}));

      renderResults();
      document.getElementById('results').scrollIntoView({behavior:'smooth'});
    }

    $('#searchBtn').addEventListener('click', doSearch);

    // Sort chips (price, duration, departNum)
    sortChips.forEach(ch=> ch.addEventListener('click', ()=>{
      sortChips.forEach(c=>c.classList.remove('active'));
      ch.classList.add('active');
      currentSort=ch.dataset.sort; renderResults();
    }));

    // Default prefill so sorting works immediately
    $('#from').value='SYD'; $('#to').value='DXB'; doSearch();
  }

  /* ===== MANAGE ===== */
  if(page === 'manage'){
    const seatWrap = $('#seatWrap'); const summary = $('#summary');
    const ancList = $('#ancList'); const entList = $('#entList');
    let selectedSeat = null;

    function buildSeatmap(){
      const letters = ['A','B','C','D','E','F']; let html = '<div class="seatmap" role="grid">';
      for(let r=1; r<=8; r++){
        for(let c=0;c<6;c++){
          const code = `${r}${letters[c]}`;
          const taken = Math.random() < 0.22;
          html += `<div class="seat ${taken?'taken':''} ${selectedSeat===code?'selected':''}" data-code="${code}" role="gridcell" tabindex="0">${code}</div>`;
        }
      }
      html += `</div>
      <div class="row" style="margin-top:10px">
        <button id="seatPayBtn" class="btn" ${selectedSeat?'':'disabled'}>Proceed to Payment</button>
      </div>`;
      seatWrap.innerHTML = html;

      $$('.seat', seatWrap).forEach(s => s.addEventListener('click', e=>{
        if(e.currentTarget.classList.contains('taken')) return;
        selectedSeat = e.currentTarget.dataset.code;
        $$('.seat', seatWrap).forEach(k=>k.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        $('#seatPayBtn').disabled = false;
        updateSummary();
      }));
      $('#seatPayBtn').addEventListener('click', ()=> modal('Payment', `<p>Payment successful. Receipt #R00012345</p>`, [{label:'Done'}]));
    }

    function updateSummary(){
      summary.innerHTML = `<div class="card"><h3 class="section-title" style="margin-top:0">Trip summary</h3>
        <p>PNR: <strong>ABC123</strong></p>
        <p>Selected Seat: <strong>${selectedSeat || '—'}</strong></p>
        <p>Meals: <strong>—</strong></p>
        <p>Bags: <strong>—</strong></p>
        <p>Entertainment: <strong>—</strong></p>
        <hr style="border-color:var(--line)">
        <p>Base fare: $500</p>
        <p>Fees: $0</p>
        <p>Entertainment: $0</p>
        <h3>Total: $500</h3></div>`;
    }

    buildSeatmap(); updateSummary();

    // Meals & Add-ons (separate card)
    ancList.innerHTML = `
      <div class="item"><div><strong>Extra Bag (10kg)</strong><div class="helper">Add one extra checked bag</div></div><div>$40 <button class="btn inline">Add</button></div></div>
      <div class="item"><div><strong>Vegan Meal</strong><div class="helper">Plant-based inflight option</div></div><div>$0 <button class="btn inline">Add</button></div></div>
      <div class="item"><div><strong>Vegetarian Meal</strong><div class="helper">Vegetarian special</div></div><div>$0 <button class="btn inline">Add</button></div></div>
      <div class="item"><div><strong>Gluten-free Meal</strong><div class="helper">Allergen-friendly</div></div><div>$0 <button class="btn inline">Add</button></div></div>
    `;

    // Entertainment (separate card)
    entList.innerHTML = `
      <div class="item"><div><strong>Blockbuster Movie</strong><div class="helper">HD streaming</div></div><div>$8 <button class="btn inline">Add</button></div></div>
      <div class="item"><div><strong>Jazz Playlist</strong><div class="helper">Relaxing tunes</div></div><div>$4 <button class="btn inline">Add</button></div></div>
      <div class="item"><div><strong>Kids Cartoons Pack</strong><div class="helper">Fun shows</div></div><div>$6 <button class="btn inline">Add</button></div></div>
    `;
  }

  /* ===== SUPPORT ===== */
  if(page === 'support'){
    // Dropdown navigation
    $('#quickGo').addEventListener('click', ()=>{
      const v = $('#quickNav').value;
      if(v) location.href = v;
    });
    $('#sendBtn').addEventListener('click', ()=>{
      const email=$('#email').value.trim(), s=$('#subject').value.trim(), m=$('#message').value.trim();
      if(!email||!s||!m) return toast('Fill all fields');
      toast('Message sent. We will get back soon.');
    });
  }
});



/* Account dropdown behavior */
(function(){
  const account = document.querySelector('.account');
  if(!account) return;
  const btn = account.querySelector('.account-btn');
  const dd = account.querySelector('.dropdown');
  const setOpen = (open)=>{ btn.setAttribute('aria-expanded', String(open)); dd.hidden = !open; };
  btn.addEventListener('click', (e)=>{ e.preventDefault(); setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('click', (e)=>{ if(!account.contains(e.target)) setOpen(false); });
})();



/* Account popup forms for Login and Register */
(function(){
  const account = document.querySelector('.account');
  if(!account) return;
  const loginLink = account.querySelector('.dropdown a[href="login.html"]');
  const regLink = account.querySelector('.dropdown a[href="register.html"]');

  const buildLogin = () => `
    <div class="auth-wrap">
      <div class="auth-subtitle">Sign in to manage bookings and check-in</div>
      <form id="loginForm" class="auth-form" onsubmit="return false;">
        <label>Email<input class="input" type="email" placeholder="you@example.com" required></label>
        <label>Password<input class="input" type="password" placeholder="••••••••" required></label>
        <label class="checkbox"><input type="checkbox"> Remember me</label>
      </form>
    </div>`;

  const buildRegister = () => `
    <div class="auth-wrap">
      <div class="auth-subtitle">Create an account to book, check-in, and manage trips</div>
      <form id="regForm" class="auth-form" onsubmit="return false;">
        <div class="auth-row">
          <label>First name<input class="input" placeholder="John" required></label>
          <label>Last name<input class="input" placeholder="Doe" required></label>
        </div>
        <label>Email<input class="input" type="email" placeholder="you@example.com" required></label>
        <label>Password<input class="input" type="password" placeholder="••••••••" required></label>
        <label class="checkbox"><input type="checkbox" required> I agree to the Terms</label>
      </form>
    </div>`;

  const focusFirst = (sel) => { setTimeout(()=>{ const el=document.querySelector(sel); if(el) el.focus(); }, 0); };

  if(loginLink){
    loginLink.addEventListener('click', (e)=>{
      e.preventDefault();
      modal('Login', buildLogin(), [
        {label:'Cancel'},
        {label:'Login', primary:true, onClick:()=>{ toast('Logged in (demo)'); }}
      ]);
      focusFirst('#loginForm input[type="email"]');
    });
  }
  if(regLink){
    regLink.addEventListener('click', (e)=>{
      e.preventDefault();
      modal('Register', buildRegister(), [
        {label:'Cancel'},
        {label:'Create account', primary:true, onClick:()=>{ toast('Account created (demo)'); }}
      ]);
      focusFirst('#regForm input');
    });
  }
})();
