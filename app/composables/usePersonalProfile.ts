import { emptyProfileDetails, profileDetailsSchema, type PersonalProfileDto } from '~~/shared/utils/profile-details';
export function usePersonalProfile() {
 const { user } = useUserSession();
 const profile = ref<PersonalProfileDto | null>(null);
 const details = ref(emptyProfileDetails());
 const loading = ref(false), saving = ref(false), uploading = ref(false);
 const error = ref(''), notice = ref('');
 let generation = 0;
 const avatarUrl = computed(() => profile.value?.avatarVersion ? `/api/profile/avatar?v=${encodeURIComponent(profile.value.avatarVersion)}` : '');
 async function load() {
  const turn = ++generation;
  profile.value = null; details.value = emptyProfileDetails(); error.value = ''; loading.value = true;
  if (!user.value?.id) { loading.value = false; return; }
  try {
   const value = await $fetch<PersonalProfileDto>('/api/profile');
   if (turn !== generation) return;
   profile.value = value; details.value = profileDetailsSchema.parse(Object.fromEntries(Object.keys(emptyProfileDetails()).map(key => [key, value[key as keyof typeof value]])));
  } catch { if (turn === generation) error.value = 'Не удалось загрузить личные данные. Повторите попытку.'; }
  finally { if (turn === generation) loading.value = false; }
 }
 async function save() {
  if (!profile.value || saving.value) return;
  const result = profileDetailsSchema.safeParse(details.value);
  if (!result.success) { error.value = 'Проверьте адреса электронной почты и длину полей.'; return; }
  const turn = generation; saving.value = true; error.value = ''; notice.value = '';
  try {
   const value = await $fetch<PersonalProfileDto>('/api/profile', { method: 'PATCH', headers: { 'x-space-profile': '1' }, body: result.data });
   if (turn !== generation) return;
   profile.value = value; notice.value = 'Личные данные сохранены.';
  } catch { if (turn === generation) error.value = 'Не удалось сохранить личные данные.'; }
  finally { saving.value = false; }
 }
 async function avatar(file: File | null) {
  if (!profile.value || uploading.value || saving.value) return;
  if (file && file.size > 5 * 1024 * 1024) { error.value = 'Размер фото должен быть не больше 5 МБ.'; return; }
  const turn = generation; uploading.value = true; error.value = ''; notice.value = '';
  try {
   const result = file
    ? await $fetch<{ avatarVersion: string }>('/api/profile/avatar', { method: 'PUT', headers: { 'x-space-profile': '1', 'content-type': 'application/octet-stream' }, body: file })
    : await $fetch<{ avatarVersion: null }>('/api/profile/avatar', { method: 'DELETE', headers: { 'x-space-profile': '1' } });
   if (turn !== generation || !profile.value) return;
   profile.value.avatarVersion = result.avatarVersion; notice.value = file ? 'Фото сохранено.' : 'Фото удалено.';
  } catch (e: any) { if (turn === generation) error.value = e?.data?.message || 'Не удалось изменить фото.'; }
  finally { uploading.value = false; }
 }
 function selectPhoto(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0];
  input.value = ''; if (file) void avatar(file);
 }
 onMounted(load);
 watch(() => user.value?.id, () => { void load(); });
 onBeforeUnmount(() => { generation++; });
 return { profile, details, loading, saving, uploading, error, notice, load, save, avatar, avatarUrl, selectPhoto };
}
