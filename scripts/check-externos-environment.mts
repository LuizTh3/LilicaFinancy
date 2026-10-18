// Read-only account preflight. No fixtures, profile writes, or Rules publication.
import { loadEnv } from 'vite'
import { initializeApp, deleteApp } from 'firebase/app'
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { initializeFirestore, memoryLocalCache, getDocFromServer, doc, terminate } from 'firebase/firestore'
import { externosEnvironment } from '../tests/integration/support/environment.ts'

const env=loadEnv('integration',process.cwd(),'')
try { externosEnvironment(env) } catch(error) {
 const roles=['A','B','ADMIN','PENDING']
 const duplicatedUidFields=roles.filter(role=>roles.some(other=>other!==role&&!!env[`TEST_USER_${role}_UID`]&&env[`TEST_USER_${role}_UID`]===env[`TEST_USER_${other}_UID`])).map(role=>`TEST_USER_${role}_UID`)
 console.log(JSON.stringify({ok:false,stage:'local',message:error instanceof Error?error.message:'INVALID_ENVIRONMENT',...(duplicatedUidFields.length?{duplicatedUidFields}:{})}))
 process.exit(1)
}
if(env.TEST_INTEGRATION_GROUP!=='externos') {
 console.log(JSON.stringify({ok:false,stage:'local',message:'TEST_INTEGRATION_GROUP deve ser externos'}));process.exit(1)
}
console.log(JSON.stringify({ok:true,stage:'local',projectMatches:true,distinctUsers:4,rulesConfirmed:env.TEST_RULES_CONFIRMED==='yes'}))
if(!process.argv.includes('--remote'))process.exit(0)
let failed=false
for(const role of ['A','B','ADMIN','PENDING']) {
 const app=initializeApp({projectId:env.VITE_FIREBASE_PROJECT_ID,apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,appId:env.VITE_FIREBASE_APP_ID},`read-only-${role}-${crypto.randomUUID()}`)
 const auth=initializeAuth(app,{persistence:inMemoryPersistence})
 const db=initializeFirestore(app,{localCache:memoryLocalCache()})
 let profileChecks:Record<string,boolean|string>|undefined
 const timer=setTimeout(()=>{console.log(JSON.stringify({ok:false,role,stage:'remote',message:'TIMEOUT'}));process.exit(1)},25000)
 try {
  const user=(await signInWithEmailAndPassword(auth,env[`TEST_USER_${role}_EMAIL`],env[`TEST_USER_${role}_PASSWORD`])).user
  if(user.uid!==env[`TEST_USER_${role}_UID`])throw Error('UID_MISMATCH')
  const profile=(await getDocFromServer(doc(db,'users',user.uid))).data()
  const token=await user.getIdTokenResult()
  const pending=role==='PENDING'
  profileChecks={exists:!!profile,schemaSupported:profile?.schemaVersion===1,timezoneSupported:profile?.timezone==='America/Rio_Branco',firstLogin:profile?.primeiro_login===true?'pending':profile?.primeiro_login===false?'completed':'missing',completionTimestamp:typeof profile?.passwordChangeCompletedAt?.toMillis==='function',loginAfterCompletion:typeof profile?.passwordChangeCompletedAt?.toMillis==='function'&&Number(token.claims.auth_time)*1000>profile.passwordChangeCompletedAt.toMillis()}
  const ready=profile?.schemaVersion===1&&profile?.timezone==='America/Rio_Branco'&&profile?.primeiro_login===false&&typeof profile?.passwordChangeCompletedAt?.toMillis==='function'&&Number(token.claims.auth_time)*1000>profile.passwordChangeCompletedAt.toMillis()
  if(pending?profile?.primeiro_login!==true:!ready)throw Error(pending?'PENDING_PROFILE_REQUIRED':'READY_PROFILE_REQUIRED')
  if(role==='ADMIN'&&(await getDocFromServer(doc(db,'admins',user.uid))).data()?.enabled!==true)throw Error('ADMIN_ROLE_REQUIRED')
  console.log(JSON.stringify({ok:true,role,stage:'remote',uidMatches:true,profile:pending?'pending':'ready',...(role==='ADMIN'?{adminEnabled:true}:{})}))
 }catch(error) {
  failed=true
  const code=(error as {code?:unknown})?.code
  const known=['UID_MISMATCH','PENDING_PROFILE_REQUIRED','READY_PROFILE_REQUIRED','ADMIN_ROLE_REQUIRED']
  const reason=typeof code==='string'&&/^(auth\/|permission-denied$|unavailable$|unauthenticated$)/.test(code)?code:error instanceof Error&&known.includes(error.message)?error.message:'REMOTE_CHECK_FAILED'
  console.log(JSON.stringify({ok:false,role,stage:'remote',message:reason,...(profileChecks?{profileChecks}:{})}))
 }finally {
  clearTimeout(timer);await signOut(auth).catch(()=>{});await terminate(db).catch(()=>{});await deleteApp(app).catch(()=>{})
 }
}
process.exitCode=failed?1:0
