import {deliverUptsNotifications} from '../services/upts-notifications';
export default defineNitroPlugin(nitro=>{
 let busy=false;
 const run=async()=>{if(busy)return;busy=true;try{await deliverUptsNotifications();}catch{console.warn('[upts] notification worker failed; retry scheduled');}finally{busy=false;}};
 const timer=setInterval(run,30000);timer.unref();
 nitro.hooks.hook('close',()=>clearInterval(timer));
});
