let walletAddress = null;
let totalCredits = 0;
let completedMissions = [];

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

// Exibir notificação personalizada
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notification-message');
  if (notification && notificationMessage) {
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 5000); // Fecha após 5 segundos
  }
}

function closeNotification() {
  const notification = document.getElementById('notification');
  if (notification) {
    notification.classList.add('hidden');
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

// Atualizar saldos da carteira
async function updateWalletBalances() {
  if (!walletAddress) {
    showNotification('Por favor, conecte sua carteira primeiro.', 'error');
    return;
  }

  // Atualizar saldo DET
  const detBalanceElement = document.getElementById('det-balance');
  if (detBalanceElement) {
    detBalanceElement.textContent = totalCredits.toFixed(2); // Exibir com 2 casas decimais
  } else {
    console.warn("Elemento det-balance não encontrado.");
  }

  // Atualizar saldo SOL
  const solBalanceElement = document.getElementById('sol-balance');
  if (solBalanceElement) {
    solBalanceElement.textContent = 'Carregando...';
    try {
      const connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');
      const publicKey = new SolanaWeb3.PublicKey(walletAddress);
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / SolanaWeb3.LAMPORTS_PER_SOL; // Converter de lamports para SOL
      solBalanceElement.textContent = solBalance.toFixed(4); // Exibir com 4 casas decimais
      console.log("Saldo SOL atualizado:", solBalance);
    } catch (err) {
      console.error("Erro ao consultar saldo SOL:", err);
      showNotification("Erro ao consultar saldo SOL. Verifique sua conexão ou rede.", 'error');
      solBalanceElement.textContent = 'Erro';
    }
  } else {
    console.warn("Elemento sol-balance não encontrado.");
  }
}

// Função para atualizar saldos ao clicar no botão
function refreshWalletBalances() {
  updateWalletBalances();
  showNotification('Saldos atualizados.', 'success');
}

// Conectar carteira Phantom com debounce
let lastConnectAttempt = 0;
async function connectWallet() {
  const now = Date.now();
  if (now - lastConnectAttempt < 2000) {
    console.warn("Tentativa de conexão muito rápida. Aguarde 2 segundos.");
    showNotification("Por favor, aguarde alguns segundos antes de tentar novamente.", 'error');
    return;
  }
  lastConnectAttempt = now;

  if (!window.solana) {
    console.error("Nenhuma carteira Solana detectada.");
    showNotification("Nenhuma carteira Solana encontrada. Por favor, instale a Phantom Wallet: https://phantom.app/", 'error');
    window.open('https://phantom.app/', '_blank');
    return;
  }

  if (!window.solana.isPhantom) {
    console.error("Phantom Wallet não detectada. Outra carteira Solana encontrada.");
    showNotification("Apenas a Phantom Wallet é suportada. Por favor, instale-a: https://phantom.app/", 'error');
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

    // Carregar missões e créditos específicos da carteira
    totalCredits = parseInt(safeLocalStorageGet(`totalCredits_${walletAddress}`) || '0');
    completedMissions = JSON.parse(safeLocalStorageGet(`completedMissions_${walletAddress}`) || '[]');

    updateWalletUI();
    updateMissionsUI();
    updateWalletBalances();
    showNotification(`Carteira conectada: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, 'success');
    navigateTo('missions');
    // Completar Missão 1 automaticamente ao conectar
    if (!completedMissions.includes(1)) {
      completeMission(1);
    }
  } catch (err) {
    console.error("Erro ao conectar Phantom:", err);
    showNotification(`Erro ao conectar carteira: ${err.message}. Verifique se a Phantom Wallet está instalada, desbloqueada e na rede correta.`, 'error');
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

  // Salvar missões e créditos antes de desconectar
  if (walletAddress) {
    safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits);
    safeLocalStorageSet(`completedMissions_${walletAddress}`, JSON.stringify(completedMissions));
  }

  walletAddress = null;
  totalCredits = 0;
  completedMissions = [];
  safeLocalStorageRemove('walletAddress');
  updateWalletUI();
  updateMissionsUI();
  showNotification("Carteira desconectada", 'success');
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
    showNotification("Erro: Menu não encontrado.", 'error');
  }
}

// Navegar entre páginas
function navigateTo(page) {
  const protectedPages = ['missions', 'wallet', 'presale', 'whitepaper', 'stake', 'spend-credits'];
  if (protectedPages.includes(page) && !walletAddress) {
    console.warn("Tentativa de acessar página protegida sem carteira conectada:", page);
    showNotification('Por favor, conecte sua carteira primeiro.', 'error');
    return;
  }

  const pages = document.querySelectorAll('.page');
  if (pages.length === 0) {
    console.error("Nenhuma página encontrada com a classe .page.");
    showNotification("Erro: Nenhuma página encontrada.", 'error');
    return;
  }

  pages.forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(page);
  if (targetPage) {
    targetPage.classList.add('active');
    console.log("Navegado para:", page);
    // Atualizar saldos ao navegar para a página Wallet
    if (page === 'wallet') {
      updateWalletBalances();
    }
  } else {
    console.error("Página não encontrada:", page);
    showNotification(`Erro: Página ${page} não encontrada.`, 'error');
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
    showNotification('Por favor, conecte sua carteira primeiro.', 'error');
    return;
  }

  if (completedMissions.includes(missionId)) {
    showNotification('Esta missão já foi completada hoje.', 'info');
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

  safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits);
  safeLocalStorageSet(`completedMissions_${walletAddress}`, JSON.stringify(completedMissions));

  updateMissionsUI();
  updateWalletBalances(); // Atualizar saldo DET após completar missão
  showNotification(`Missão ${missionId} completada! Você ganhou ${reward} Credits.`, 'success');
}

// Reset de missões diárias
function resetMissions() {
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const lastReset = safeLocalStorageGet(`lastReset_${walletAddress}`) || '0';
  if (estTime.getDate() !== parseInt(lastReset) && estTime.getHours() >= 6) {
    totalCredits = 0;
    completedMissions = [];
    safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits);
    safeLocalStorageSet(`completedMissions_${walletAddress}`, JSON.stringify(completedMissions));
    safeLocalStorageSet(`lastReset_${walletAddress}`, estTime.getDate());
    updateMissionsUI();
    updateWalletBalances();
    console.log("Missões resetadas às 6h (Eastern Time) para carteira:", walletAddress);
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

  if (walletAddress) {
    totalCredits = parseInt(safeLocalStorageGet(`totalCredits_${walletAddress}`) || '0');
    completedMissions = JSON.parse(safeLocalStorageGet(`completedMissions_${walletAddress}`) || '[]');
  }

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

  // Adicionar evento de teclado para o menu
  const menuButton = document.getElementById('menu-button');
  if (menuButton) {
    menuButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        toggleMenu();
      }
    });
  }
});