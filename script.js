let walletAddress = null;
let totalCredits = parseInt(safeLocalStorageGet('totalCredits') || '0');
let completedMissions = JSON.parse(safeLocalStorageGet('completedMissions') || '[]');

// Verificar acesso ao localStorage
function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    console.warn("Erro ao acessar localStorage.getItem:", key);
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    console.warn("Erro ao acessar localStorage.setItem:", key);
    return false;
  }
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    console.warn("Erro ao acessar localStorage.removeItem:", key);
    return false;
  }
}

// Atualizar UI da carteira
function updateWalletUI() {
  const walletButton = document.getElementById('wallet-button');
  const walletAddressElement = document.getElementById('wallet-address');
  if (walletButton && walletAddressElement) {
    if (walletAddress) {
      walletButton.innerHTML = '<span class="button-text">Disconnect Wallet</span>';
      walletButton.onclick = disconnectWallet;
      walletAddressElement.textContent = `Connected Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
      console.log("UI atualizada: Carteira conectada:", walletAddress);
    } else {
      walletButton.innerHTML = '<span class="button-text">Connect Solana Wallet</span>';
      walletButton.onclick = connectWallet;
      walletAddressElement.textContent = '';
      console.log("UI atualizada: Carteira desconectada");
    }
  } else {
    console.warn("Elementos wallet-button ou wallet-address não encontrados.");
  }
}

// Conectar carteira Phantom
async function connectWallet() {
  if (!window.solana) {
    console.error("Nenhuma carteira Solana detectada.");
    alert("Nenhuma carteira Solana encontrada. Por favor, instale a Phantom Wallet: https://phantom.app/");
    window.open('https://phantom.app/', '_blank');
    return;
  }

  if (!window.solana.isPhantom) {
    console.error("Phantom Wallet não detectada. Outra carteira Solana encontrada.");
    alert("Apenas a Phantom Wallet é suportada. Por favor, instale-a: https://phantom.app/");
    window.open('https://phantom.app/', '_blank');
    return;
  }

  try {
    console.log("Tentando conectar ao Phantom...");
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    console.log("Carteira conectada:", walletAddress);
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      throw new Error("Endereço de carteira inválido.");
    }
    safeLocalStorageSet('walletAddress', walletAddress);
    updateWalletUI();
    alert(`Carteira conectada: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
    navigateTo('missions');
    // Completar Missão 1 automaticamente ao conectar
    if (!completedMissions.includes(1)) {
      completeMission(1);
    }
  } catch (err) {
    console.error("Erro ao conectar Phantom:", err);
    alert(`Erro ao conectar carteira: ${err.message}. Verifique se a Phantom Wallet está instalada e desbloqueada.`);
  }
}

// Desconectar carteira
async function disconnectWallet() {
  try {
    if (window.solana && window.solana.isPhantom) {
      await window.solana.disconnect();
      console.log("Carteira desconectada.");
    }
  } catch (err) {
    console.warn("Erro ao desconectar:", err);
  }

  walletAddress = null;
  safeLocalStorageRemove('walletAddress');
  updateWalletUI();
  alert("Carteira desconectada");
  navigateTo('home');
}

// Alternar menu
function toggleMenu() {
  const menu = document.getElementById('menu');
  if (menu) {
    menu.classList.toggle('active');
    console.log("Menu toggled:", menu.classList.contains('active') ? "aberto" : "fechado");
  } else {
    console.error("Elemento #menu não encontrado.");
  }
}

// Navegar entre páginas
function navigateTo(page) {
  const protectedPages = ['missions', 'wallet', 'presale', 'whitepaper', 'stake', 'spend-credits'];
  if (protectedPages.includes(page) && !walletAddress) {
    console.warn("Tentativa de acessar página protegida sem carteira conectada:", page);
    alert('Por favor, conecte sua carteira primeiro.');
    return;
  }

  const pages = document.querySelectorAll('.page');
  if (pages.length === 0) {
    console.error("Nenhuma página encontrada com a classe .page.");
    return;
  }

  pages.forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(page);
  if (targetPage) {
    targetPage.classList.add('active');
    console.log("Navegado para:", page);
  } else {
    console.error("Página não encontrada:", page);
  }

  toggleMenu();
}

// Gerenciamento de missões
function updateMissionsUI() {
  const missionsList = document.getElementById('missions-list');
  const totalCreditsElement = document.getElementById('total-credits');
  if (missionsList && totalCreditsElement) {
    totalCreditsElement.textContent = totalCredits;
    const missionItems = missionsList.querySelectorAll('li button');
    missionItems.forEach((button, index) => {
      const missionId = index + 1;
      if (completedMissions.includes(missionId)) {
        button.disabled = true;
        button.textContent = 'Concluída';
      } else {
        button.disabled = false;
        button.textContent = 'Completar';
      }
    });
  } else {
    console.warn("Elementos missions-list ou total-credits não encontrados.");
  }
}

function completeMission(missionId) {
  if (!walletAddress) {
    alert('Por favor, conecte sua carteira primeiro.');
    return;
  }

  if (completedMissions.includes(missionId)) {
    alert('Esta missão já foi completada hoje.');
    return;
  }

  let reward = 0;
  if (missionId === 1) reward = 10; // Conectar carteira
  else if (missionId === 2) {
    window.open('https://twitter.com/DetHabits', '_blank');
    reward = 5; // Seguir no X
  } else if (missionId === 3) {
    window.open('https://t.me/DetHabits', '_blank');
    reward = 5; // Entrar no Telegram
  }

  totalCredits += reward;
  completedMissions.push(missionId);

  safeLocalStorageSet('totalCredits', totalCredits);
  safeLocalStorageSet('completedMissions', JSON.stringify(completedMissions));

  updateMissionsUI();
  alert(`Missão ${missionId} completada! Você ganhou ${reward} Credits.`);
}

// Reset de missões diárias
function resetMissions() {
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const lastReset = safeLocalStorageGet('lastReset') || '0';
  if (estTime.getDate() !== parseInt(lastReset) && estTime.getHours() >= 6) {
    totalCredits = 0;
    completedMissions = [];
    safeLocalStorageSet('totalCredits', totalCredits);
    safeLocalStorageSet('completedMissions', JSON.stringify(completedMissions));
    safeLocalStorageSet('lastReset', estTime.getDate());
    updateMissionsUI();
    console.log("Missões resetadas às 6h (Eastern Time).");
  }
}

// Verifica reset a cada minuto
setInterval(resetMissions, 60000);

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log("Inicializando site DetHabits...");
  walletAddress = safeLocalStorageGet('walletAddress');
  if (walletAddress && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    walletAddress = null;
    safeLocalStorageRemove('walletAddress');
  }
  totalCredits = parseInt(safeLocalStorageGet('totalCredits') || '0');
  completedMissions = JSON.parse(safeLocalStorageGet('completedMissions') || '[]');
  updateWalletUI();
  updateMissionsUI();

  // Verificar Phantom Wallet ao carregar
  if (window.solana && window.solana.isPhantom) {
    console.log("Phantom Wallet detectada.");
    window.solana.on('connect', () => {
      console.log("Evento de conexão disparado.");
      connectWallet();
    });
  } else {
    console.warn("Phantom Wallet não detectada ao carregar a página.");
  }
});