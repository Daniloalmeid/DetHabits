let walletAddress = null;
let totalCredits = 0;
let completedMissions = [];
let autoStakeBalance = 0;
let manualStakeBalance = 0;
let autoStakeStartDate = null;
let manualStakeStartDate = null;

// Função para carregar @solana/web3.js dinamicamente
async function loadSolanaWeb3() {
  if (typeof SolanaWeb3 !== 'undefined') {
    console.log("SolanaWeb3 já está carregado.");
    return true;
  }
  console.log("Tentando carregar @solana/web3.js...");
  const sources = [
    'https://unpkg.com/@solana/web3.js@1.95.3/lib/index.iife.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/solana-web3.js/1.95.3/index.iife.min.js',
    'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.95.3/lib/index.iife.min.js',
    'assets/solana-web3.min.js'
  ];
  for (const src of sources) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.onload = () => {
          console.log(`@solana/web3.js carregado de ${src}`);
          resolve(true);
        };
        script.onerror = () => {
          console.warn(`Falha ao carregar @solana/web3.js de ${src}`);
          reject(new Error(`Falha ao carregar ${src}`));
        };
        document.head.appendChild(script);
      });
      if (typeof SolanaWeb3 !== 'undefined') return true;
    } catch (err) {
      console.error(err.message);
    }
  }
  console.error("Não foi possível carregar @solana/web3.js.");
  return false;
}

// Verificar acesso ao localStorage
function safeLocalStorageGet(key) {
  try {
    const value = localStorage.getItem(key);
    if (value === null || value === 'undefined' || value === 'NaN' || isNaN(parseFloat(value))) {
      console.warn(`Valor inválido para ${key}: ${value}. Retornando 0.`);
      return '0';
    }
    console.log(`Recuperado ${key}: ${value}`);
    return value;
  } catch (err) {
    console.warn(`Erro ao acessar localStorage.getItem (${key}):`, err);
    return '0';
  }
}

function safeLocalStorageSet(key, value) {
  try {
    const stringValue = (typeof value === 'number' ? value : parseFloat(value) || 0).toString();
    localStorage.setItem(key, stringValue);
    console.log(`Salvo ${key}: ${stringValue}`);
    return true;
  } catch (err) {
    console.warn(`Erro ao acessar localStorage.setItem (${key}):`, err);
    return false;
  }
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
    console.log(`Removido ${key}`);
    return true;
  } catch (err) {
    console.warn(`Erro ao acessar localStorage.removeItem (${key}):`, err);
    return false;
  }
}

// Resetar localStorage corrompido
function resetCorruptedStorage() {
  const keys = ['totalCredits_', 'autoStakeBalance_', 'manualStakeBalance_'];
  for (let key in localStorage) {
    if (keys.some(prefix => key.startsWith(prefix))) {
      const value = localStorage.getItem(key);
      if (value === 'NaN' || value === 'undefined' || value === null || isNaN(parseFloat(value))) {
        console.warn(`Resetando chave corrompida: ${key} = ${value}`);
        localStorage.setItem(key, '0');
      }
    }
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
  } else {
    console.warn("Elementos de notificação não encontrados.");
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
    walletButton.innerHTML = walletAddress
      ? '<span class="button-text">Disconnect Wallet</span>'
      : '<span class="button-text">Connect Solana Wallet</span>';
    walletButton.onclick = null;
    walletButton.removeEventListener('click', connectWallet);
    walletButton.removeEventListener('click', disconnectWallet);
    walletButton.removeEventListener('touchstart', connectWallet);
    walletButton.removeEventListener('touchstart', disconnectWallet);
    walletButton.addEventListener('click', walletAddress ? disconnectWallet : connectWallet);
    walletButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      (walletAddress ? disconnectWallet : connectWallet)();
    });
    walletAddressElement.textContent = walletAddress
      ? `Connected Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : '';
    console.log("UI da carteira atualizada:", walletAddress ? `Conectada: ${walletAddress}` : "Desconectada");
  } else {
    console.error("Elementos wallet-button ou wallet-address não encontrados.");
    showNotification("Erro: Elementos da UI da carteira não encontrados.", 'error');
  }
}

// Calcular rendimento de 200% ao ano (~0.02283% por hora, composto)
function calculateStakeInterest(balance, startDate) {
  balance = parseFloat(balance) || 0;
  if (!startDate || balance <= 0) {
    console.log("Sem data de início ou saldo zerado:", { balance, startDate });
    return balance;
  }
  const now = new Date();
  const hoursPassed = (now - new Date(startDate)) / (1000 * 60 * 60);
  const hourlyRate = 0.0002283; // 200% ao ano ÷ (365 * 24)
  const newBalance = balance * Math.pow(1 + hourlyRate, hoursPassed);
  console.log("Juros calculados:", { balance, hoursPassed, newBalance });
  return isNaN(newBalance) ? balance : newBalance;
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
    console.log("Nenhuma carteira conectada. Saldos zerados.");
    return;
  }

  // Carregar saldos do localStorage
  totalCredits = parseFloat(safeLocalStorageGet(`totalCredits_${walletAddress}`)) || 0;
  if (isNaN(totalCredits) || totalCredits < 0) {
    console.warn(`totalCredits_${walletAddress} inválido. Usando 0.`);
    totalCredits = 0;
    safeLocalStorageSet(`totalCredits_${walletAddress}`, '0');
  }
  autoStakeBalance = parseFloat(safeLocalStorageGet(`autoStakeBalance_${walletAddress}`)) || 0;
  if (isNaN(autoStakeBalance) || autoStakeBalance < 0) {
    console.warn(`autoStakeBalance_${walletAddress} inválido. Usando 0.`);
    autoStakeBalance = 0;
    safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, '0');
  }
  manualStakeBalance = parseFloat(safeLocalStorageGet(`manualStakeBalance_${walletAddress}`)) || 0;
  if (isNaN(manualStakeBalance) || manualStakeBalance < 0) {
    console.warn(`manualStakeBalance_${walletAddress} inválido. Usando 0.`);
    manualStakeBalance = 0;
    safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, '0');
  }
  autoStakeStartDate = safeLocalStorageGet(`autoStakeStartDate_${walletAddress}`);
  manualStakeStartDate = safeLocalStorageGet(`manualStakeStartDate_${walletAddress}`);
  console.log("Saldos carregados:", { totalCredits, autoStakeBalance, manualStakeBalance, autoStakeStartDate, manualStakeStartDate });

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
    const loaded = await loadSolanaWeb3();
    if (!loaded || typeof SolanaWeb3 === 'undefined') {
      console.error("SolanaWeb3 não está definido.");
      showNotification("Erro: Biblioteca Solana não carregada.", 'error');
      solBalanceElement.textContent = 'Erro';
    } else {
      try {
        const connection = new SolanaWeb3.Connection(SolanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');
        const publicKey = new SolanaWeb3.PublicKey(walletAddress);
        const balance = await connection.getBalance(publicKey, 'confirmed');
        const solBalance = balance / SolanaWeb3.LAMPORTS_PER_SOL;
        solBalanceElement.textContent = solBalance.toFixed(4);
        console.log("Saldo SOL atualizado:", solBalance);
      } catch (err) {
        console.error("Erro ao consultar saldo SOL:", err);
        showNotification(`Erro ao consultar saldo SOL: ${err.message}.`, 'error');
        solBalanceElement.textContent = 'Erro';
      }
    }
  }

  // Atualizar saldos de stake
  const autoStakeBalanceElement = document.getElementById('auto-stake-balance');
  const manualStakeBalanceElement = document.getElementById('manual-stake-balance');
  const autoStakeStatusElement = document.getElementById('auto-stake-status');
  const transferAutoStakeButton = document.getElementById('transfer-auto-stake');

  if (autoStakeBalanceElement && autoStakeStatusElement && transferAutoStakeButton) {
    autoStakeBalance = calculateStakeInterest(autoStakeBalance, autoStakeStartDate);
    autoStakeBalance = isNaN(autoStakeBalance) || autoStakeBalance < 0 ? 0 : autoStakeBalance;
    autoStakeBalanceElement.textContent = autoStakeBalance.toFixed(2);
    safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, autoStakeBalance.toString());
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
    manualStakeBalance = isNaN(manualStakeBalance) || manualStakeBalance < 0 ? 0 : manualStakeBalance;
    manualStakeBalanceElement.textContent = manualStakeBalance.toFixed(2);
    safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, manualStakeBalance.toString());
    safeLocalStorageSet(`manualStakeStartDate_${walletAddress}`, manualStakeStartDate);
    console.log("Stake Manual atualizado:", manualStakeBalance);
  }
}

// Atualizar rendimentos a cada hora
function updateStakeInterestHourly() {
  if (walletAddress) {
    updateWalletBalances();
    console.log("Rendimentos de stake atualizados.");
  }
}
setInterval(updateStakeInterestHourly, 3600000);

// Iniciar stake manual
function startManualStake() {
  if (!walletAddress) {
    showNotification('Por favor, conecte sua carteira primeiro.', 'error');
    return;
  }

  const amount = prompt("Quantos DET deseja colocar em stake manual? (Disponível: " + totalCredits.toFixed(2) + " DET)");
  const parsedAmount = parseFloat(amount) || 0;

  if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > totalCredits) {
    showNotification('Quantidade inválida ou insuficiente.', 'error');
    return;
  }

  totalCredits -= parsedAmount;
  totalCredits = isNaN(totalCredits) || totalCredits < 0 ? 0 : totalCredits;
  manualStakeBalance += parsedAmount;
  manualStakeBalance = isNaN(manualStakeBalance) || manualStakeBalance < 0 ? 0 : manualStakeBalance;
  if (!manualStakeStartDate) {
    manualStakeStartDate = new Date().toISOString();
    safeLocalStorageSet(`manualStakeStartDate_${walletAddress}`, manualStakeStartDate);
  }

  safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits.toString());
  safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, manualStakeBalance.toString());
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
  totalCredits = isNaN(totalCredits) || totalCredits < 0 ? 0 : totalCredits;
  manualStakeBalance = 0;
  manualStakeStartDate = null;
  safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits.toString());
  safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, manualStakeBalance.toString());
  safeLocalStorageRemove(`manualStakeStartDate_${walletAddress}`);
  updateWalletBalances();
  showNotification('Stake manual encerrado. Tokens transferidos para saldo disponível.', 'success');
}

// Transferir stake automático
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
  totalCredits = isNaN(totalCredits) || totalCredits < 0 ? 0 : totalCredits;
  autoStakeBalance = 0;
  autoStakeStartDate = null;
  safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits.toString());
  safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, autoStakeBalance.toString());
  safeLocalStorageRemove(`autoStakeStartDate_${walletAddress}`);
  updateWalletBalances();
  showNotification('Stake automático transferido para saldo disponível.', 'success');
}

// Função para atualizar saldos
function refreshWalletBalances() {
  updateWalletBalances();
  showNotification('Saldos atualizados.', 'success');
}

// Detectar dispositivo móvel
function isMobileDevice() {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|SamsungBrowser|UCBrowser|Mobile|Phantom|CriOS/i.test(userAgent);
  console.log("Dispositivo detectado:", isMobile ? "Mobile" : "Desktop", "UserAgent:", userAgent);
  return isMobile;
}

// Conectar carteira Phantom
let lastConnectAttempt = 0;
async function connectWallet() {
  const now = Date.now();
  if (now - lastConnectAttempt < 2000) {
    console.warn("Tentativa de conexão muito rápida.");
    showNotification("Aguarde alguns segundos antes de tentar novamente.", 'error');
    return;
  }
  lastConnectAttempt = now;

  if (isMobileDevice()) {
    const redirectUrl = encodeURIComponent(window.location.href);
    const deepLink = `https://phantom.app/ul/v1/connect?app_url=${redirectUrl}&cluster=mainnet-beta`;
    console.log("Redirecionando para deep link:", deepLink);
    showNotification("Abrindo aplicativo Phantom. Certifique-se de que está instalado e configurado em Mainnet.", 'info');
    window.location.href = deepLink;

    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        console.warn("Deep link não abriu o Phantom. Redirecionando para loja de aplicativos.");
        showNotification("Phantom não detectado. Instale-o na loja de aplicativos.", 'error');
        const storeUrl = /iPhone|iPad|iPod|CriOS/i.test(navigator.userAgent)
          ? 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977'
          : 'https://play.google.com/store/apps/details?id=app.phantom';
        window.location.href = storeUrl;
      }
    }, 1000);
    return;
  }

  // Desktop
  if (window.solana && window.solana.isPhantom) {
    try {
      console.log("Phantom detectado. Tentando conexão direta...");
      const resp = await window.solana.connect();
      console.log("Conexão bem-sucedida:", resp.publicKey.toString());

      walletAddress = resp.publicKey.toString();
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        throw new Error("Endereço de carteira inválido.");
      }
      safeLocalStorageSet('walletAddress', walletAddress);
      await initializeWalletData();
      updateWalletUI();
      updateMissionsUI();
      updateWalletBalances();
      showNotification(`Carteira conectada: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, 'success');
      navigateTo('missions');
      if (!completedMissions.includes(1)) {
        completeMission(1);
      }
      return;
    } catch (err) {
      console.error("Erro na conexão direta:", err);
      showNotification(`Erro ao conectar carteira: ${err.message}.`, 'error');
    }
  }

  console.error("Nenhuma carteira Phantom detectada no desktop.");
  showNotification("Instale a extensão Phantom: https://phantom.app/", 'error');
  window.open('https://phantom.app/', '_blank');
}

// Inicializar dados da carteira
async function initializeWalletData() {
  resetCorruptedStorage();
  totalCredits = parseFloat(safeLocalStorageGet(`totalCredits_${walletAddress}`)) || 0;
  if (isNaN(totalCredits) || totalCredits < 0) {
    console.warn(`totalCredits_${walletAddress} inválido. Usando 0.`);
    totalCredits = 0;
    safeLocalStorageSet(`totalCredits_${walletAddress}`, '0');
  }
  completedMissions = JSON.parse(safeLocalStorageGet(`completedMissions_${walletAddress}`) || '[]') || [];
  autoStakeBalance = parseFloat(safeLocalStorageGet(`autoStakeBalance_${walletAddress}`)) || 0;
  if (isNaN(autoStakeBalance) || autoStakeBalance < 0) {
    console.warn(`autoStakeBalance_${walletAddress} inválido. Usando 0.`);
    autoStakeBalance = 0;
    safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, '0');
  }
  manualStakeBalance = parseFloat(safeLocalStorageGet(`manualStakeBalance_${walletAddress}`)) || 0;
  if (isNaN(manualStakeBalance) || manualStakeBalance < 0) {
    console.warn(`manualStakeBalance_${walletAddress} inválido. Usando 0.`);
    manualStakeBalance = 0;
    safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, '0');
  }
  autoStakeStartDate = safeLocalStorageGet(`autoStakeStartDate_${walletAddress}`);
  manualStakeStartDate = safeLocalStorageGet(`manualStakeStartDate_${walletAddress}`);
  console.log("Saldos carregados:", { totalCredits, autoStakeBalance, manualStakeBalance, autoStakeStartDate, manualStakeStartDate });
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

  if (walletAddress) {
    safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits.toString());
    safeLocalStorageSet(`completedMissions_${walletAddress}`, JSON.stringify(completedMissions));
    safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, autoStakeBalance.toString());
    safeLocalStorageSet(`manualStakeBalance_${walletAddress}`, manualStakeBalance.toString());
    if (autoStakeStartDate) safeLocalStorageSet(`autoStakeStartDate_${walletAddress}`, autoStakeStartDate);
    if (manualStakeStartDate) safeLocalStorageSet(`manualStakeStartDate_${walletAddress}`, manualStakeStartDate);
    console.log("Dados preservados para carteira:", walletAddress);
  }

  walletAddress = null;
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
    const transform = getComputedStyle(menu).transform;
    console.log("Menu toggled:", menu.classList.contains('active') ? "aberto" : "fechado", "Transform:", transform);
  } else {
    console.error("Elemento #menu não encontrado.");
    showNotification("Erro: Menu não encontrado.", 'error');
  }
}

// Navegar entre páginas
function navigateTo(page) {
  const protectedPages = ['missions', 'wallet', 'presale', 'whitepaper', 'stake', 'spend-credits'];
  if (protectedPages.includes(page) && !walletAddress) {
    console.warn("Tentativa de acessar página protegida sem carteira:", page);
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
  totalCredits = isNaN(totalCredits) || totalCredits < 0 ? 0 : totalCredits;
  autoStakeBalance += autoStakeAmount;
  autoStakeBalance = isNaN(autoStakeBalance) || autoStakeBalance < 0 ? 0 : autoStakeBalance;
  if (!autoStakeStartDate) {
    autoStakeStartDate = new Date().toISOString();
    safeLocalStorageSet(`autoStakeStartDate_${walletAddress}`, autoStakeStartDate);
  }
  completedMissions.push(missionId);

  safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits.toString());
  safeLocalStorageSet(`completedMissions_${walletAddress}`, JSON.stringify(completedMissions));
  safeLocalStorageSet(`autoStakeBalance_${walletAddress}`, autoStakeBalance.toString());

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
    safeLocalStorageSet(`totalCredits_${walletAddress}`, totalCredits.toString());
    safeLocalStorageSet(`completedMissions_${walletAddress}`, JSON.stringify(completedMissions));
    safeLocalStorageSet(`lastReset_${walletAddress}`, estTime.getDate().toString());
    updateMissionsUI();
    updateWalletBalances();
    console.log("Missões resetadas às 6h (Eastern Time).");
  }
}

setInterval(resetMissions, 60000);

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  console.log("Inicializando site DetHabits...");
  await loadSolanaWeb3();
  resetCorruptedStorage();

  walletAddress = safeLocalStorageGet('walletAddress');
  if (walletAddress && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    console.warn("Endereço de carteira inválido:", walletAddress);
    walletAddress = null;
    safeLocalStorageRemove('walletAddress');
  }

  if (walletAddress) {
    await initializeWalletData();
  }

  updateWalletUI();
  updateMissionsUI();
  updateWalletBalances();

  // Registrar eventos do menu
  const menuButton = document.querySelector('[data-menu-button]');
  if (menuButton) {
    menuButton.removeEventListener('click', toggleMenu);
    menuButton.removeEventListener('touchstart', toggleMenu);
    menuButton.addEventListener('click', toggleMenu);
    menuButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      toggleMenu();
    });
    console.log("Evento registrado para botão do menu.");
  } else {
    console.error("Botão do menu (#menu-toggle-button) não encontrado.");
    showNotification("Erro: Botão do menu não encontrado.", 'error');
  }

  // Registrar eventos dos links do menu
  const menuItems = document.querySelectorAll('.menu-item[data-nav]');
  menuItems.forEach(item => {
    const page = item.getAttribute('data-nav');
    item.removeEventListener('click', navigateTo);
    item.removeEventListener('touchstart', navigateTo);
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(page);
    });
    item.addEventListener('touchstart', (e) => {
      e.preventDefault();
      navigateTo(page);
    });
  });

  if (window.solana && window.solana.isPhantom) {
    console.log("Phantom Wallet detectada.");
    window.solana.on('connect', () => {
      console.log("Evento de conexão disparado.");
      connectWallet();
    });
  } else {
    console.warn("Phantom Wallet não detectada na inicialização.");
  }
});