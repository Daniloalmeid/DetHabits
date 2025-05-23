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
  if (!window.solana || !window.solana.isPhantom) {
    console.error("Phantom wallet não encontrado.");
    alert("Phantom wallet not found. Please install it.");
    return;
  }

  try {
    console.log("Tentando conectar ao Phantom...");
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    console.log("Carteira conectada:", walletAddress);
    safeLocalStorageSet('walletAddress', walletAddress);
    updateWalletUI();
    alert(`Wallet connected: ${walletAddress}`);
    navigateTo('missions');
    // Completar Missão 1 automaticamente ao conectar
    if (!completedMissions.includes(1)) {
      completeMission(1);
    }
  } catch (err) {
    console.error("Erro ao conectar Phantom:", err);
    alert("Erro ao conectar carteira: " + err.message);
  }
}

// Desconectar
async function disconnectWallet() {
  try {
    await window.solana.disconnect();
    console.log("Carteira desconectada.");
  } catch (err) {
    console.warn("Erro ao desconectar:", err);
  }

  walletAddress = null;
  safeLocalStorageRemove('walletAddress');
  updateWalletUI();
  alert("Wallet disconnected");
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
    alert('Please connect your wallet first.');
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
    alert('Please connect your wallet first.');
    return;
  }

  if (completedMissions.includes(missionId)) {
    alert('Esta missão já foi completada hoje.');
    return;
  }

  let reward = 0;
  if (missionId === 1) reward = 10; // Conectar carteira
  else if (missionId === 2 || missionId === 3) reward = 5; // Seguir X, Telegram

  totalCredits += reward;
  completedMissions.push(missionId);

  safeLocalStorageSet('totalCredits', totalCredits);
  safeLocalStorageSet('completedMissions', JSON.stringify(completedMissions));

  updateMissionsUI();
  alert(`Missão ${missionId} completada! Você ganhou ${reward} Credits.`);

  // Integração futura com Solana para tokens DET
  // if (reward > 0) transferDET(walletAddress, reward);
}

function resetMissions() {
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  if (estTime.getHours() === 6 && estTime.getMinutes() === 0) {
    totalCredits = 0;
    completedMissions = [];
    safeLocalStorageSet('totalCredits', totalCredits);
    safeLocalStorageSet('completedMissions', JSON.stringify(completedMissions));
    updateMissionsUI();
    console.log("Missões resetadas às 6h (Eastern Time).");
  }
}

// Verifica reset a cada minuto
setInterval(resetMissions, 60000);

// Atualiza UI ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  console.log("Inicializando site DetHabits...");
  walletAddress = safeLocalStorageGet('walletAddress');
  totalCredits = parseInt(safeLocalStorageGet('totalCredits') || '0');
  completedMissions = JSON.parse(safeLocalStorageGet('completedMissions') || '[]');
  updateWalletUI();
  updateMissionsUI();
});

// Integração com Solana (exemplo comentado para futura implementação)
async function transferDET(recipient, amount) {
  // Exemplo de código para transferência de tokens DET
  /*
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const tokenMint = new PublicKey("ENDEREÇO_DO_TOKEN_DET");
  const recipientAccount = new PublicKey(recipient);
  const transaction = new Transaction().add(
    Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      fromTokenAccount,
      toTokenAccount,
      walletAddress,
      [],
      amount * Math.pow(10, 9) // Ajuste para decimais do token
    )
  );
  await connection.sendTransaction(transaction, [window.solana]);
  */
}