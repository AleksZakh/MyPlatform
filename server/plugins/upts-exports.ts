import {runUptsExports} from '../services/upts-export';
export default defineNitroPlugin(nitro=>{
 let busy=false;const run=async()=>{if(busy)return;busy=true;try{await runUptsExports();}catch(e){console.warn('[upts-export]',String(e));}finally{busy=false;}};
 const timer=setInterval(run,3000);timer.unref();nitro.hooks.hook('close',()=>clearInterval(timer));
});
