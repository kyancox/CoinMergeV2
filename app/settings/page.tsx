'use client'

import { useSession } from '@supabase/auth-helpers-react'
import { useState } from 'react'

export default function SettingsPage() {
  const session = useSession()
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [geminiApiSecret, setGeminiApiSecret] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
          
          {session?.user ? (
            <div className="mb-6">
              <p className="text-sm text-gray-600">Logged in as <span className="font-medium">{session.user.email}</span></p>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-sm text-gray-600">Not logged in</p>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-8">
            {/* Coinbase Section */}
            <div className="border-b border-gray-200 pb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Coinbase</h2>
              <p className="text-sm text-gray-600 mb-4">
                Connect your Coinbase account to automatically sync your cryptocurrency balances.
              </p>
              <button
                onClick={connectCoinbase}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Connect Coinbase
              </button>
            </div>

            {/* Gemini Section */}
            <div className="border-b border-gray-200 pb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Gemini</h2>
              <p className="text-sm text-gray-600 mb-4">
                Connect your Gemini account by providing your API credentials. You can create API keys in your Gemini account settings.
              </p>
              
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isConnecting}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConnecting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
              
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Your API credentials are stored securely and encrypted. We recommend creating API keys with read-only permissions for balance checking.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ledger Live Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Ledger Live</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload your Ledger Live CSV export file to import your cryptocurrency balances. You can export this file from Ledger Live under Portfolio → Export.
              </p>
              
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">How to Export from Ledger Live</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open Ledger Live application</li>
                        <li>Go to Portfolio section</li>
                        <li>Click on "Export" or "Export operations"</li>
                        <li>Select CSV format and download the file</li>
                        <li>Upload the downloaded CSV file here</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
