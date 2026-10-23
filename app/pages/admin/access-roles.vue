<script setup lang="ts">
// Compatibility route for bookmarks. The experimental local draft is never applied.
const route=useRoute();await navigateTo({path:'/admin/access',query:route.query},{replace:true,redirectCode:302});
</script>
<template><span/></template>
