"use client";

import { useRouter } from "next/navigation";
import { TrendingUp, Shield, Users, BarChart3, ArrowRight, CheckCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const router = useRouter();

  const features = [
    {
      icon: TrendingUp,
      title: "Price Hedging",
      description: "Protect your oilseed investments against market volatility with our advanced hedging tools."
    },
    {
      icon: Shield,
      title: "Secure Trading",
      description: "Trade with confidence using our secure, blockchain-verified contract system."
    },
    {
      icon: Users,
      title: "Direct Connection",
      description: "Connect farmers directly with buyers, eliminating middlemen and reducing costs."
    },
    {
      icon: BarChart3,
      title: "Market Analytics",
      description: "Access real-time market data and analytics to make informed trading decisions."
    }
  ];

  const benefits = [
    "Real-time price discovery",
    "Transparent contract execution",
    "Reduced transaction costs",
    "Risk management tools",
    "Quality assurance system",
    "24/7 market access"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Oilseed Platform
              </h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push("/login")}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Revolutionize Your
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Oilseed Trading
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
            Connect farmers and buyers through our secure, transparent platform. 
            Hedge against price volatility and trade with confidence in the oilseed market.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/signup")}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold text-lg transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-2"
            >
              Start Trading Now
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => router.push("/login")}
              className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold text-lg transition-all"
            >
              Login to Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose Our Platform?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Advanced tools and features designed for modern oilseed trading
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 border border-gray-200 dark:border-gray-700"
            >
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg w-fit mb-6">
                <feature.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white dark:bg-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Everything You Need for
                <span className="block text-blue-600">Successful Trading</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Our comprehensive platform provides all the tools and features you need 
                to trade oilseeds efficiently and profitably.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
                <p className="mb-6">
                  Join thousands of farmers and buyers who trust our platform for their oilseed trading needs.
                </p>
                <button
                  onClick={() => router.push("/signup")}
                  className="w-full bg-white text-blue-600 py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Create Your Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">Oilseed Platform</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Empowering the future of oilseed trading through technology and innovation.
            </p>
            <p className="text-sm text-gray-500">
              © 2024 Oilseed Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
