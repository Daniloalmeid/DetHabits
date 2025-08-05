const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const walletAddressDisplay = document.getElementById('walletAddress');
const iosMessage = document.getElementById('iosMessage');
const openInPhantom = document.getElementById('openInPhantom');
const habitsSection = document.getElementById('habitsSection');
const habitList = document.getElementById('habitList');

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
}

function isAndroid() {
  return /android/i.test(navigator.userAgent.toLowerCase());
}

async function connectWallet() {
  const isPhantomInstalled = window.solana && window.solana.isPhantom;

  if (isPhantomInstalled) {
    try {
      const resp = await window.solana.connect();
      const walletAddress = resp.publicKey.toString();
      walletAddressDisplay.innerText = 'Carteira conectada: ' + walletAddress;
      walletAddressDisplay.className = 'success';
      connectButton.style.display = 'none';
      disconnectButton.style.display = 'inline-block';
      localStorage.setItem('userPublicKey', walletAddress);
      showHabitsSection();
    } catch (err) {
      console.error('Erro ao conectar:', err);
      walletAddressDisplay.innerText = 'Erro ao conectar à carteira.';
      walletAddressDisplay.className = 'error';
    }
  } else if (isAndroid()) {
    const dappUrl = encodeURIComponent(window.location.href);
    const phantomDeepLink = `https://phantom.app/ul/v1/connect?app_url=${dappUrl}&redirect_link=${dappUrl}`;
    window.location.replace(phantomDeepLink);
  } else if (isIOS()) {
    iosMessage.style.display = 'block';
  } else {
    alert('Por favor, instale a extensão Phantom no seu navegador.');
  }
}

async function disconnectWallet() {
  if (window.solana && window.solana.isPhantom) {
    try {
      await window.solana.disconnect();
      walletAddressDisplay.innerText = 'Carteira desconectada.';
      walletAddressDisplay.className = '';
      connectButton.style.display = 'inline-block';
      disconnectButton.style.display = 'none';
      localStorage.removeItem('userPublicKey');
      habitsSection.style.display = 'none';
    } catch (err) {
      console.error('Erro ao desconectar:', err);
      walletAddressDisplay.innerText = 'Erro ao desconectar.';
      walletAddressDisplay.className = 'error';
    }
  }
}

function showHabitsSection() {
  habitsSection.style.display = 'block';
  loadHabits();
}

function loadHabits() {
  habitList.innerHTML = ''; // Limpar lista antes de carregar
  const habits = [
    { name: 'Beber água', completed: false },
    { name: 'Exercício', completed: true }
  ];
  habits.forEach(habit => {
    const div = document.createElement('div');
    div.className = 'habit';
    div.innerText = `${habit.name} - ${habit.completed ? 'Concluído' : 'Pendente'}`;
    habitList.appendChild(div);
  });
}

function addHabit() {
  const name = prompt('Nome do hábito:');
  if (name) {
    alert(`Hábito "${name}" adicionado!`);
    loadHabits(); // Recarregar lista (futuramente, salvar no back-end ou localStorage)
  }
}

window.addEventListener('load', async () => {
  if (window.solana && window.solana.isPhantom) {
    try {
      const resp = await window.solana.connect({ onlyIfTrusted: true });
      if (resp.publicKey) {
        const walletAddress = resp.publicKey.toString();
        walletAddressDisplay.innerText = 'Carteira conectada: ' + walletAddress;
        walletAddressDisplay.className = 'success';
        connectButton.style.display = 'none';
        disconnectButton.style.display = 'inline-block';
        localStorage.setItem('userPublicKey', walletAddress);
        showHabitsSection();
      }
    } catch (err) {
      console.log('Conexão automática recusada.');
    }
  }

  if (isIOS()) {
    const currentUrl = encodeURIComponent(window.location.href);
    const phantomBrowseUrl = `https://phantom.app/ul/browse/${currentUrl}`;
    openInPhantom.href = phantomBrowseUrl;
  }
});

connectButton.addEventListener('click', connectWallet);
disconnectButton.addEventListener('click', disconnectWallet);