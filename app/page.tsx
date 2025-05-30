'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession } from '@supabase/auth-helpers-react'

export default function Home() {
  const session = useSession()

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CM</span>
                </div>
                <span className="text-xl font-bold text-gray-900">CoinMerge</span>
              </div>
            </div>
            <Link
              href={session ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {session ? "Dashboard" : "Sign In"}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative isolate pt-16 pb-16 sm:pt-20 sm:pb-20">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-cyan-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div className="py-16 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
                Track your{' '}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  crypto portfolio
                </span>{' '}
                across exchanges
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl max-w-2xl mx-auto">
                Connect Coinbase, Gemini, and Ledger in one unified dashboard. Get real-time prices, track performance, and export data with ease.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/login"
                  className="group relative inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                >
                  Get Started Free
                  <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <a
                  href="#features"
                  className="text-sm font-semibold leading-6 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Learn more <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="mt-16 sm:mt-20 lg:mt-24">
              <div className="relative mx-auto max-w-5xl">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-cyan-500/20 rounded-2xl blur-2xl"></div>
                <div className="relative bg-white rounded-2xl border border-gray-200 p-2 shadow-2xl ring-1 ring-gray-900/5">
                  <div className="rounded-xl bg-gray-50 p-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">Portfolio Overview</h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                            <div className="text-sm text-blue-600 font-medium">Total Value</div>
                            <div className="text-2xl font-bold text-blue-900">$42,350.67</div>
                            <div className="text-sm text-green-600">+12.3% (24h)</div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                            <div className="text-sm text-green-600 font-medium">Coinbase</div>
                            <div className="text-2xl font-bold text-green-900">$28,450.32</div>
                            <div className="text-sm text-gray-600">67.2% of portfolio</div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                            <div className="text-sm text-purple-600 font-medium">Gemini</div>
                            <div className="text-2xl font-bold text-purple-900">$13,900.35</div>
                            <div className="text-sm text-gray-600">32.8% of portfolio</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {[
                            { coin: 'Bitcoin', symbol: 'BTC', amount: '0.845', value: '$25,400.00', change: '+8.2%' },
                            { coin: 'Ethereum', symbol: 'ETH', amount: '4.2', value: '$12,600.00', change: '+15.1%' },
                            { coin: 'Solana', symbol: 'SOL', amount: '45.8', value: '$4,350.67', change: '+22.5%' }
                          ].map((asset, i) => (
                            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full"></div>
                                <div>
                                  <div className="font-medium text-gray-900">{asset.coin}</div>
                                  <div className="text-sm text-gray-500">{asset.amount} {asset.symbol}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-gray-900">{asset.value}</div>
                                <div className="text-sm text-green-600">{asset.change}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Everything you need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple yet powerful portfolio tracking
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Connect all your exchanges and wallets in minutes. Track performance, analyze trends, and export data for taxes.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {/* Connect */}
              <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 group-hover:scale-110 transition-transform">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  Secure Connections
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    OAuth for Coinbase, API keys for Gemini, and CSV upload for Ledger. Bank-level security with your data always protected.
                  </p>
                </dd>
              </div>

              {/* Real-time */}
              <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-green-700 group-hover:scale-110 transition-transform">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  Real-time Tracking
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Live prices from CoinMarketCap with automatic balance refresh. Always know your exact portfolio value.
                  </p>
                </dd>
              </div>

              {/* Export */}
              <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 group-hover:scale-110 transition-transform">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Export & Analyze
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Download your complete portfolio data to Excel. Perfect for tax reporting, analysis, and record keeping.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Get started in minutes</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Three simple steps
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              No complex setup required. Connect your accounts and start tracking immediately.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-6xl">
            <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-3 lg:gap-x-8">
              {[
                {
                  step: '01',
                  title: 'Connect',
                  description: 'Link your exchanges using secure OAuth or API keys. Upload CSV files for hardware wallets.',
                  icon: (
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  ),
                  bgColor: 'from-blue-500 to-blue-600'
                },
                {
                  step: '02',
                  title: 'Sync',
                  description: 'Your balances are automatically synced and updated with real-time market prices.',
                  icon: (
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ),
                  bgColor: 'from-green-500 to-green-600'
                },
                {
                  step: '03',
                  title: 'Track',
                  description: 'View unified dashboard, filter by exchange, analyze performance, and export when needed.',
                  icon: (
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                  bgColor: 'from-purple-500 to-purple-600'
                }
              ].map((item, index) => (
                <div key={item.step} className="relative">
                  {/* Connection line */}
                  {index < 2 && (
                    <div className="hidden lg:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-gray-200 to-gray-300 -translate-y-1/2"></div>
                  )}
                  
                  <div className="relative flex flex-col items-center text-center">
                    <div className={`relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${item.bgColor} rounded-2xl shadow-lg text-white mb-6`}>
                      {item.icon}
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-700">{item.step}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed max-w-xs">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="m0 .5 32 32M0 31.5 32-.5" stroke="white" strokeOpacity="0.1" fill="none"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to consolidate your portfolio?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Join thousands of crypto investors who track their complete portfolio in one secure dashboard.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-sm font-semibold text-blue-600 shadow-lg hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
              >
                Start Tracking Free
                <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <p className="mt-6 text-sm text-blue-200">
              No credit card required • Free forever • Secure by design
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <Link href="/privacy" className="text-gray-400 hover:text-gray-600 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <a 
              href="https://github.com/yourusername/coinmerge" 
              className="text-gray-400 hover:text-gray-600 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">CM</span>
              </div>
              <p className="text-xs leading-5 text-gray-500">
                Built with Next.js, TypeScript, and Supabase
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
