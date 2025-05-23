let walletAddress = null;

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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log("Inicializando site DetHabits...");
  walletAddress = safeLocalStorageGet('walletAddress');
  updateWalletUI();
});