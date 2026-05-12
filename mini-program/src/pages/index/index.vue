<template>
  <view class="index-container">
    <ContactList />
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useContactsStore } from '../../stores/contacts';
import ContactList from '../../components/ContactList.vue';

const store = useContactsStore();

onMounted(() => {
  store.loadData();
});
</script>

<style scoped>
.index-container {
  height: 100vh;
  background-color: #f5f5f5;
}
</style>
