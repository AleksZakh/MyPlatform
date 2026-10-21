import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import {WebSocket} from 'ws';
import {issue} from '../../dist-server/realtime/token.js';import {signNotification} from '../../dist-server/realtime/notification.js';
test('signed account revocation disconnects all tabs and rejects old tickets only',async()=>{
 const key='test-key-at-least-thirty-two-characters';const child=spawn(process.execPath,['dist-server/websocket.js'],{env:{...process.env,WS_PORT:'15053',WS_ALLOWED_ORIGINS:'https://space.test',WS_AUTH_SECRET:key},stdio:['ignore','pipe','pipe']});const sockets=[];
 const wait=(ws,type)=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('timeout '+type)),3000);ws.on('message',raw=>{const data=JSON.parse(raw);if(data.type===type){clearTimeout(timeout);resolve(data)}})});
 try{await Promise.race([once(child.stdout,'data'),new Promise((_,r)=>setTimeout(()=>r(Error('startup')),5000).unref())]);
  const open=async()=>{const ws=new WebSocket('ws://127.0.0.1:15053/ws',{origin:'https://space.test'});sockets.push(ws);await once(ws,'open');return ws};
  const user={id:'EXTERNAL:25',login:'external',name:'External'};const ticket=issue(user,key,Date.now()-1000);
  const a=await open(),b=await open(),other=await open();
  for(const ws of[a,b]){const ready=wait(ws,'authenticated');ws.send(JSON.stringify({type:'auth',ticket}));await ready;}
  const otherReady=wait(other,'authenticated');other.send(JSON.stringify({type:'auth',ticket:issue({...user,id:'EXTERNAL:26'},key)}));await otherReady;
  const body=JSON.stringify({userId:user.id});assert.equal((await fetch('http://127.0.0.1:15053/internal/revoke',{method:'POST',body})).status,403);
  const closedA=once(a,'close'),closedB=once(b,'close');const timestamp=String(Date.now());assert.equal((await fetch('http://127.0.0.1:15053/internal/revoke',{method:'POST',body,headers:{'x-space-time':timestamp,'x-space-signature':signNotification(body,key,timestamp)}})).status,204);
  assert.equal((await closedA)[0],4401);assert.equal((await closedB)[0],4401);assert.equal(other.readyState,WebSocket.OPEN);
  const replay=await open();const rejected=once(replay,'close');replay.send(JSON.stringify({type:'auth',ticket}));assert.equal((await rejected)[0],4401);
  const restored=await open();const accepted=wait(restored,'authenticated');restored.send(JSON.stringify({type:'auth',ticket:issue(user,key)}));await accepted;
 }finally{for(const ws of sockets)ws.terminate();child.kill('SIGTERM');await once(child,'exit');}
});
