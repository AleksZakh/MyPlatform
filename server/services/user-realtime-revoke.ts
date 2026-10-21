import { secret } from '../realtime/token';
import { signNotification } from '../realtime/notification';
export async function disconnectAccount(userId:string){
 try{
  const body=JSON.stringify({userId});const timestamp=String(Date.now());
  const response=await fetch(`http://127.0.0.1:${Number(process.env.WS_PORT||5050)}/internal/revoke`,{method:'POST',headers:{'content-type':'application/json','x-space-time':timestamp,'x-space-signature':signNotification(body,secret(),timestamp)},body,signal:AbortSignal.timeout(1500)});
  return response.ok;
 }catch{return false;}
}
