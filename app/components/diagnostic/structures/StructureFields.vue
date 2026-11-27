<script setup lang="ts">
import { computed } from 'vue';
import { structureGroups, type StructureRecord } from '~~/shared/types/diagnostic-structures';
import { structureValue } from '~~/shared/utils/diagnostic-structures';
import type {StructureContractUsage} from '~~/shared/types/diagnostic-structures-api';
import {formatWorkDate} from '~~/shared/utils/work-board';
const props=defineProps<{record:StructureRecord; group?:string; legacy?:boolean; contracts?:StructureContractUsage[]|null}>();
const groups=computed(()=>structureGroups.filter(group=>!props.group||group.key===props.group));
</script>
<template>
  <section v-for="section in groups" :key="section.key" class="st-field-section">
    <h3 v-if="!group">{{ section.label }}</h3>
    <div :class="{'st-overview':section.key==='main'}">
      <dl class="st-fields"><div v-for="field in section.fields" :key="field.key" :class="{'st-field-wide':['roadName','additionalId','plannedWorks','note','expertOpinion','contractNumber','executor'].includes(field.key)}">
        <dt>{{ legacy&&field.key==='contractNumber'?'Договоры из старой базы':legacy&&field.key==='executor'?'Исполнители из старой базы':field.label }}</dt><dd>{{ structureValue(record,field.key) }}</dd>
      </div></dl>
      <aside v-if="section.key==='main'" class="st-contract-usage" :aria-label="contracts != null ? 'Договоры ОДИС и примечание' : 'Примечание'">
        <template v-if="contracts != null"><h4>Договоры ОДИС <span v-if="contracts.length">({{ contracts.length }})</span></h4>
        <ul v-if="contracts.length">
          <li v-for="contract in contracts" :key="contract.id">
            <strong>{{ contract.number }}</strong>
            <small>от <time :datetime="contract.date">{{ formatWorkDate(contract.date) }}</time> · Этап {{ contract.stage }}</small>
          </li>
        </ul>
        <p v-else>Сооружение не включено в договоры.</p></template>
        <h4 class="st-overview-note">Примечание</h4><p class="st-note-value">{{ record.note || '—' }}</p>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.st-overview-note:not(:first-child){margin-top:12px;}
.st-contract-usage .st-note-value{white-space:pre-wrap;overflow-wrap:anywhere;color:inherit;font-size:13px;}
</style>
