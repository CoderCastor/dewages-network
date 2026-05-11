import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import toast from 'react-hot-toast';
import { PROGRAM_ID } from '../env-variables';
import IDL from '../idl/employment_platform.json' with { type: 'json' };

// Program ID as PublicKey from env-variables
const PROGRAM_ID_KEY = new PublicKey(PROGRAM_ID);



export default function ProfileTestPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [pdaAddress, setPdaAddress] = useState('');
  const [profileData, setProfileData] = useState(null);

  // Sample test data
  const sampleData = {
    name: 'Rajesh Kumar',
    phone: '+91-9876543210',
    location: 'Mumbai, Maharashtra',
    userType: 'Worker'
  };

  // Get Anchor provider
  const getProvider = () => {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );
    return provider;
  };

  // Create User Profile
  const createProfile = async () => {
    if (!wallet.publicKey) {
      toast.error('Please connect your wallet first!');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating profile...');

    try {
      const provider = getProvider();
      const program = new Program(IDL, PROGRAM_ID_KEY, provider);

      // Derive PDA for user profile
      const [userProfilePDA, bump] = await PublicKey.findProgramAddress(
        [Buffer.from('user_profile'), wallet.publicKey.toBuffer()],
        PROGRAM_ID_KEY
      );

      console.log('Generated PDA:', userProfilePDA.toString());
      console.log('PDA Bump:', bump);   
      setPdaAddress(userProfilePDA.toString());

      // Prepare user type enum
      const userType = sampleData.userType === 'Worker' 
        ? { worker: {} } 
        : { employer: {} };

      // Call create_user_profile instruction
      const tx = await program.methods
        .createUserProfile(
          userType,
          sampleData.name,
          sampleData.phone,
          sampleData.location
        )
        .accounts({
          userProfile: userProfilePDA,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Transaction signature:', tx);
      
      toast.success(
        <div>
          <div className="font-bold">Profile Created!</div>
          <div className="text-xs mt-1">TX: {tx.slice(0, 8)}...</div>
        </div>,
        { id: toastId }
      );

      // Auto-fetch profile after creation
      setTimeout(() => fetchProfile(), 2000);

    } catch (err) {
      console.error('Error creating profile:', err);
      toast.error(err.message || 'Failed to create profile', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Profile Information
  const fetchProfile = async () => {
    if (!wallet.publicKey) {
      toast.error('Please connect your wallet first!');
      return;
    }

    setFetchLoading(true);
    const toastId = toast.loading('Fetching profile...');

    try {
      const provider = getProvider();
      const program = new Program(IDL, PROGRAM_ID_KEY, provider);

      // Derive PDA for user profile
      const [userProfilePDA] = await PublicKey.findProgramAddress(
        [Buffer.from('user_profile'), wallet.publicKey.toBuffer()],
        PROGRAM_ID_KEY
      );

      setPdaAddress(userProfilePDA.toString());

      // Fetch the profile account
      const profile = await program.account.userProfile.fetch(userProfilePDA);
      
      console.log('Fetched profile:', profile);

      // Convert BN to regular numbers for display
      const formattedProfile = {
        authority: profile.authority.toString(),
        userType: profile.userType.worker ? 'Worker' : 'Employer',
        name: profile.name,
        phone: profile.phone,
        location: profile.location,
        rating: profile.rating.toString(),
        totalJobs: profile.totalJobs.toString(),
        totalEarnings: profile.totalEarnings.toString(),
        isActive: profile.isActive,
        createdAt: new Date(profile.createdAt.toNumber() * 1000).toLocaleString()
      };

      setProfileData(formattedProfile);
      toast.success('Profile fetched successfully!', { id: toastId });

    } catch (err) {
      console.error('Error fetching profile:', err);
      
      if (err.message.includes('Account does not exist')) {
        toast.error('Profile not found. Create one first!', { id: toastId });
      } else {
        toast.error(err.message || 'Failed to fetch profile', { id: toastId });
      }
      
      setProfileData(null);
    } finally {
      setFetchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🧪 Profile PDA Test Page
          </h1>
          <p className="text-gray-600">Test Smart Contract Integration</p>
        </div>

        {/* Wallet Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Wallet Status
          </h2>
          {wallet.publicKey ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 font-medium mb-1">
                ✅ Connected
              </p>
              <p className="text-xs text-gray-600 font-mono break-all">
                {wallet.publicKey.toString()}
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">
                ❌ Wallet not connected
              </p>
            </div>
          )}
        </div>

        {/* Sample Data */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            📝 Sample Test Data
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium text-gray-800">{sampleData.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium text-gray-800">{sampleData.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium text-gray-800">{sampleData.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">User Type</p>
              <p className="font-medium text-gray-800">{sampleData.userType}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🚀 Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Create Profile Button */}
            <button
              onClick={createProfile}
              disabled={!wallet.publicKey || loading}
              className={`
                flex items-center justify-center gap-2
                bg-gradient-to-r from-blue-500 to-indigo-600 
                hover:from-blue-600 hover:to-indigo-700
                text-white font-semibold py-4 px-6 rounded-lg
                transition-all transform hover:scale-105
                shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                disabled:transform-none
              `}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  ✨ Create Profile PDA
                </>
              )}
            </button>

            {/* Fetch Profile Button */}
            <button
              onClick={fetchProfile}
              disabled={!wallet.publicKey || fetchLoading}
              className={`
                flex items-center justify-center gap-2
                bg-gradient-to-r from-green-500 to-emerald-600
                hover:from-green-600 hover:to-emerald-700
                text-white font-semibold py-4 px-6 rounded-lg
                transition-all transform hover:scale-105
                shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                disabled:transform-none
              `}
            >
              {fetchLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                <>
                  🔍 Fetch Profile Info
                </>
              )}
            </button>
          </div>
        </div>

        {/* PDA Address Display */}
        {pdaAddress && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              🔑 Generated PDA Address
            </h2>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="font-mono text-sm text-gray-800 break-all mb-3">
                {pdaAddress}
              </p>
              <a
                href={`https://explorer.solana.com/address/${pdaAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                View on Solana Explorer
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* Profile Data Display */}
        {profileData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📊 Profile Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Authority</p>
                <p className="font-mono text-xs text-gray-800 break-all">
                  {profileData.authority}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">User Type</p>
                <p className="font-medium text-gray-800">{profileData.userType}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Name</p>
                <p className="font-medium text-gray-800">{profileData.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Phone</p>
                <p className="font-medium text-gray-800">{profileData.phone}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Location</p>
                <p className="font-medium text-gray-800">{profileData.location}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Rating</p>
                <p className="font-medium text-gray-800">{profileData.rating}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Jobs</p>
                <p className="font-medium text-gray-800">{profileData.totalJobs}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="font-medium text-gray-800">
                  {(parseInt(profileData.totalEarnings) / 1e9).toFixed(4)} SOL
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="font-medium text-gray-800">
                  {profileData.isActive ? '✅ Active' : '❌ Inactive'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Created At</p>
                <p className="font-medium text-gray-800">{profileData.createdAt}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            📖 Instructions
          </h3>
          <ol className="text-gray-700 space-y-2 list-decimal list-inside">
            <li>Make sure your wallet is connected (check App.jsx)</li>
            <li>Ensure you're on Solana DevNet</li>
            <li>Have some DevNet SOL in your wallet</li>
            <li>Click "Create Profile PDA" to create a new profile</li>
            <li>Click "Fetch Profile Info" to retrieve profile data</li>
            <li>View the PDA on Solana Explorer for verification</li>
          </ol>
        </div>
      </div>
    </div>
  );
}