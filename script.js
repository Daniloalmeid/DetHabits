let wallet = null;
let walletAddress = null;

// Verificar se Phantom está disponível
function checkPhantom() {
  if (!window.solana || !window.solana.isPhantom) {
    console.error("Phantom não detectado. Verifique se a extensão está instalada.");
    return false;
  }
  console.log("Phantom detectado:", window.solana);
  return true;
}

// Inicializar wallet
function initializeWallet() {
  if (wallet) {
    console.log("Wallet já inicializado:", wallet);
    return true;
  }
  try {
    if (!window.SolanaWalletAdapterBase || !window.SolanaWalletAdapterWallets) {
      throw new Error("Bibliotecas Solana não carregadas.");
    }
    const { WalletAdapterNetwork } = window.SolanaWalletAdapterBase;
    const { PhantomWalletAdapter } = window.SolanaWalletAdapterWallets;
    wallet = new PhantomWalletAdapter();
    console.log("Wallet inicializado com sucesso:", wallet);
    return true;
  } catch (err) {
    console.error("Erro ao inicializar wallet:", err.message, err);
    return false;
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log("Inicializando site DetHabits...");
  // Carregar endereço da carteira do localStorage
  walletAddress = localStorage.getItem('walletAddress');
  updateWalletUI();
  console.log("Endereço inicial do localStorage:", walletAddress || "Nenhum");
});

// Atualizar UI da carteira
function updateWalletUI() {
  const walletButton = document.getElementById('wallet-button');
  const walletAddressElement = document.getElementById('wallet-address');
  if (walletAddress) {
    walletButton.innerHTML = '<span class="button-text">Disconnect Wallet</span>';
    walletButton.onclick = disconnectWallet;
    walletAddressElement.textContent = `Connected Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    console.log("UI atualizada: Carteira conectada", walletAddress);
  } else {
    walletButton.innerHTML = '<span class="button-text">Connect Solana Wallet</span>';
    walletButton.onclick = connectWallet;
    walletAddressElement.textContent = '';
    console.log("UI atualizada: Carteira desconectada");
  }
}

// Conectar carteira
async function connectWallet() {
  if (!initializeWallet()) {
    alert("Wallet not initialized. Please check your internet connection and refresh the page.");
    console.error("Falha ao inicializar wallet para conexão.");
    return;
  }
  if (!checkPhantom()) {
    alert("Phantom not found. Install the Phantom extension and configure for Mainnet.");
    return;
  }
  try {
    console.log("Tentando conectar carteira...");
    await wallet.connect();
    if (wallet.publicKey) {
      walletAddress = wallet.publicKey.toString();
      localStorage.setItem('walletAddress', walletAddress);
      updateWalletUI();
      alert(`Wallet connected: ${walletAddress}`);
      console.log("Carteira conectada com sucesso:", walletAddress);
      navigateTo('missions');
    } else {
      throw new Error('No public key returned');
    }
  } catch (err) {
    console.error('Erro ao conectar carteira:', err.message, err);
    alert('Failed to connect wallet: ' + err.message + '. Ensure Phantom is installed and configured for Mainnet.');
  }
}

// Desconectar carteira
async function disconnectWallet() {
  if (!wallet) {
    alert("Wallet not initialized. Please refresh the page.");
    console.error("Wallet não inicializado para desconexão.");
    return;
  }
  try {
    console.log("Desconectando carteira...");
    await wallet.disconnect();
    localStorage.removeItem('walletAddress');
    walletAddress = null;
    updateWalletUI();
    alert('Wallet disconnected');
    console.log("Carteira desconectada com sucesso");
    navigateTo('home');
  } catch (err) {
    console.error('Erro ao desconectar carteira:', err.message, err);
    alert('Failed to disconnect wallet: ' + err.message);
  }
}

// Alternar menu
function toggleMenu() {
  const menu = document.getElementById('menu');
  menu.classList.toggle('active');
  console.log("Menu toggled:", menu.classList.contains('active') ? "Aberto" : "Fechado");
}

// Navegação
function navigateTo(page) {
  const pages = document.querySelectorAll('.page');
  const protectedPages = ['missions', 'wallet', 'presale', 'stake', 'spend-credits'];
  if (protectedPages.includes(page) && !walletAddress) {
    alert('Please connect your wallet first.');
    console.log("Tentativa de acessar página protegida sem carteira:", page);
    return;
  }
  pages.forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(page);
  if (targetPage) {
    targetPage.classList.add('active');
    console.log("Navegado para página:", page);
  }
  toggleMenu();
}