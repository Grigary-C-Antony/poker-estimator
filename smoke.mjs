const BASE = 'http://localhost:3002';
const r = (url, opts) => fetch(url, opts).then(r => r.json());
let pass = 0, fail = 0;
const ok = (label, cond) => { if(cond){console.log('  PASS', label);pass++;}else{console.log('  FAIL', label);fail++;} };

// 1 Create
console.log('1. Create room');
const c = await r(BASE+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomName:'Smoke',moderatorId:'mod1',moderatorName:'Alice'})});
const id = c.room?.id;
ok('create room', id && c.room.phase==='voting');

// 2 Get
console.log('2. Get room');
const g = await r(BASE+'/api/rooms/'+id);
ok('get room', g.room?.id===id);

// 3 Join player
console.log('3. Join player');
const j = await r(BASE+'/api/rooms/'+id+'/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'p2',playerName:'Bob',isSpectator:false})});
ok('join room', j.room?.players.length===2);

// 4 Join spectator
console.log('4. Join spectator');
const js = await r(BASE+'/api/rooms/'+id+'/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'p3',playerName:'Carol',isSpectator:true})});
ok('join spectator', js.room?.players.find(p=>p.id==='p3')?.isSpectator===true);

// 5 Vote
console.log('5. Vote');
const v1 = await r(BASE+'/api/rooms/'+id+'/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1',vote:'5'})});
const v2 = await r(BASE+'/api/rooms/'+id+'/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'p2',vote:'8'})});
ok('vote', v1.ok && v2.ok);

// 6 Invalid vote
console.log('6. Invalid vote');
const vi = await r(BASE+'/api/rooms/'+id+'/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1',vote:'999'})});
ok('reject invalid vote', !!vi.error);

// 7 Story
console.log('7. Set story');
const st = await r(BASE+'/api/rooms/'+id+'/story',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1',story:'JIRA-42'})});
ok('set story', st.ok);

// 8 Timer start/cancel
console.log('8. Timer');
const t = await r(BASE+'/api/rooms/'+id+'/timer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1',duration:60})});
ok('start timer', t.ok);
const tc = await r(BASE+'/api/rooms/'+id+'/timer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1',duration:0})});
ok('cancel timer', tc.ok);

// 9 Reveal
console.log('9. Reveal');
const rv = await r(BASE+'/api/rooms/'+id+'/reveal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1'})});
ok('reveal votes', rv.room?.phase==='revealed' && rv.room.votes['mod1']==='5');

// 10 Auth guard
console.log('10. Auth guard - non-mod blocked');
const ag = await r(BASE+'/api/rooms/'+id+'/revote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'p2'})});
ok('non-mod revote blocked', !!ag.error);

// 11 Revote
console.log('11. Revote');
const rvo = await r(BASE+'/api/rooms/'+id+'/revote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1'})});
ok('revote', rvo.ok);

// 12 Reset
console.log('12. Reset');
await r(BASE+'/api/rooms/'+id+'/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1',vote:'3'})});
await r(BASE+'/api/rooms/'+id+'/reveal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1'})});
const rst = await r(BASE+'/api/rooms/'+id+'/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1',nextStory:'JIRA-43'})});
ok('reset archives story', rst.room?.storyCount===1 && rst.room.timerEndsAt===null && rst.room.currentStory==='JIRA-43');

// 13 Kick
console.log('13. Kick');
await r(BASE+'/api/rooms/'+id+'/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'p2',playerName:'Bob',isSpectator:false})});
const k = await r(BASE+'/api/rooms/'+id+'/kick',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moderatorId:'mod1',targetId:'p2'})});
ok('kick player', k.ok);
const afterKick = await r(BASE+'/api/rooms/'+id);
ok('player removed after kick', !afterKick.room?.players.find(p=>p.id==='p2'));

// 14 Leave
console.log('14. Leave');
const l = await r(BASE+'/api/rooms/'+id+'/leave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId:'mod1'})});
ok('leave', l.ok);

// 15 404
console.log('15. 404 room');
const nf = await r(BASE+'/api/rooms/ZZZZZZ');
ok('404 returns error', !!nf.error);

console.log('');
console.log(`Results: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
