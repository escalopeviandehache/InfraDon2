<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="https://www.zoodejurques.fr/wp-content/uploads/2019/04/Tigre-de-Siberie-5.jpg"
 width="220" height="220" />

    <div class="wrapper">
      <HelloWorld msg="Bienvenue" />

      <nav>
        <RouterLink to="/">Accueil</RouterLink>
        <RouterLink to="/about">À propos</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
  color: black;

}


nav a.router-link-exact-active {
  color: black;
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
  color: black;

}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid black;
  
}

nav a:first-of-type {
  border: 0;
  color: black;
}
nav a:first-of-type:hover {
  border: 0;
  color: white;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
    
  }

  
  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
