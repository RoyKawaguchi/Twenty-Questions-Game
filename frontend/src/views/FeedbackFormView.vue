<script setup></script>

<template>
  <div class="feedback-container">
    <h1>We value your feedback.</h1>

    <iframe
      src="https://forms.office.com/Pages/ResponsePage.aspx?id=74FucSK1c0SOMRC9Asz25S6YC81q8MhLkNet_nLcVbJUQkY2Q0cwUlU1SjBMMUwyWFdCS0RDN0FQRC4u&embed=true"
      frameborder="0"
      marginwidth="0"
      marginheight="0"
      allowfullscreen
      webkitallowfullscreen
      mozallowfullscreen
      msallowfullscreen
    >
    </iframe>
  </div>
</template>

<style scoped>
.feedback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 2rem;
  gap: 1.5rem;
}

h1 {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  text-align: center;
  color: #f1f1f1;
}

iframe {
  width: min(900px, 100%);
  height: 80vh;
  border: none;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
</style>
