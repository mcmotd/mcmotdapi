<script setup>
import ConfigProvider from './components/ConfigProvider.vue';
import SideMenu from './components/SideMenu.vue';
</script>

<template>
  <ConfigProvider>
    <router-view />
    <SideMenu />
  </ConfigProvider>
</template>