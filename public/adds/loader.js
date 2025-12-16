// public/adds/loader.js
async function loadComponent(elementId, file) {
  try {
    const response = await fetch(file);
    const html = await response.text();
    document.getElementById(elementId).innerHTML = html;
  } catch (error) {
    console.error(`Erro ao carregar ${file}:`, error);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadComponent('header-container', '/adds/header.html');
  await loadComponent('footer-container', '/adds/footer.html');
});