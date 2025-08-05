const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const walletAddressDisplay = document.getElementById('walletAddress');
const iosMessage = document.getElementById('iosMessage');
const openInPhantom = document.getElementById('openInPhantom');

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
}

function isAndroid() {
  return /android/i.test(navigator.userAgent.toLowerCase());
}

async function connectWallet() {
  const isPhantomInstalled = window.solana && window.solana.isPhantom;

  if (isPhantomInstalled) {
    try {
      const resp = await window.solana.connect();
      const walletAddress = resp.publicKey.toString();
      walletAddressDisplay.innerText = 'Carteira conectada: ' + walletAddress;
      connectButton.style.display = 'none';
      disconnectButton.style.display = 'inline-block';
    } catch (err) {
      console.error('Erro ao conectar:', err);
      walletAddressDisplay.innerText = 'Erro ao conectar à carteira.';
    }
  } else if (isAndroid()) {
    const dappUrl = encodeURIComponent(window.location.href);
    const phantomDeepLink = `https://phantom.app/ul/v1/connect?app_url=${dappUrl}&redirect_link=${dappUrl}`;
    window.location.replace(phantomDeepLink);
  } else if (isIOS()) {
    iosMessage.style.display = 'block';
  } else {
    alert("Por favor, instale a extensão Phantom no seu navegador.");
  }
}

async function disconnectWallet() {
  if (window.solana && window.solana.isPhantom) {
    try {
      await window.solana.disconnect();
      walletAddressDisplay.innerText = 'Carteira desconectada.';
      connectButton.style.display = 'inline-block';
      disconnectButton.style.display = 'none';
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    }
  }
}

window.addEventListener('load', async () => {
  if (window.solana && window.solana.isPhantom) {
    try {
      const resp = await window.solana.connect({ onlyIfTrusted: true });
      if (resp.publicKey) {
        const walletAddress = resp.publicKey.toString();
        walletAddressDisplay.innerText = 'Carteira conectada: ' + walletAddress;
        connectButton.style.display = 'none';
        disconnectButton.style.display = 'inline-block';
      }
    } catch (err) {
      console.log('Conexão automática recusada.');
    }
  }

  // Link especial para iOS abrir no app da Phantom
  if (isIOS()) {
    const currentUrl = encodeURIComponent(window.location.href);
    const phantomBrowseUrl = `https://phantom.app/ul/browse/${currentUrl}`;
    openInPhantom.href = phantomBrowseUrl;
  }
});

connectButton.addEventListener('click', connectWallet);
disconnectButton.addEventListener('click', disconnectWallet);
