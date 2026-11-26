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
    <div :class="{'st-overview':section.key==='main' && contracts != null}">
      <dl class="st-fields"><div v-for="field in section.fields" :key="field.key" :class="{'st-field-wide':['roadName','additionalId','plannedWorks','note','expertOpinion','contractNumber','executor'].includes(field.key)}">
        <dt>{{ legacy&&field.key==='contractNumber'?'Договоры из старой базы':legacy&&field.key==='executor'?'Исполнители из старой базы':field.label }}</dt><dd>{{ structureValue(record,field.key) }}</dd>
      </div></dl>
      <aside v-if="section.key==='main' && contracts != null" class="st-contract-usage" aria-label="Договоры ОДИС">
        <h4>Договоры ОДИС <span v-if="contracts.length">({{ contracts.length }})</span></h4>
        <ul v-if="contracts.length">
          <li v-for="contract in contracts" :key="contract.id">
            <strong>{{ contract.number }}</strong>
            <small>от <time :datetime="contract.date">{{ formatWorkDate(contract.date) }}</time> · Этап {{ contract.stage }}</small>
          </li>
        </ul>
        <p v-else>Сооружение не включено в договоры.</p>
      </aside>
    </div>
  </section>
</template>
