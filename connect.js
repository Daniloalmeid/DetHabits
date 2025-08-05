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

  if (isPhantomInstalled && !isIOS() && !isAndroid()) {
    // Desktop
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
      console.error('Erro ao conectar (desktop):', err);
      walletAddressDisplay.innerText = 'Erro ao conectar à carteira: ' + err.message;
      walletAddressDisplay.className = 'error';
    }
  } else if (isAndroid() || isIOS()) {
    // Mobile (Android ou iOS)
    try {
      const dappUrl = encodeURIComponent('https://daniloalmeid.github.io/testecarteira/');
      const phantomDeepLink = `https://phantom.app/ul/v1/connect?app_url=${dappUrl}&redirect_link=${dappUrl}&dapp_name=DETHabits`;
      console.log('Redirecionando para Phantom:', phantomDeepLink); // Depuração
      iosMessage.style.display = isIOS() ? 'block' : 'none';
      openInPhantom.href = phantomDeepLink;
      if (!isIOS()) {
        window.location.href = phantomDeepLink; // Redireciona diretamente no Android
      }
    } catch (err) {
      console.error('Erro ao criar deep link:', err);
      walletAddressDisplay.innerText = 'Erro ao redirecionar para Phantom.';
      walletAddressDisplay.className = 'error';
    }
  } else {
    walletAddressDisplay.innerText = 'Por favor, instale a extensão Phantom no seu navegador.';
    walletAddressDisplay.className = 'error';
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
  habitList.innerHTML = ''; // Limpar lista
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

// Processar retorno do deep link
function handleDeepLinkReturn() {
  const url = new URL(window.location.href);
  const error = url.searchParams.get('error');
  if (error) {
    walletAddressDisplay.innerText = 'Erro na conexão: ' + decodeURIComponent(error);
    walletAddressDisplay.className = 'error';
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  // A Phantom não retorna 'phantom_public_key' diretamente; usamos uma abordagem alternativa
  if (window.solana && window.solana.isPhantom) {
    try {
      window.solana.connect().then(resp => {
        const walletAddress = resp.publicKey.toString();
        walletAddressDisplay.innerText = 'Carteira conectada: ' + walletAddress;
        walletAddressDisplay.className = 'success';
        connectButton.style.display = 'none';
        disconnectButton.style.display = 'inline-block';
        localStorage.setItem('userPublicKey', walletAddress);
        showHabitsSection();
        window.history.replaceState({}, document.title, window.location.pathname);
      }).catch(err => {
        console.error('Erro ao reconectar após deep link:', err);
        walletAddressDisplay.innerText = 'Erro ao conectar após retorno.';
        walletAddressDisplay.className = 'error';
      });
    } catch (err) {
      console.error('Erro no retorno do deep link:', err);
      walletAddressDisplay.innerText = 'Erro ao processar retorno.';
      walletAddressDisplay.className = 'error';
    }
  }
}

window.addEventListener('load', async () => {
  // Verificar retorno do deep link (mobile)
  handleDeepLinkReturn();

  // Tentar conexão automática no desktop
  if (window.solana && window.solana.isPhantom && !isIOS() && !isAndroid()) {
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
      console.log('Conexão automática recusada:', err);
    }
  }

  // Configurar link para iOS
  if (isIOS()) {
    const currentUrl = encodeURIComponent('https://daniloalmeid.github.io/testecarteira/');
    const phantomDeepLink = `https://phantom.app/ul/v1/connect?app_url=${currentUrl}&redirect_link=${currentUrl}&dapp_name=DETHabits`;
    openInPhantom.href = phantomDeepLink;
    iosMessage.style.display = 'block';
  }
});

connectButton.addEventListener('click', connectWallet);
disconnectButton.addEventListener('click', disconnectWallet);