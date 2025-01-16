<script setup lang="ts">
defineProps<{
  msg: string
}>()
</script>

<template>
  <div class="greetings">
    <h1 class="green">{{ msg }}</h1>
    <h3>
      Vous êtes dans votre Vue, cliquez ici pour accéder à
      <a
        href="http://127.0.0.1:5984/_utils/#login"
        target="_blank"
        rel="noopener"
        style="text-decoration: underline"
        >CouchDB</a
      >
    </h3>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
  color: #659dfe;
}

h3 {
  font-size: 1.2rem;
}
a {
  color: black;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
