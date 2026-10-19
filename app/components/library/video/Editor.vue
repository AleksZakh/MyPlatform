<script setup lang="ts">
import { useVideoUpload } from "../../../composables/useVideoUpload";
import type { LibraryVideo } from '~~/shared/types/library-video';
import type { LibraryCategory } from '~~/shared/types/library';
const props = defineProps<{ video: LibraryVideo|null; categories: LibraryCategory[]; selected: number|null; resume?: boolean }>();
const emit = defineEmits<{ close: []; changed: [] }>();
const form = reactive({title:props.video?.title||'',author:props.video?.author||'',description:props.video?.description||'',categoryIds:props.video?.categories.map(c=>c.categoryId)||(props.selected?[props.selected]:[])});
const selectedFile = ref<File|null>(null), record = ref(props.video), saving = ref(false), error = ref('');
const transfer = useVideoUpload(); const {busy,progress,message,error:uploadError}=transfer;
const busyAny = computed(()=>saving.value||busy.value);
function close() { if (!busyAny.value) emit('close'); }
useLibraryDialog(close);
function choose(e: Event) { selectedFile.value=(e.target as HTMLInputElement).files?.[0]||null; }
function label(c:LibraryCategory) {return (c.parentId?props.categories.find(p=>p.id===c.parentId)?.name+' → ':'')+c.name;}
async function save() {
  error.value='';
  if (!form.title.trim() || !form.categoryIds.length) {error.value='Укажите название и хотя бы один раздел.';return;}
  if (!props.video || props.resume) {
    if (!selectedFile.value) {error.value='Выберите исходный MP4-файл.';return;}
    await transfer.upload(selectedFile.value,form,record.value,async id=>{record.value=await $fetch<LibraryVideo>(`/api/library/videos/${id}`);emit('changed');});
    emit('changed');return;
  }
  const current = record.value; if (!current) return;
  saving.value=true;
  try { await $fetch(`/api/library/videos/${current.id}`,{method:'PATCH',headers:{'x-space-library':'1'},body:{...form,version:current.version},retry:0});emit('changed');emit('close'); }
  catch(e:any){error.value=e?.data?.message||e.message;}finally{saving.value=false;}
}
</script>
<template>
<div class="library-overlay" @keydown.esc="close">
<section class="library-dialog" role="dialog" aria-modal="true" aria-labelledby="video-editor-title">
<header><h2 id="video-editor-title">{{ resume?'Продолжить загрузку':video?'Редактирование видео':'Новое видео' }}</h2><button :disabled="busyAny" aria-label="Закрыть" @click="close">×</button></header>
<form @submit.prevent="save">
<label>Название<input v-model="form.title" required maxlength="500" :disabled="busyAny||resume" /></label>
<label>Автор<input v-model="form.author" maxlength="500" :disabled="busyAny||resume" /></label>
<label>Описание<textarea v-model="form.description" rows="4" maxlength="20000" :disabled="busyAny||resume" /></label>
<fieldset :disabled="busyAny||resume"><legend>Разделы</legend><label v-for="c in categories" :key="c.id" class="video-category"><input v-model="form.categoryIds" type="checkbox" :value="c.id" />{{label(c)}}</label></fieldset>
<label v-if="!video||resume" class="video-drop" @dragover.prevent @drop.prevent="!busyAny && (selectedFile=$event.dataTransfer?.files[0]||null)">MP4: выберите или перетащите файл<input type="file" accept=".mp4,video/mp4" :disabled="busyAny" @change="choose" /><span v-if="selectedFile">{{selectedFile.name}} · {{(selectedFile.size/1024**2).toFixed(1)}} МиБ</span></label>
<p v-if="resume">Для продолжения выберите тот же исходный файл. Уже принятые части будут сохранены.</p>
<progress v-if="busy||progress" :value="progress" max="100" aria-label="Ход загрузки" />
<p role="status">{{message}}</p><p v-if="error||uploadError" role="alert" class="library-error">{{error||uploadError}}</p>
<footer><button v-if="busy" type="button" @click="transfer.pause">Приостановить</button><button type="button" :disabled="busyAny" @click="close">Закрыть</button><button :disabled="busyAny||progress===100" type="submit">{{busy?'Загрузка…':!video||resume?'Загрузить / продолжить':'Сохранить'}}</button></footer>
</form></section></div>
</template>
