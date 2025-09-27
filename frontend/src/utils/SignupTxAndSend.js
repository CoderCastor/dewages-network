import { useWallet } from "@solana/wallet-adapter-react";


export async function SignAndSend() {

    const { publicKey , signMessage} = useWallet();
        if (!publicKey) {
            return;
        }
        const message = new TextEncoder().encode("Sign into mechanical turks");
        const signature = await signMessage?.(message);
        console.log(signature)
        console.log(publicKey)
        const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
            signature,
            publicKey: publicKey?.toString()
        });

        localStorage.setItem("token", response.data.token);
    }