<script setup lang="ts">
import { videoStatus, videoDuration, type LibraryVideo } from '~~/shared/types/library-video';
import type { LibraryCategory } from '~~/shared/types/library';
const props=defineProps<{category:number|null;query:string;trash:boolean;canManage:boolean;categories:LibraryCategory[]}>();
const emit=defineEmits<{changed:[]}>();
const rows=ref<LibraryVideo[]>([]),total=ref(0),page=ref(1),loading=ref(false),error=ref(''),busy=ref(false);
const editor=ref(false),selected=ref<LibraryVideo|null>(null),resume=ref(false),removing=ref<LibraryVideo|null>(null);
let searchTimer:ReturnType<typeof setTimeout>|undefined;
let seq=0, timer:ReturnType<typeof setInterval>|undefined;
async function load(silent=false){const n=++seq;if(!silent)loading.value=true;try{
 const r=await $fetch<{videos:LibraryVideo[];total:number}>('/api/library/videos',{query:{category:props.category||undefined,q:props.query,trash:props.trash?'1':undefined,page:page.value}});
 if(n===seq){rows.value=r.videos;total.value=r.total;error.value='';}
}catch(e:any){if(n===seq)error.value=e?.data?.message||e.message;}finally{if(n===seq)loading.value=false;}}
watch(()=>[props.category,props.trash],()=>{page.value=1;void load();});
watch(()=>props.query,()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page.value=1;void load();},400);});
onMounted(()=>{void load();timer=setInterval(()=>{if(!document.hidden && rows.value.some(v=>['QUEUED','PROCESSING'].includes(v.status))) void load(true);},10000);});
onBeforeUnmount(()=>{clearInterval(timer);clearTimeout(searchTimer);seq++;});
function edit(v:LibraryVideo|null,cont=false){selected.value=v;resume.value=cont;editor.value=true;}
async function changed(){await load();emit('changed');}
async function action(v:LibraryVideo,type:'trash'|'restore'|'retry'){busy.value=true;try{await $fetch(`/api/library/videos/${v.id}/state`,{method:'POST',headers:{'x-space-library':'1'},body:{action:type,version:v.version},retry:0});removing.value=null;await changed();}catch(e:any){error.value=e?.data?.message||e.message;}finally{busy.value=false;}}
</script>
<template>
<section class="library-video-panel" aria-label="Учебные видео">
<div class="library-toolbar"><h2>Видео · {{total}}</h2><button v-if="canManage&&!trash" @click="edit(null)">+ Добавить видео</button><NuxtLink v-if="canManage" to="/library/video-settings">Лимит загрузки</NuxtLink><button :disabled="loading" @click="load()">Обновить</button></div>
<p v-if="error" role="alert" class="library-error">{{error}}</p><p v-if="loading" role="status">Загрузка видео…</p><p v-else-if="!rows.length" class="library-empty">{{trash?'В корзине нет видео.':'Видео не найдены.'}}</p>
<div class="library-books">
<article v-for="v in rows" :key="v.id" class="library-card">
<NuxtLink v-if="v.status==='READY'" :to="`/library/videos/${v.id}`" class="library-cover video-cover" :aria-label="`Смотреть: ${v.title}`"><img v-if="v.hasPoster" :src="`/api/library/videos/${v.id}/poster`" :alt="v.title" loading="lazy" /><Icon name="lucide:play-circle" class="video-play" /><span class="video-duration">{{videoDuration(v.duration)}}</span></NuxtLink>
<div v-else class="library-cover video-cover video-placeholder"><Icon name="lucide:video" /><span>{{videoStatus[v.status]}}</span><small v-if="v.status==='UPLOADING'">{{Math.floor(v.offset/v.totalBytes*100)}}%</small></div>
<NuxtLink v-if="v.status==='READY'" :to="`/library/videos/${v.id}`" class="library-title">{{v.title}}</NuxtLink><h3 v-else class="library-title">{{v.title}}</h3><small>{{v.author||'Автор не указан'}}</small><small>{{(v.totalBytes/1024**2).toFixed(1)}} МиБ</small>
<p v-if="v.error" role="status" class="library-error">{{v.error}}</p>
<div v-if="canManage" class="library-card-actions video-actions"><template v-if="!v.deletedAt"><button @click="edit(v)">Изменить</button><button v-if="v.status==='UPLOADING'&&v.canResume" @click="edit(v,true)">Продолжить</button><button v-if="v.status==='ERROR'" :disabled="busy" @click="action(v,'retry')">Повторить обработку</button><button @click="removing=v">В корзину</button></template><button v-else :disabled="busy" @click="action(v,'restore')">Восстановить</button></div>
</article></div>
<nav v-if="total>24" class="library-pagination" aria-label="Страницы видео"><button :disabled="page===1||loading" @click="page--;load()">Назад</button><span>{{page}} / {{Math.ceil(total/24)}}</span><button :disabled="page*24>=total||loading" @click="page++;load()">Далее</button></nav>
<LibraryVideoEditor v-if="editor" :video="selected" :resume="resume" :categories="categories" :selected="category" @close="editor=false" @changed="changed" />
<div v-if="removing" class="library-overlay"><section class="library-dialog" role="alertdialog" aria-modal="true" aria-labelledby="trash-video-title"><h2 id="trash-video-title">Переместить видео в корзину?</h2><p>«{{removing.title}}» будет скрыто от сотрудников. Файл и позиции просмотра сохранятся.</p><p v-if="error" role="alert">{{error}}</p><footer><button :disabled="busy" @click="removing=null">Отмена</button><button :disabled="busy" @click="action(removing,'trash')">В корзину</button></footer></section></div>
</section>
</template>
