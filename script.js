const { WalletAdapterNetwork } = window.SolanaWalletAdapterBase;
const { PhantomWalletAdapter } = window.SolanaWalletAdapterWallets;
const network = WalletAdapterNetwork.Mainnet;
const wallet = new PhantomWalletAdapter();

let walletAddress = null;

document.addEventListener('DOMContentLoaded', async () => {
  walletAddress = localStorage.getItem('walletAddress');
  updateWalletUI();
  if (walletAddress) {
    try {
      await wallet.connect();
      walletAddress = wallet.publicKey.toString();
      localStorage.setItem('walletAddress', walletAddress);
      updateWalletUI();
    } catch (err) {
      console.error('Erro ao reconectar carteira:', err.message);
      localStorage.removeItem('walletAddress');
      walletAddress = null;
      updateWalletUI();
    }
  }
});

function toggleMenu() {
  const menu = document.getElementById('menu');
  menu.classList.toggle('active');
}

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

async function connectWallet() {
  try {
    await wallet.connect();
    if (wallet.publicKey) {
      walletAddress = wallet.publicKey.toString();
      localStorage.setItem('walletAddress', walletAddress);
      updateWalletUI();
      alert(`Wallet connected: ${walletAddress}`);
      navigateTo('missions');
    } else {
      throw new Error('No public key returned');
    }
  } catch (err) {
    console.error('Erro ao conectar carteira:', err.message);
    alert('Failed to connect wallet. Ensure Phantom is installed and configured for Mainnet.');
  }
}

async function disconnectWallet() {
  try {
    await wallet.disconnect();
    localStorage.removeItem('walletAddress');
    walletAddress = null;
    updateWalletUI();
    alert('Wallet disconnected');
    navigateTo('home');
  } catch (err) {
    console.error('Erro ao desconectar carteira:', err.message);
    alert('Failed to disconnect wallet');
  }
}

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