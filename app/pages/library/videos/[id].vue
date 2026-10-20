<script setup lang="ts">
import type { LibraryVideo } from '~~/shared/types/library-video';
import '../../../assets/css/library.css';
import '../../../assets/css/library-video.css';
const route=useRoute(),id=String(route.params.id);
const {data:video,error}=await useFetch<LibraryVideo>(`/api/library/videos/${id}`);
useHead({title:()=>`${video.value?.title||'Видео'} — Space`});
const player=ref<HTMLVideoElement|null>(null),saved=ref(0),loaded=ref(false),restored=ref(false),notice=ref(''),playError=ref(''),speed=ref(1);
let lastSave=0, saveChain=Promise.resolve();
function restore(){if(restored.value||!loaded.value||!player.value?.duration)return;restored.value=true;if(saved.value>0&&saved.value<player.value.duration-2){player.value.currentTime=saved.value;notice.value='Продолжаем с места остановки.';}}
function save(force=false){const el=player.value;if(!el||!restored.value||!Number.isFinite(el.currentTime)||(!force&&Date.now()-lastSave<15000))return;lastSave=Date.now();const seconds=el.currentTime;
 saveChain=saveChain.then(async()=>{try{await $fetch(`/api/library/videos/${id}/position`,{method:'PUT',headers:{'x-space-library':'1'},body:{seconds},retry:0,keepalive:true});}catch{notice.value='Не удалось сохранить позицию. Просмотр можно продолжить.';}});
}
function hidden(){if(document.hidden)save(true);}
onMounted(async()=>{document.addEventListener('visibilitychange',hidden);try{saved.value=(await $fetch<{seconds:number}>(`/api/library/videos/${id}/position`)).seconds;}catch{notice.value='Не удалось получить сохранённую позицию.';}finally{loaded.value=true;restore();}});
onBeforeRouteLeave(async()=>{save(true);await saveChain;});
onBeforeUnmount(()=>{save(true);document.removeEventListener('visibilitychange',hidden);});
</script>
<template>
<main class="space-library library-video-view"><NuxtLink to="/library?type=video">← В библиотеку</NuxtLink><p v-if="error" role="alert">Видео недоступно или не найдено.</p>
<template v-else-if="video"><h1>{{video.title}}</h1><p>{{video.author}}</p><template v-if="video.status==='READY'">
<video :data-space-video="id" ref="player" controls playsinline preload="metadata" :poster="video.hasPoster?`/api/library/videos/${id}/poster`:undefined" :src="`/api/library/videos/${id}/media`" @loadedmetadata="restore" @timeupdate="save()" @pause="save(true)" @ended="save(true)" @error="playError='Не удалось воспроизвести видео. Проверьте соединение и попробуйте обновить страницу.'" />
<div class="library-toolbar"><label>Скорость <select v-model="speed" @change="player&&(player.playbackRate=Number(speed))"><option v-for="s in [0.5,0.75,1,1.25,1.5,2]" :key="s" :value="s">{{s}}×</option></select></label><button @click="player&&(player.currentTime=0)">С начала</button></div>
<p v-if="notice" role="status">{{notice}}</p><p v-if="playError" role="alert" class="library-error">{{playError}}</p></template><p v-else>Видео ещё не готово к просмотру.</p><p class="video-description">{{video.description}}</p></template>
</main>
</template>
