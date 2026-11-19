import {runReports} from '../services/upts-reports';
export default defineNitroPlugin(nitro=>{let busy=false;const run=async()=>{if(busy)return;busy=true;try{await runReports();}catch(e){console.warn('[upts-reports]',String(e));}finally{busy=false;}};const timer=setInterval(run,3000);timer.unref();nitro.hooks.hook('close',()=>clearInterval(timer));});
