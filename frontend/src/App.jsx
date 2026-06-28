import "./i18n";
import { RouterProvider } from "react-router";
import { Router } from "./router";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useMemo } from "react";
import { RPC_URL } from "./env-variables";
import { WalletAddressProvider } from "./context/WalletContext";
import { Toaster } from "react-hot-toast";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter, TorusWalletAdapter } from "@solana/wallet-adapter-wallets";


function App() {
  
  const endpoint = RPC_URL;

  // We keep Solflare and Torus here explicitly.
  // We DO NOT explicitly add `new PhantomWalletAdapter()` because Phantom is now a "Standard Wallet". 
  // It will be auto-detected by the browser and handled naturally, which fixes the Android deep-linking.
  const wallets = useMemo(
    () => [
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [] 
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletAddressProvider>
            <RouterProvider router={Router} />  
             <Toaster />
          </WalletAddressProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
