let walletAddress = null;
let totalCredits = 0;
let completedMissions = [];
let autoStakeBalance = 0;
let manualStakeBalance = 0;
let autoStakeStartDate = null;
let manualStakeStartDate = null;

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
    }, 5000);
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

// Calcular rendimento de 200% ao ano (~0.02283% por hora, composto)
function calculateStakeInterest(balance, startDate) {
  if (!startDate || balance <= 0) return balance;
  const now = new Date();
  const hoursPassed = (now - new Date(startDate)) / (1000 * 60 * 60);
  const hourlyRate = 0.0002283; // 200% ao ano ÷ (365 * 24) ≈ 0.02283% por hora
  const newBalance = balance * Math.pow(1 + hourlyRate, hoursPassed);
  return newBalance;
}

// Atualizar saldos da carteira
async function updateWalletBalances() {
  if (!walletAddress) {
    showNotification('Por favor, conecte sua carteira primeiro.', 'error');
    const detBalanceElement = document.getElementById('det-balance');
    const solBalanceElement = document.getElementById('sol-balance');
    const autoStakeBalanceElement = document.getElementById('auto-stake-balance');
    const manualStakeBalanceElement = document.getElementById('manual-stake-balance');
    const autoStakeStatusElement = document.getElementById('auto-stake-status');
    const transferAutoStakeButton = document.getElementById('transfer-auto-stake');
    if (detBalanceElement) detBalanceElement.textContent = '0.00';
    if (solBalanceElement) solBalanceElement.textContent = '0.0000';
    if (autoStakeBalanceElement) autoStakeBalanceElement.textContent = '0.00';
    if (manualStakeBalanceElement) manualStakeBalanceElement.textContent = '0.00';
    if (autoStakeStatusElement) autoStakeStatusElement.textContent = '';
    if (transferAutoStakeButton) transferAutoStakeButton.disabled = true;
    return;
  }

  // Atualizar saldo DET
  const detBalanceElement = document.getElementById('det-balance');
  if (detBalanceElement) {
    detBalanceElement.textContent = totalCredits.toFixed(2);
    console.log("Saldo DET atualizado:", totalCredits);
  }

  // Atualizar saldo SOL
  const solBalanceElement = document.getElementById('sol-balance');
  if (solBalanceElement) {
    solBalanceElement.textContent = 'Carregando...';
    try {
      const connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');
      const publicKey = new SolanaWeb3.PublicKey(walletAddress);
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / SolanaWeb3.LAMPORTS_PER_SOL;
      solBalanceElement.textContent = solBalance.toFixed(4);
      console.log("Saldo SOL atualizado:", solBalance);
    } catch (err) {
      console.error("Erro ao consultar saldo SOL:", err);
      showNotification("Erro ao consultar saldo SOL. Verifique sua conexão ou rede.", 'error');
      solBalanceElement.textContent = 'Erro';
    }
  }

  // Atualizar saldos de stake com rendimentos
  const autoStakeBalanceElement = document.getElementById('auto-stake-balance');
  const manualStakeBalanceElement = document.getElementById('manual-stake-balance');
  const autoStakeStatusElement = document.getElementById('auto-stake-status');
  const transferAutoStakeButton = document.getElementById('transfer-auto-stake');

  if (autoStakeBalanceElement && autoStakeStatusElement && transferAutoStakeButton) {
    autoStakeBalance = calculateStakeInterest(autoStakeBalance, autoStakeStartDate);
    autoStakeBalanceElement.textContent = autoStakeBalance.toFixed(2);
    safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, autoStakeBalance);
    safeLocalStorageSet(`autoStakeStartDate_${walletAddress}`, autoStakeStartDate);

    const now = new Date();
    const daysPassed = autoStakeStartDate ? (now - new Date(autoStakeStartDate)) / (1000 * 60 * 60 * 24) : 0;
    if (daysPassed >= 60 && autoStakeBalance > 0) {
      autoStakeStatusElement.textContent = '(Desbloqueado)';
      transferAutoStakeButton.disabled = false;
    } else {
      const daysLeft = Math.ceil(60 - daysPassed);
      autoStakeStatusElement.textContent = `(Bloqueado por ${daysLeft} dia${daysLeft !== 1 ? 's' : ''})`;
      transferAutoStakeButton.disabled = true;
    }
    console.log("Stake Automático atualizado:", autoStakeBalance, "Status:", autoStakeStatusElement.textContent);
  }

  if (manualStakeBalanceElement) {
    manualStakeBalance = calculateStakeInterest(manualStakeBalance, manualStakeStartDate);
    manualStakeBalanceElement.textContent = manualStakeBalance.toFixed(2);
    safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, manualStakeBalance);
    safeLocalStorageSet(`manualStakeStartDate_${walletAddress}`, manualStakeStartDate);
    console.log("Stake Manual atualizado:", manualStakeBalance);
  }
}

// Atualizar rendimentos a cada hora
function updateStakeInterestHourly() {
  if (walletAddress) {
    updateWalletBalances();
    console.log("Rendimentos de stake atualizados (hora).");
  }
}
setInterval(updateStakeInterestHourly, 3600000); // 1 hora = 3600000 ms

// Iniciar stake manual
function startManualStake() {
  if (!walletAddress) {
    showNotification('Por favor, conecte sua carteira primeiro.', 'error');
    return;
  }

  const amount = prompt("Quantos DET deseja colocar em stake manual? (Disponível: " + totalCredits.toFixed(2) + " DET)");
  const parsedAmount = parseFloat(amount);

  if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > totalCredits) {
    showNotification('Quantidade inválida ou insuficiente.', 'error');
    return;
  }

  totalCredits -= parsedAmount;
  manualStakeBalance += parsedAmount;
  if (!manualStakeStartDate) {
    manualStakeStartDate = new Date().toISOString();
    safeLocalStorageSet(`manualStakeStartDate_${walletAddress}`, manualStakeStartDate);
  }

  safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits);
  safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, manualStakeBalance);
  updateWalletBalances();
  showNotification(`Iniciado stake manual de ${parsedAmount.toFixed(2)} DET.`, 'success');
}

// Encerrar stake manual
function endManualStake() {
  if (!walletAddress) {
    showNotification('Por favor, conecte sua carteira primeiro.', 'error');
    return;
  }

  if (manualStakeBalance <= 0) {
    showNotification('Nenhum DET em stake manual para retirar.', 'error');
    return;
  }

  totalCredits += manualStakeBalance;
  manualStakeBalance = 0;
  manualStakeStartDate = null;
  safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits);
  safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, manualStakeBalance);
  safeLocalStorageRemove(`manualStakeStartDate_${walletAddress}`);
  updateWalletBalances();
  showNotification('Stake manual encerrado. Tokens transferidos para saldo disponível.', 'success');
}

// Transferir stake automático após desbloqueio
function transferAutoStake() {
  if (!walletAddress) {
    showNotification('Por favor, conecte sua carteira primeiro.', 'error');
    return;
  }

  if (autoStakeBalance <= 0) {
    showNotification('Nenhum DET em stake automático para transferir.', 'error');
    return;
  }

  const now = new Date();
  const daysPassed = autoStakeStartDate ? (now - new Date(autoStakeStartDate)) / (1000 * 60 * 60 * 24) : 0;
  if (daysPassed < 60) {
    showNotification('Stake automático ainda está bloqueado.', 'error');
    return;
  }

  totalCredits += autoStakeBalance;
  autoStakeBalance = 0;
  autoStakeStartDate = null;
  safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits);
  safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, autoStakeBalance);
  safeLocalStorageRemove(`autoStakeStartDate_${walletAddress}`);
  updateWalletBalances();
  showNotification('Stake automático transferido para saldo disponível.', 'success');
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
    totalCredits = parseFloat(safeLocalStorageGet(`totalCredits_${walletAddress}`) || '0');
    completedMissions = JSON.parse(safeLocalStorageGet(`completedMissions_${walletAddress}`) || '[]');
    autoStakeBalance = parseFloat(safeLocalStorageGet(`autoStakeBalance_${walletAddress}`) || '0');
    manualStakeBalance = parseFloat(safeLocalStorageGet(`manualStakeBalance_${walletAddress}`) || '0');
    autoStakeStartDate = safeLocalStorageGet(`autoStakeStartDate_${walletAddress}`);
    manualStakeStartDate = safeLocalStorageGet(`manualStakeStartDate_${walletAddress}`);

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
    safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, autoStakeBalance);
    safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, manualStakeBalance);
    if (autoStakeStartDate) safeLocalStorageSet(`autoStakeStartDate_${walletAddress}`, autoStakeStartDate);
    if (manualStakeStartDate) safeLocalStorageSet(`manualStakeStartDate_${walletAddress}`, manualStakeStartDate);
  }

  walletAddress = null;
  totalCredits = 0;
  completedMissions = [];
  autoStakeBalance = 0;
  manualStakeBalance = 0;
  autoStakeStartDate = null;
  manualStakeStartDate = null;
  safeLocalStorageRemove('walletAddress');
  updateWalletUI();
  updateMissionsUI();
  updateWalletBalances();
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
    totalCreditsElement.textContent = totalCredits.toFixed(2);
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
  if (missionId === 1) reward = 10;
  else if (missionId === 2) {
    window.open('https://twitter.com/DetHabits', '_blank');
    reward = 5;
  } else if (missionId === 3) {
    window.open('https://t.me/DetHabits', '_blank');
    reward = 5;
  }

  const autoStakeAmount = reward * 0.1;
  const availableAmount = reward * 0.9;

  totalCredits += availableAmount;
  autoStakeBalance += autoStakeAmount;
  if (!autoStakeStartDate) {
    autoStakeStartDate = new Date().toISOString();
    safeLocalStorageSet(`autoStakeStartDate_${walletAddress}`, autoStakeStartDate);
  }
  completedMissions.push(missionId);

  safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits);
  safeLocalStorageSet(`completedMissions_${walletAddress}`, JSON.stringify(completedMissions));
  safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, autoStakeBalance);

  updateMissionsUI();
  updateWalletBalances();
  showNotification(`Missão ${missionId} completada! Você ganhou ${availableAmount.toFixed(2)} DET (+${autoStakeAmount.toFixed(2)} DET em stake automático).`, 'success');
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
    totalCredits = parseFloat(safeLocalStorageGet(`totalCredits_${walletAddress}`) || '0');
    completedMissions = JSON.parse(safeLocalStorageGet(`completedMissions_${walletAddress}`) || '[]');
    autoStakeBalance = parseFloat(safeLocalStorageGet(`autoStakeBalance_${walletAddress}`) || '0');
    manualStakeBalance = parseFloat(safeLocalStorageGet(`manualStakeBalance_${walletAddress}`) || '0');
    autoStakeStartDate = safeLocalStorageGet(`autoStakeStartDate_${walletAddress}`);
    manualStakeStartDate = safeLocalStorageGet(`manualStakeStartDate_${walletAddress}`);
  }

  updateWalletUI();
  updateMissionsUI();
  updateWalletBalances();

  if (window.solana && window.solana.isPhantom) {
    console.log("Phantom Wallet detectada.");
    window.solana.on('connect', () => {
      console.log("Evento de conexão disparado.");
      connectWallet();
    });
  } else {
    console.warn("Phantom Wallet não detectada ao carregar a página.");
  }

  const menuButton = document.getElementById('menu-button');
  if (menuButton) {
    menuButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        toggleMenu();
      }
    });
  }
});