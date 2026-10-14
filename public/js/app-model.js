////////////////////////////////////////////////////////////////
//APP-MODEL.JS  ("MODEL")
//CONFIG, SEED DATA, STATE, AND THE api OBJECT. EVERY SERVER CALL
//GOES THROUGH api. gyms/posts/passes/contact ARE MOCKED: REPLACE
//EACH BODY WITH fetch() TO A NEW ROUTE IN server.js.
//LOGIN/CREATE-ACCOUNT USE THE REAL ROUTES (see logon.js).
//getUsers() CALLS THE JWT-PROTECTED /api/users ROUTE.
////////////////////////////////////////////////////////////////


/* ============ 1. CONFIG: edit here to customise the app ============ */
const CONFIG = {
  appName: 'DropSet',
  tagline: 'Train anywhere. No contract.',
  currency: '$',
  platformFeePct: 0.10,
  styles: [
    { id: 'powerlifting', label: 'Powerlifting', color: '#C62E3E' },
    { id: 'crossfit',     label: 'CrossFit',     color: '#2F6FED' },
    { id: 'general',      label: 'General fitness', color: '#1E8E5A' },
    { id: 'bodybuilding', label: 'Bodybuilding', color: '#D9A400' },
    { id: 'olympic',      label: 'Olympic lifting', color: '#E8742B' }
  ],
  passTypes: [
    { id: 'day',   label: 'Day pass',   days: 1 },
    { id: 'week',  label: 'Week pass',  days: 7 },
    { id: 'month', label: 'Month pass', days: 30 }
  ],
  tabs: [ ['home','Home','M3 11l9-8 9 8v10H3z'], ['explore','Explore','M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5'], ['social','Social','M16 11a3 3 0 100-6 3 3 0 000 6zM8 12a3 3 0 100-6 3 3 0 000 6zM2 20a6 6 0 0112 0M14 20a6 6 0 018 0'], ['passes','Passes','M3 7h18v4a2 2 0 000 4v4H3v-4a2 2 0 000-4z'], ['profile','Profile','M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0'] ]
};

/* ============ 2. API LAYER: replace each body with fetch() to your backend ============ */
const SEED = [
 g(1,'Iron Yard Barbell','Austin, TX',['powerlifting','general'],[15,60,150],4.8,'5am–11pm',['Competition racks','Deadlift platforms','Calibrated plates'],['Showers','Chalk allowed','Lockers'],'Chalk-friendly barbell gym with six platforms and no mirrors.'),
 g(2,'Mile High CrossFit','Denver, CO',['crossfit'],[25,90,220],4.7,'6am–9pm',['Rigs','Rowers','Assault bikes'],['Showers','Coached classes'],'Affiliate box that welcomes drop-ins at every class.'),
 g(3,'Lakefront Athletic Club','Chicago, IL',['general','bodybuilding'],[20,70,170],4.5,'24 hours',['Cable stations','Dumbbells to 150 lb','Cardio floor'],['Sauna','Towels','Lockers'],'Full-service floor with a quiet free-weight room.'),
 g(4,'Palm Strength Lab','Miami, FL',['bodybuilding','general'],[18,65,160],4.6,'5am–10pm',['Plate-loaded machines','Smith machines','Hack squat'],['Showers','Smoothie bar'],'Machine-heavy hypertrophy gym near the beach.'),
 g(5,'Harbor Weightlifting','Seattle, WA',['olympic','powerlifting'],[22,80,190],4.9,'6am–8pm',['Bumper plates','Lifting platforms','Squat racks'],['Coaching available','Chalk allowed'],'Olympic lifting club with coaches on the floor each evening.'),
 g(6,'Desert Forge Gym','Phoenix, AZ',['general','crossfit'],[12,45,110],4.3,'24 hours',['Turf lane','Sleds','Free weights'],['Showers','Open 24/7'],'Budget-friendly gym with a turf lane and sleds.'),
 g(7,'Capitol Barbell Club','Austin, TX',['olympic','crossfit'],[20,75,180],4.6,'5am–9pm',['Platforms','Rigs','Barbells'],['Showers','Lockers'],'Small independent gym that sells passes directly to visitors.')
];
function g(id,name,city,styles,p,rating,hours,equip,amenities,blurb){return{id,name,city,styles,prices:{day:p[0],week:p[1],month:p[2]},rating,hours,equip,amenities,blurb}}
const wait = ms => new Promise(r => setTimeout(r, ms));
const api = {
  async searchGyms({q='',style='all',maxDay=999,sort='rating'}){ await wait(200);
    q=q.trim().toLowerCase(); let r=SEED.filter(x=>(!q||(x.name+x.city).toLowerCase().includes(q))&&(style==='all'||x.styles.includes(style))&&x.prices.day<=maxDay);
    return r.sort((a,b)=>sort==='price'?a.prices.day-b.prices.day:b.rating-a.rating); },
  // REAL BACKEND: calls the JWT-protected /api/users route in server.js
  async getUsers(){ const r=await fetch('/api/users',{headers:{'Authorization':S.token,'Content-Type':'application/json'}}); if(r.status===401||r.status===403){ localStorage.removeItem('jwtToken'); location.href='/'; return []; } return r.ok?(await r.json()).emails:[]; },
  async getGym(id){ await wait(150); return SEED.find(x=>x.id==id); },
  async purchasePass(gymId,type){ await wait(700); const gym=SEED.find(x=>x.id==gymId);
    return {id:'p'+Date.now(),gymId,gymName:gym.name,type,price:gym.prices[type],status:'ready',boughtAt:Date.now(),expiresAt:null,code:'DS-'+Math.random().toString(36).slice(2,8).toUpperCase()}; },
  async getPosts(){ await wait(150); return S.posts; },
  async createPost(name,text,gymId){ await wait(200); S.posts.unshift({id:Date.now(),name,text,gymId:gymId||null,likes:0,liked:false,ago:'now'}); },
  async toggleLike(id){ const p=S.posts.find(x=>x.id===id); p.liked=!p.liked; p.likes+=p.liked?1:-1; },
  async sendContact(f){ await wait(500); if(!f.email||!f.message.trim()) throw Error('Add your email and a message.'); return true; },
  async activatePass(p){ await wait(300); const d=CONFIG.passTypes.find(t=>t.id===p.type).days; return {...p,status:'active',expiresAt:Date.now()+d*864e5}; }
};

/* ============ 3. STATE ============ */
const S = { token:null, sent:false, cerr:'', cdraft:'', posts:[{id:1,name:'Maya R.',text:'Hit a 405 deadlift at Iron Yard today. Chalk everywhere, no regrets.',gymId:1,likes:12,liked:false,ago:'2h'},{id:2,name:'Devon K.',text:'Looking for a spotter this weekend. Drop-in class at Mile High was great.',gymId:2,likes:5,liked:false,ago:'5h'},{id:3,name:'Priya S.',text:'A week pass is worth it for Olympic lifting. The coaches answer questions on the floor.',gymId:5,likes:9,liked:false,ago:'1d'}], user:null, saved:new Set([1]), passes:[], q:'', style:'all', maxDay:999, sort:'rating', pay:null, toast:'', authMode:'login', err:'', busy:false };
