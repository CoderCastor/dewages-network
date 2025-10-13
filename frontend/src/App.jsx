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


function App() {
  
  const endpoint = RPC_URL;

  const wallets = useMemo(() => [], [WalletAdapterNetwork.Devnet]);

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
