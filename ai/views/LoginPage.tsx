/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

interface LoginPageProps {
    onLogin: (email: string, password: string) => boolean;
    error: string | null;
    setError: (error: string | null) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, error, setError }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        onLogin(email, password);
    };
    
    const handleTestUserClick = (email: string, pass: string) => {
        setEmail(email);
        setPassword(pass);
        onLogin(email, pass);
    }

    return (
        <div className="w-full max-w-md mx-auto animate-fade-in">
            <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-8 shadow-2xl shadow-blue-500/10 backdrop-blur-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-100">Welcome to Devoo</h1>
                    <p className="text-gray-400 mt-2">Log in to access the AI photo editor.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                            Email Address
                        </label>
                        <div className="mt-1">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password"  className="block text-sm font-medium text-gray-300">
                            Password
                        </label>
                        <div className="mt-1">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-in-out"
                        >
                            Log In
                        </button>
                    </div>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-900 text-gray-500">Or use a test account</span>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button onClick={() => handleTestUserClick('bob@example.com', 'password123')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700">
                            User
                        </button>
                         <button onClick={() => handleTestUserClick('alice@example.com', 'adminpassword')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700">
                            Admin
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LoginPage;
