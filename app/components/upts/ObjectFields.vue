<script setup lang="ts">
import type { UptsObjectDetails } from '~~/shared/types/upts-object';
const details=defineModel<UptsObjectDetails>({required:true});
</script>
<template>
  <section class="upts-object-fields">
    <label>Категория земель<input v-model="details.landCategory" maxlength="500" /></label>
    <div class="upts-repeat-fields"><label v-for="(_,i) in details.permittedUses" :key="i">{{ i ? 'Дополнительный ВРИ исходного ЗУ' : 'ВРИ исходного ЗУ' }}<input v-model="details.permittedUses![i]" maxlength="500" /></label></div>
    <label>Вид права<input v-model="details.rightKind" maxlength="500" /></label>
    <div class="upts-repeat-fields"><label v-for="(_,i) in details.rightHolders" :key="i">{{ i ? 'Дополнительный правообладатель' : 'Правообладатель' }}<input v-model="details.rightHolders![i]" maxlength="500" /></label></div>
    <label>Площадь, кв. м<input v-model="details.sourceArea" inputmode="decimal" maxlength="30" pattern="[0-9]+([.,][0-9]+)?" /></label>
  </section>
</template>
<style scoped>
.upts-object-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 24px;align-items:start;min-width:0}.upts-object-fields>label{min-width:0}.upts-object-fields label{font-size:12px;color:var(--work-muted)}.upts-object-fields input{color:var(--work-text)}.upts-repeat-fields{display:grid;gap:8px;min-width:0}
@media(max-width:640px){.upts-object-fields{grid-template-columns:1fr}}
</style>
