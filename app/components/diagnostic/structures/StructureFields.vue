<script setup lang="ts">
import { computed } from 'vue';
import { structureGroups, type StructureRecord } from '~~/shared/types/diagnostic-structures';
import { structureValue } from '~~/shared/utils/diagnostic-structures';
const props=defineProps<{record:StructureRecord; group?:string}>();
const groups=computed(()=>structureGroups.filter(group=>!props.group||group.key===props.group));
</script>
<template>
  <section v-for="section in groups" :key="section.key" class="st-field-section">
    <h3 v-if="!group">{{ section.label }}</h3>
    <dl class="st-fields"><div v-for="field in section.fields" :key="field.key" :class="{'st-field-wide':['roadName','additionalId','plannedWorks','note','expertOpinion'].includes(field.key)}">
      <dt>{{ field.label }}</dt><dd>{{ structureValue(record,field.key) }}</dd>
    </div></dl>
  </section>
</template>
