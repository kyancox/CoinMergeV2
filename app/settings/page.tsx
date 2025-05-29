'use client'

import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ConnectionStatus {
  coinbase: { connected: boolean; linkedDate?: string }
  gemini: { connected: boolean; linkedDate?: string }
  ledger: { connected: boolean; fileName?: string; uploadDate?: string }
}

export default function SettingsPage() {
  const session = useSession()
  const supabase = useSupabaseClient()
  const router = useRouter()
  
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [geminiApiSecret, setGeminiApiSecret] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showUnlinkModal, setShowUnlinkModal] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    coinbase: { connected: false },
    gemini: { connected: false },
    ledger: { connected: false }
  })

  // Change Password states
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Check connection status on component mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/connections/status')
      if (response.ok) {
        const status = await response.json()
        setConnectionStatus(status)
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
      setMessage({ type: 'error', text: 'Failed to log out. Please try again.' })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await supabase.auth.signOut()
        router.push('/')
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to delete account' })
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setIsDeletingAccount(false)
      setShowDeleteModal(false)
    }
  }

  const handleUnlinkAccount = async (service: string) => {
    try {
      const response = await fetch(`/api/connections/unlink/${service}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: `${service} account unlinked successfully` })
        checkConnectionStatus() // Refresh status
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || `Failed to unlink ${service} account` })
      }
    } catch (error) {
      console.error(`Error unlinking ${service}:`, error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setShowUnlinkModal(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' })
      return
    }

    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long' })
      return
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'New password must be different from current password' })
      return
    }

    setIsChangingPassword(true)
    setMessage(null)

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session?.user?.email || '',
        password: currentPassword,
      })

      if (signInError) {
        setMessage({ type: 'error', text: 'Current password is incorrect' })
        setIsChangingPassword(false)
        return
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        setMessage({ type: 'error', text: updateError.message })
      } else {
        setMessage({ type: 'success', text: 'Password changed successfully!' })
        setShowChangePassword(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
      }
    } catch (error) {
      console.error('Change password error:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const connectCoinbase = () => {
    const clientId = process.env.NEXT_PUBLIC_COINBASE_CLIENT_ID!
    const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_COINBASE_REDIRECT_URI!)
    const scope = 'wallet:accounts:read'
    const responseType = 'code'
    const coinbaseOAuthUrl = `https://www.coinbase.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`

    window.location.href = coinbaseOAuthUrl
  }

  const connectGemini = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!geminiApiKey.trim() || !geminiApiSecret.trim()) {
      setMessage({ type: 'error', text: 'Please enter both API key and secret' })
      return
    }

    setIsConnecting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/gemini/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: geminiApiKey.trim(),
          apiSecret: geminiApiSecret.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Gemini account connected successfully!' })
        setGeminiApiKey('')
        setGeminiApiSecret('')
        checkConnectionStatus()
      } else {
        setMessage({ type: 'error', text: data.details || data.error || 'Failed to connect Gemini account' })
      }
    } catch (error) {
      console.error('Error connecting Gemini:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setMessage({ type: 'error', text: 'Please select a CSV file' })
        return
      }
      setSelectedFile(file)
      setMessage(null)
    }
  }

  const uploadLedgerFile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a CSV file' })
      return
    }

    setIsUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/upload/ledger', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Ledger Live file uploaded successfully!' })
        setSelectedFile(null)
        // Reset the file input
        const fileInput = document.getElementById('ledger-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        checkConnectionStatus()
      } else {
        setMessage({ type: 'error', text: data.details || data.error || 'Failed to upload Ledger Live file' })
      }
    } catch (error) {
      console.error('Error uploading Ledger file:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setIsUploading(false)
    }
  }

  const ConnectionCard = ({ 
    title, 
    description, 
    isConnected, 
    onConnect, 
    onUnlink, 
    onReupload,
    connectLabel, 
    icon,
    children,
    metadata 
  }: {
    title: string
    description: string
    isConnected: boolean
    onConnect?: () => void
    onUnlink?: () => void
    onReupload?: () => void
    connectLabel: string
    icon: React.ReactNode
    children?: React.ReactNode
    metadata?: string
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-gray-500'}`}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
        </div>
        {isConnected && (onUnlink || onReupload) && (
          <div className="flex space-x-2">
            {onReupload && (
              <button
                onClick={onReupload}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                Reupload
              </button>
            )}
            {onUnlink && (
              <button
                onClick={onUnlink}
                className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
              >
                Unlink
              </button>
            )}
          </div>
        )}
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      
      {metadata && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-700">{metadata}</p>
        </div>
      )}
      
      {!isConnected && (
        <div>
          {children}
          {onConnect && (
            <button
              onClick={onConnect}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {connectLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              {session?.user && (
                <p className="text-gray-600 mt-1">
                  Manage your account and connected services
                </p>
              )}
            </div>
            {session?.user && (
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isLoggingOut ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging out...
                  </>
                ) : (
                  'Log Out'
                )}
              </button>
            )}
          </div>
          
          {session?.user && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Signed in as</p>
                  <p className="font-medium text-gray-900">{session.user.email}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Change Password
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Form */}
        {showChangePassword && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isChangingPassword}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isChangingPassword}
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-sm text-gray-500">Must be at least 6 characters long</p>
                </div>

                <div>
                  <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm-new-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isChangingPassword}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false)
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmNewPassword('')
                    setMessage(null)
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isChangingPassword ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Changing Password...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Connected Accounts Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Connected Accounts</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coinbase */}
            <ConnectionCard
              title="Coinbase"
              description="Automatically sync your cryptocurrency balances from Coinbase."
              isConnected={connectionStatus.coinbase.connected}
              onConnect={connectCoinbase}
              onUnlink={() => setShowUnlinkModal('coinbase')}
              connectLabel="Connect Coinbase"
              metadata={connectionStatus.coinbase.connected && connectionStatus.coinbase.linkedDate ? 
                `Linked: ${new Date(connectionStatus.coinbase.linkedDate).toLocaleDateString()}` : 
                undefined
              }
              icon={
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 19.5c-4.142 0-7.5-3.358-7.5-7.5S7.858 4.5 12 4.5s7.5 3.358 7.5 7.5-3.358 7.5-7.5 7.5z"/>
                  </svg>
                </div>
              }
            />

            {/* Gemini */}
            <ConnectionCard
              title="Gemini"
              description="Connect using your API credentials to sync balances from Gemini."
              isConnected={connectionStatus.gemini.connected}
              onUnlink={() => setShowUnlinkModal('gemini')}
              connectLabel="Connect Gemini"
              metadata={connectionStatus.gemini.connected && connectionStatus.gemini.linkedDate ? 
                `Linked: ${new Date(connectionStatus.gemini.linkedDate).toLocaleDateString()}` : 
                undefined
              }
              icon={
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
              }
            >
              {!connectionStatus.gemini.connected && (
                <form onSubmit={connectGemini} className="space-y-4">
                  <div>
                    <label htmlFor="gemini-api-key" className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="text"
                      id="gemini-api-key"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Enter your Gemini API key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isConnecting}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="gemini-api-secret" className="block text-sm font-medium text-gray-700 mb-1">
                      API Secret
                    </label>
                    <input
                      type="password"
                      id="gemini-api-secret"
                      value={geminiApiSecret}
                      onChange={(e) => setGeminiApiSecret(e.target.value)}
                      placeholder="Enter your Gemini API secret"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isConnecting}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isConnecting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </>
                    ) : (
                      'Connect Gemini'
                    )}
                  </button>
                </form>
              )}
            </ConnectionCard>
          </div>
        </div>

        {/* Ledger Live Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Import Data</h2>
          <ConnectionCard
            title="Ledger Live"
            description="Upload your Ledger Live CSV export to import cryptocurrency balances."
            isConnected={connectionStatus.ledger.connected}
            onReupload={() => setShowUnlinkModal('ledger-reupload')}
            connectLabel="Upload CSV File"
            metadata={connectionStatus.ledger.connected ? 
              `${connectionStatus.ledger.fileName ? `File: ${connectionStatus.ledger.fileName}` : ''}${connectionStatus.ledger.fileName && connectionStatus.ledger.uploadDate ? ' • ' : ''}${connectionStatus.ledger.uploadDate ? `Uploaded: ${new Date(connectionStatus.ledger.uploadDate).toLocaleDateString()}` : ''}` : 
              undefined
            }
            icon={
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            }
          >
            {!connectionStatus.ledger.connected && (
              <form onSubmit={uploadLedgerFile} className="space-y-4">
                <div>
                  <label htmlFor="ledger-file" className="block text-sm font-medium text-gray-700 mb-1">
                    CSV File
                  </label>
                  <input
                    type="file"
                    id="ledger-file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    disabled={isUploading}
                  />
                  {selectedFile && (
                    <p className="mt-1 text-sm text-gray-500">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    'Upload Ledger Live CSV'
                  )}
                </button>
              </form>
            )}
          </ConnectionCard>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Need Help?</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <h4 className="font-medium">Gemini API Setup:</h4>
              <p>Create API keys in your Gemini account settings with read-only permissions for balance checking.</p>
            </div>
            <div>
              <h4 className="font-medium">Ledger Live Export:</h4>
              <p>Go to Portfolio → Export in Ledger Live, select CSV format, and upload the downloaded file.</p>
            </div>
            <div>
              <h4 className="font-medium">Security:</h4>
              <p>All API credentials are stored securely and encrypted. We recommend using read-only permissions where possible.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Delete Account</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlink Account Modal */}
      {showUnlinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                {showUnlinkModal === 'ledger-reupload' ? 'Reupload Ledger CSV' : `Unlink ${showUnlinkModal}`}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {showUnlinkModal === 'ledger-reupload' 
                ? 'Upload a new Ledger Live CSV file to replace your current data. This will overwrite your existing Ledger balances.'
                : `Are you sure you want to unlink your ${showUnlinkModal} account? You'll need to reconnect it to sync data again.`
              }
            </p>
            
            {showUnlinkModal === 'ledger-reupload' ? (
              <form onSubmit={uploadLedgerFile} className="space-y-4">
                <div>
                  <label htmlFor="reupload-ledger-file" className="block text-sm font-medium text-gray-700 mb-1">
                    New CSV File
                  </label>
                  <input
                    type="file"
                    id="reupload-ledger-file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    disabled={isUploading}
                  />
                  {selectedFile && (
                    <p className="mt-1 text-sm text-gray-500">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowUnlinkModal(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {isUploading ? 'Uploading...' : 'Reupload CSV'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUnlinkModal(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUnlinkAccount(showUnlinkModal)}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Unlink Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
