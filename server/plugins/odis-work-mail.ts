import {defineNitroPlugin} from 'nitropack/runtime';
import {processWorkMail} from '../services/diagnostic/assignment-mail';
export default defineNitroPlugin(app=>{
  let busy=false,nextScan=0;
  async function tick(){
    if(busy)return;busy=true;
    try{const scan=Date.now()>=nextScan;await processWorkMail(scan);if(scan)nextScan=Date.now()+600000;}
    catch{console.error('[ОДИС] Не удалось обработать почту по работам. Проверьте миграцию и подключение к БД.');}
    finally{busy=false;}
  }
  const timer=setInterval(tick,30000);timer.unref();app.hooks.hook('close',()=>clearInterval(timer));
});
