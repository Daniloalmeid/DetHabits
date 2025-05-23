let walletAddress = null;

// Verificar acesso ao localStorage
function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// Atualizar UI da carteira
function updateWalletUI() {
  const walletButton = document.getElementById('wallet-button');
  const walletAddressElement = document.getElementById('wallet-address');
  if (walletAddress) {
    walletButton.innerHTML = '<span class="button-text">Disconnect Wallet</span>';
    walletButton.onclick = disconnectWallet;
    walletAddressElement.textContent = `Connected Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  } else {
    walletButton.innerHTML = '<span class="button-text">Connect Solana Wallet</span>';
    walletButton.onclick = connectWallet;
    walletAddressElement.textContent = '';
  }
}

// Conectar carteira Phantom
async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    alert("Phantom wallet not found. Please install it.");
    return;
  }

  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    safeLocalStorageSet('walletAddress', walletAddress);
    updateWalletUI();
    alert(`Wallet connected: ${walletAddress}`);
    navigateTo('missions');
  } catch (err) {
    console.error("Erro ao conectar Phantom:", err.message);
    alert("Erro ao conectar carteira: " + err.message);
  }
}

// Desconectar
async function disconnectWallet() {
  try {
    await window.solana.disconnect();
  } catch (err) {
    console.warn("Erro ao desconectar:", err.message);
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
  menu.classList.toggle('active');
}

// Navegar entre páginas
function navigateTo(page) {
  const pages = document.querySelectorAll('.page');
  const protectedPages = ['missions', 'wallet', 'presale', 'stake', 'spend-credits'];
  if (protectedPages.includes(page) && !walletAddress) {
    alert('Please connect your wallet first.');
    return;
  }
  pages.forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(page);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  toggleMenu();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  walletAddress = safeLocalStorageGet('walletAddress');
  updateWalletUI();
});
