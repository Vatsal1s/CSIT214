const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

/* In-memory data */
const flights = [];
const bookings = new Map();
function seedFlights(){
  const samples = [
    {origin:'SYD', destination:'DXB', number:'AP101', depart:'08:30', arrive:'17:45', duration: 855, price: 980, stops: 1, cabin:'Economy', aircraft:'B777-300ER'},
    {origin:'SYD', destination:'SIN', number:'AP202', depart:'09:15', arrive:'15:00', duration: 345, price: 420, stops: 0, cabin:'Economy', aircraft:'A350-900'},
    {origin:'MEL', destination:'DXB', number:'AP204', depart:'21:10', arrive:'06:20', duration: 790, price: 920, stops: 1, cabin:'Economy', aircraft:'A380-800'}
  ];
  let id=1;
  samples.forEach(s=>{
    for(let i=0;i<3;i++){
      const p = {...s};
      p.id = String(id++);
      p.price = Math.max(200, Math.round(p.price*(0.85 + Math.random()*0.4)));
      p.duration = Math.max(60, Math.round(p.duration*(0.9 + Math.random()*0.2)));
      const hh = String(Math.floor(Math.random()*24)).padStart(2,'0');
      const mm = String(Math.floor(Math.random()*60)).padStart(2,'0');
      p.depart = `${hh}:${mm}`;
      p.arrive = `${String((parseInt(hh)+Math.floor(p.duration/60))%24).padStart(2,'0')}:${String((parseInt(mm)+p.duration%60)%60).padStart(2,'0')}`;
      flights.push(p);
    }
  });
}
seedFlights();
function genPNR(){ const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let p=''; for(let i=0;i<6;i++) p += chars[Math.floor(Math.random()*chars.length)]; return p; }

/* API endpoints */
app.get('/api/search', (req,res)=>{
  const {origin='', destination='', nonstop='0'} = req.query;
  const o = origin.toUpperCase().trim(); const d = destination.toUpperCase().trim();
  let out = flights.filter(f => (!o || f.origin===o) && (!d || f.destination===d));
  if(nonstop==='1') out = out.filter(f=> f.stops===0);
  out = out.map(f => ({...f, departNum: parseInt(f.depart.replace(':',''))}));
  res.json(out);
});
app.post('/api/book', (req,res)=>{
  const {flightId, lastName='Guest'} = req.body || {};
  const flight = flights.find(f=> f.id===String(flightId));
  if(!flight) return res.status(400).json({error:'Invalid flight'});
  const pnr = genPNR();
  const booking = {pnr, lastName, flight, seat:null, bags:0, meal:null, price: flight.price, ent:[]};
  bookings.set(pnr, booking);
  res.json({pnr, booking});
});
app.get('/api/pnr/:pnr', (req,res)=>{
  const b = bookings.get(req.params.pnr.toUpperCase());
  if(!b) return res.status(404).json({error:'Not found'});
  res.json(b);
});
app.get('/api/seatmap', (req,res)=>{
  const rows = 8, cols = 6;
  const seats = []; const letters = 'ABCDEF'.split('');
  for(let r=1;r<=rows;r++){ for(let c=0;c<cols;c++){ const code = `${r}${letters[c]}`; const taken = Math.random() < .22; seats.push({code, taken}); } }
  res.json({seats});
});
app.post('/api/seat', (req,res)=>{
  const {pnr, seat} = req.body || {};
  const b = bookings.get((pnr||'').toUpperCase());
  if(!b) return res.status(404).json({error:'PNR not found'});
  b.seat = seat; res.json({ok:true, seat});
});
app.get('/api/ancillaries', (req,res)=>{ res.json({meals:['Vegan','Vegetarian','Gluten-free'], bags:[10,20]}); });
app.post('/api/ancillaries', (req,res)=>{
  const {pnr, type, value} = req.body || {};
  const b = bookings.get((pnr||'').toUpperCase());
  if(!b) return res.status(404).json({error:'PNR not found'});
  if(type==='bag') b.bags = (b.bags||0) + 1;
  if(type==='meal') b.meal = value || 'Standard';
  res.json({ok:true, booking:b});
});
app.post('/api/entertainment', (req,res)=>{
  const {pnr, itemId} = req.body || {};
  const b = bookings.get((pnr||'').toUpperCase());
  if(!b) return res.status(404).json({error:'PNR not found'});
  const prices = {E1:8, E2:4, E3:6};
  b.ent.push({id:itemId, price: prices[itemId] || 0});
  res.json({ok:true, booking:b});
});
app.post('/api/pay', (req,res)=>{
  const {pnr} = req.body || {};
  const b = bookings.get((pnr||'').toUpperCase());
  if(!b) return res.status(404).json({error:'PNR not found'});
  const receipt = 'R' + Math.floor(Math.random()*1e8).toString().padStart(8,'0');
  res.json({ok:true, receipt});
});
app.get('/', (req,res)=> res.sendFile(path.join(__dirname, '..', 'public', 'book.html')));

app.listen(PORT, ()=> console.log(`Airline Pro v3.1 running at http://localhost:${PORT}`));