<template>
    <NavigateTopnav />
    <section class="grid min-h-screen bg-gray-100">
        <SidebarMenu />
        <main class="">
            <slot />
        </main>
    </section>
    <Toast />
</template>

<script setup lang="ts">
    const { loggedIn } = useUserSession();

</script>

<style scoped>

    .grid{
        display: grid;
        grid-template-columns: 1fr 6fr;
    }
</style>