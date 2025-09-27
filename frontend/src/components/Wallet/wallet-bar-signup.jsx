import { BACKEND_URL } from "@/env-variables";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
// import axios from "axios";

export const WalletBarWorkerSignup = () => {
  const { publicKey, signMessage } = useWallet();

  async function signAndSend() {
    if (!publicKey) {
      return;
    }
    const message = new TextEncoder().encode("Sign up into Dewages Network");
    const signature = await signMessage?.(message);
    console.log(signature);
    console.log(publicKey);
    // const response = await axios.post(`${BACKEND_URL}/v1/worker/signup`, {
    //     signature,
    //     publicKey: publicKey?.toString()
    // });

    // localStorage.setItem("token", response.data.token);
  }

  return (
    <div className="">
      {publicKey ? (
        <WalletDisconnectButton />
      ) : (
        <WalletMultiButton
          style={{
            backgroundColor: "#0325a1", // dark like shadcn
            color: "#fff",
            fontSize: "14px",
            fontWeight: 500,
            padding: "0rem 1.2rem",
            borderRadius: "2rem", // rounded-md
            border: "1px solid transparent",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
          }}
        />
      )}
    </div>
  );
};
