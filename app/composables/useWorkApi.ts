export function useWorkApi() {
 const error=ref('');const saving=ref(false);
 async function send<T>(url:string,method:'POST'|'PUT'|'PATCH'|'DELETE',body:unknown):Promise<T|null>{
  if(saving.value)return null;saving.value=true;error.value='';
  try{return await $fetch<T>(url,{method,body:body as Record<string,unknown>,headers:{'x-space-work':'1'},retry:0});}
  catch(e:any){error.value=e.data?.message||e.data?.data?.message||'Не удалось сохранить. Проверьте соединение и повторите.';return null;}
  finally{saving.value=false;}
 }
 return {error,saving,send};
}
