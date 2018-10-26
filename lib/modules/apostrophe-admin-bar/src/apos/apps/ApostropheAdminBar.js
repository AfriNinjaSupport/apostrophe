import Vue from 'vue/dist/vue.js';

export default function() {
  /* eslint-disable no-new */
  return new Vue({
    el: '#apos-admin-bar',
    template: '<component :is="`TheApostropheAdminBar`" :items="apos.adminBar.items" />',
    computed: {
      apos () {
        return window.apos;
      }
    }
  });
};
