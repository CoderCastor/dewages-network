import React, { useEffect, useState, useRef } from "react";
import { ButtonStateful } from "./stateful-button";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { CircleOff } from "lucide-react";
import { useWalletInformation } from "@/context/WalletContext";
import axios from "axios";
import { BACKEND_URL } from "@/env-variables";
import { toast } from "react-hot-toast";
import { Button } from "../ui/button";

export function StatefulButton() {
  const { setVisible } = useWalletModal();
  const { publicKey, disconnect, connected, signMessage } = useWallet();
  const { setWalletAddress,setIsWalletVerified } = useWalletInformation();
  const [isVerified, setIsVerified] = useState("not-verified");

  const [pubkey, setPubkey] = useState("");
  const resolverRef = useRef(null);

  useEffect(() => {
    if (connected && publicKey) {
      const key = publicKey.toBase58();
      setPubkey(key);
      setWalletAddress(key);
      if (resolverRef.current) {
        resolverRef.current();
        resolverRef.current = null;
      }
      setIsVerified("not-verified")
    } else {
      setPubkey("");
      setWalletAddress("");
    }
  }, [connected, publicKey,pubkey]);

  const handleClick2 = () => {
    
    return new Promise((resolve) => {
      if (connected && publicKey) {
        setPubkey(publicKey.toBase58());
        resolve();
      } else {
        resolverRef.current = resolve;
        setVisible(true);
      }
    });
  };

  const handleClick = () => {
    if(!pubkey){
      toast.error("Please connect your wallet first")
      return 
    }
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const message = new TextEncoder().encode(
            "Signup into Dewages Network"
          );
          const signatureRaw = await signMessage?.(message);
          // Convert Uint8Array → plain Array so JSON serialization preserves byte values
          const signature = Array.from(signatureRaw);

          const response = await axios.post(
            `${BACKEND_URL}/worker/walletverify`,
            {
              signature,
              publicKey: publicKey.toString(),
            }
          );

          if (response.data.code === 403) {
            toast.error("Wallet already exists with account", {
              description: "Please Sign in",
              className: "bg-gray-900 text-white border border-gray-700",
            });
            setIsVerified("failed");
            return resolve("Wallet already exists");
          }

          localStorage.setItem("token", response.data.token);
          if (response.data.token) {
            setIsWalletVerified(true)
            setIsVerified("verified");
          }
          resolve(response.data.token); // ✅ resolve with token
        } catch (err) {
          reject(err);
        }
      })();
    });
  };

  return (
    <div className="flex gap-5 justify-center items-center">
      {/* disconnect button only if pubkey exists */}
      {pubkey && (
        <button
          onClick={() => {
            disconnect();
            setPubkey("");
            setWalletAddress("");
            setIsWalletVerified(false)
          }}
          className="size-10 cursor-pointer hover:bg-red-500 hover:scale-85 hover:text-zinc-200 transition-all duration-200 text-red-500 bg-neutral-100 rounded-full flex justify-center items-center"
        >
          <CircleOff size={13} />
        </button>
      )}

      {/* wallet connect button - ALWAYS visible */}

      {/* <Button
        className={`h-10 flex justify-center bg-purple-500 ${
          pubkey ? "bg-emerald-500" : "bg-purple-500"
        }`}
        onClick={handleClick2}
      >
        {pubkey ? "Wallet Connected" : "Connect your wallet"}
      </Button> */}
      <Button
        onClick={handleClick2}
        className={`flex min-w-[120px] text-md cursor-pointer items-center justify-center gap-2 rounded-full bg-purple-500 px-4 py-5 font-medium hover:bg-purple-600 text-white ring-offset-2 transition duration-200 hover:ring-2 hover:ring-purple-500 dark:ring-offset-black ${
          pubkey
            ? "bg-emerald-500 hover:bg-emerald-700 hover:ring-0 transition-all duration-500"
            : "bg-purple-500"
        }`}
      >
        {pubkey ? "Wallet Connected" : "Connect your wallet"}
      </Button>

      <ButtonStateful
        className={` ${isVerified === "not-verified" && "bg-purple-500"} ${
          isVerified === "verified" && "bg-emerald-500"
        } ${isVerified === "failed" && "bg-red-500"}`}
        onClick={handleClick}
        disable={isVerified == "verified"}
      >
        {isVerified === "not-verified" && "Verify your wallet"}
        {isVerified === "verified" && "Wallet verified"}
        {isVerified === "failed" && "Failed to verify"}
      </ButtonStateful>
    </div>
  );
}
