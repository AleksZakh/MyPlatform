import { ref, watch, type Ref } from 'vue';
export interface AccountLifecycle {
 user:{id:number;name:string;status:string;deletedAt:string|null;revision:string;canRestore:boolean};
 impact:{projects:{id:number;name:string}[];tasks:number;privateFiles:number;messages:number};capabilities:{update:boolean;delete:boolean};
}
export function useAccountLifecycle(id:Ref<number>,updated:()=>void){
 const data=ref<AccountLifecycle|null>(null),busy=ref(false),error=ref(''),notice=ref(''),forbidden=ref(false);
 const action=ref(''),reason=ref(''),confirmation=ref(''),reviewed=ref(false);let sequence=0;
 const message=(e:any)=>e?.data?.data?.message||e?.data?.message||'Не удалось выполнить действие. Обновите сведения и повторите.';
 async function load(){const seq=++sequence;busy.value=true;error.value='';forbidden.value=false;data.value=null;
  try{const value=await $fetch<AccountLifecycle>(`/api/admin/users/${id.value}/lifecycle`);if(seq===sequence)data.value=value;}
  catch(e:any){if(seq===sequence){forbidden.value=e?.statusCode===403||e?.response?.status===403;if(!forbidden.value)error.value=message(e);}}
  finally{if(seq===sequence)busy.value=false;}
 }
 async function choose(value:string){action.value='';await load();if(!data.value||data.value.user.deletedAt)return;reason.value='';confirmation.value='';reviewed.value=false;action.value=value;}
 async function submit(){if(!data.value||busy.value)return;busy.value=true;error.value='';notice.value='';
  try{const result=await $fetch<{realtimeDisconnected:boolean}>(`/api/admin/users/${id.value}/lifecycle`,{method:'POST',headers:{'x-space-access-change':'1'},body:{action:action.value,reason:reason.value,confirmation:confirmation.value,reviewed:reviewed.value,revision:data.value.user.revision}});
   action.value='';notice.value=result.realtimeDisconnected?'Изменения сохранены. Прежние сессии отозваны.':'Изменения сохранены. HTTP-доступ отозван. WebSocket не ответил: прежнее соединение закроется по истечении билета, максимум через 145 секунд.';await load();updated();
  }catch(e){error.value=message(e);}finally{busy.value=false;}
 }
 watch(id,()=>{action.value='';notice.value='';void load();},{immediate:true});
 return {data,busy,error,notice,forbidden,action,reason,confirmation,reviewed,load,choose,submit};
}
