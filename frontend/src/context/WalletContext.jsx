import React, { createContext, useContext, useState } from "react";

const WalletContext = createContext(undefined);

export const WalletAddressProvider = ({ children }) => {
  const [WalletAddress, setWalletAddress] = useState(null);
  const [isWalletVerified, setIsWalletVerified] = useState(false);

  return (
    <WalletContext.Provider value={{ WalletAddress, setWalletAddress,isWalletVerified, setIsWalletVerified }}>
      {children}
    </WalletContext.Provider>
  );
};

// custom hook for using the wallet context
// eslint-disable-next-line react-refresh/only-export-components
export const useWalletInformation = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return context;
};
