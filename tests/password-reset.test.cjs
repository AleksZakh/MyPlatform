const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const token = 'a'.repeat(64);
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name in mocks ? mocks[name] : require(name), console: { error() {} }, ...globals });
  return exports;
}
function fixture(options = {}) {
  let user = { id: 1, email: 'user@example.org', authType: 'EXTERNAL', status: 'ACTIVE', passwordHash: 'old',
    passwordResetTokenHash: hash(token), passwordResetExpiresAt: new Date(Date.now() + 60000), passwordResetRequestedAt: null, externalSessionVersion: 0, ...options.user };
  let audits = [], sent = [], queue = Promise.resolve();
  let limits = new Map();
  function matches(where) {
    if (!user) return false;
    for (const key of ['id','email','authType','status','passwordResetTokenHash']) if (where[key] !== undefined && where[key] !== user[key]) return false;
    if (where.passwordResetExpiresAt && !(user.passwordResetExpiresAt > where.passwordResetExpiresAt.gt)) return false;
    if (where.OR && user.passwordResetRequestedAt && user.passwordResetRequestedAt >= where.OR[1].passwordResetRequestedAt.lt) return false;
    return true;
  }
  const delegate = {
    findUnique: async ({ where }) => options.missing || !matches(where) ? null : structuredClone(user),
    updateMany: async ({ where, data }) => {
      if (!matches(where)) return { count: 0 };
      for (const [key,value] of Object.entries(data)) user[key] = key === 'externalSessionVersion' ? user[key] + value.increment : value;
      return { count: 1 };
    },
  };
  const db = { user: delegate,
    $queryRaw: async (strings, ...args) => { const key=args[0]; const n=(limits.get(key)||0)+1; limits.set(key,n);return [{count:n}]; },
    $executeRaw: async () => 0,
    $transaction: fn => {
      const task=queue.then(async()=>{const before=structuredClone(user), prior=audits.slice();try{return await fn({user:delegate})}catch(e){user=before;audits=prior;throw e}});
      queue=task.catch(()=>{});return task;
    },
  };
  const api=load('server/services/password-reset.service.ts',{
    h3:{createError: p=>Object.assign(new Error(p.message),p)},
    '~~/server/utils/prisma':{prisma:db},
    '~~/server/utils/password':{hashSpacePassword:async p=>'hash:'+p},
    '~~/server/utils/password-reset-mail':{sendPasswordResetEmail:async (email, token)=>{if(options.mailFailure)throw Error('SMTP');sent.push({email,token})}},
    '~~/server/utils/auditLog':{writeAuditEvent:async p=>{if(options.auditFailure)throw Error('audit');audits.push(p)}},
  });
  return { api, user:()=>user, audits:()=>audits, sent, reset:()=>api.completePasswordReset({}, { token, password:'new-password-123' }) };
}
test('valid reset consumes token, updates password/version, writes audit without secrets', async()=>{
 const f=fixture();await f.reset();assert.equal(f.user().passwordResetTokenHash,null);assert.equal(f.user().externalSessionVersion,1);assert.equal(f.user().passwordHash,'hash:new-password-123');
 assert.equal(f.audits()[0].action,'PASSWORD_RESET');assert.ok(!JSON.stringify(f.audits()).includes(token));assert.ok(!JSON.stringify(f.audits()).includes('new-password-123'));
});
test('link cannot be reused',async()=>{const f=fixture();await f.reset();await assert.rejects(f.reset(),{statusCode:400});assert.equal(f.audits().length,1)});
test('concurrent use changes password only once',async()=>{const f=fixture();const r=await Promise.allSettled([f.reset(),f.reset()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(f.user().externalSessionVersion,1)});
for(const [name,user] of [['expired',{passwordResetExpiresAt:new Date(0)}],['domain',{authType:'DOMAIN'}],['blocked',{status:'BLOCKED'}]]){
 test(name+' link rejected',async()=>{const f=fixture({user});await assert.rejects(f.reset(),{statusCode:400});assert.equal(f.user().passwordHash,'old')});
}
test('audit failure rolls back password/token/version',async()=>{const f=fixture({auditFailure:true});await assert.rejects(f.reset());assert.equal(f.user().passwordHash,'old');assert.equal(f.user().passwordResetTokenHash,hash(token));assert.equal(f.user().externalSessionVersion,0)});
test('request sends raw token only in email, keeps hash in DB',async()=>{const f=fixture();await f.api.requestPasswordReset({},'USER@example.org');assert.equal(f.sent.length,1);assert.equal(f.user().passwordResetTokenHash,hash(f.sent[0].token));assert.equal(f.user().passwordHash,'old')});
test('unknown/domain/blocked email receives same generic reply without mail',async()=>{for(const options of [{missing:true},{user:{authType:'DOMAIN'}},{user:{status:'BLOCKED'}}]){const f=fixture(options);const r=await f.api.requestPasswordReset({},'user@example.org');assert.equal(r.message,f.api.RESET_REPLY);assert.equal(f.sent.length,0)}});
test('request cooldown avoids repeated mail',async()=>{const f=fixture();await f.api.requestPasswordReset({},'user@example.org');await f.api.requestPasswordReset({},'user@example.org');assert.equal(f.sent.length,1)});
test('SMTP failure invalidates issued token, preserves old password',async()=>{const f=fixture({mailFailure:true});await f.api.requestPasswordReset({},'user@example.org');assert.equal(f.user().passwordResetTokenHash,null);assert.equal(f.user().passwordHash,'old');assert.ok(f.audits().some(x=>x.action==='RESET_MAIL'&&x.result==='FAILED'))});
test('invalid password/token fail before reset',async()=>{const f=fixture();for(const body of [{token:'bad',password:'long-password'},{token,password:'short'}])await assert.rejects(f.api.completePasswordReset({},body),{statusCode:400})});
for(const [name,dbVersion,cookieVersion,expected] of [['old cookie before reset',0,undefined,false],['old cookie after reset',1,undefined,true],['revoked cookie',2,1,true],['current cookie',2,2,false]]){
 test('session: '+name,async()=>{let cleared=false;const event={context:{}};const api=load('server/utils/external-session.ts',{'~~/server/utils/prisma':{prisma:{user:{findUnique:async()=>({authType:'EXTERNAL',status:'ACTIVE',externalSessionVersion:dbVersion})}}}}, {getUserSession:async()=>({user:{id:1,authType:'EXTERNAL',externalSessionVersion:cookieVersion}}),clearUserSession:async()=>{cleared=true}});await api.checkExternalSession(event);assert.equal(cleared,expected)});
}
