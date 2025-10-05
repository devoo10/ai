/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useEffect } from 'react';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateCombinedImage, generateExpandedImage } from './services/geminiService';
import Header from './components/Header';
import AdminDashboard from './components/AdminDashboard';
import PaywallModal from './components/PaywallModal';
import EditorView from './views/EditorView';
import LoginPage from './views/LoginPage';


// Helper to convert a File to a data URL string
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};


export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  creditsAmount: number;
  price: string;
  screenshotDataUrl: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  password?: string; // Added for login simulation
  credits: number;
  isEnabled: boolean;
  role: 'admin' | 'user';
}

const initialUsers: User[] = [
    { id: 'u001', email: 'alice@example.com', password: 'adminpassword', credits: 999, isEnabled: true, role: 'admin' },
    { id: 'u002', email: 'bob@example.com', password: 'password123', credits: 15, isEnabled: true, role: 'user' },
    { id: 'u003', email: 'charlie@example.com', password: 'password123', credits: 0, isEnabled: true, role: 'user' },
    { id: 'u004', email: 'diana@example.com', password: 'password123', credits: 1, isEnabled: false, role: 'user' },
];


const App: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  
  // App routing state
  const [route, setRoute] = useState(window.location.hash.substring(1));
  
  // Monetization and Admin State
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem('currentUserId'));
  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('appUsers');
    // For this simulation, let's ensure the initial users are always present with their passwords.
    // A real app would fetch this from a server.
    if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        // Quick merge to make sure passwords aren't lost from local storage if they weren't saved before
        return parsedUsers.map((u: User) => ({
            ...u,
            password: initialUsers.find(iu => iu.id === u.id)?.password
        }));
    }
    return initialUsers;
  });

  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('pendingTransactions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const currentUser = users.find(u => u.id === currentUserId);
  
  // Handle routing
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.substring(1));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Secure the admin route
  useEffect(() => {
      if(route === 'admin' && currentUser?.role !== 'admin') {
          console.warn('Access denied: User is not an admin. Redirecting.');
          window.location.hash = '';
      }
      // If user logs out while on admin page, redirect to login
      if(route === 'admin' && !currentUser) {
          window.location.hash = '';
      }
  }, [route, currentUser]);


  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('currentUserId', currentUserId);
    } else {
      localStorage.removeItem('currentUserId');
    }
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem('pendingTransactions', JSON.stringify(pendingTransactions));
  }, [pendingTransactions]);
  
  useEffect(() => {
    // We remove the password before saving to local storage for a slightly better security simulation
    const usersToSave = users.map(({ password, ...user }) => user);
    localStorage.setItem('appUsers', JSON.stringify(usersToSave));
  }, [users]);


  const updateUserCredits = (userId: string, creditChange: number) => {
      setUsers(prevUsers => 
          prevUsers.map(user => 
              user.id === userId ? { ...user, credits: Math.max(0, user.credits + creditChange) } : user
          )
      );
  };
  
  const checkUserCanGenerate = (): boolean => {
      if (!currentUser) {
          setError("You must be logged in to generate images.");
          return false;
      }
      if (!currentUser.isEnabled) {
          setError("Your account has been disabled by an administrator.");
          return false;
      }
      if (currentUser.role !== 'admin' && currentUser.credits <= 0) {
          setShowPaywall(true);
          return false;
      }
      return true;
  }
  
  const handleSubmitForReview = async (creditsAmount: number, price: string, screenshotFile: File) => {
    if (!currentUser) return;
    const screenshotDataUrl = await fileToDataUrl(screenshotFile);
    const newTransaction: Transaction = {
        id: `tx_${Date.now()}`,
        userId: currentUser.id, 
        userEmail: currentUser.email, 
        creditsAmount,
        price,
        screenshotDataUrl,
        timestamp: new Date().toISOString()
    };
    setPendingTransactions(prev => [...prev, newTransaction]);
  };
  
  const handleApproveTransaction = (txId: string, creditsToAdd: number) => {
    const txToApprove = pendingTransactions.find(tx => tx.id === txId);
    if (txToApprove) {
        updateUserCredits(txToApprove.userId, creditsToAdd);
        setPendingTransactions(prev => prev.filter(tx => tx.id !== txId));
    }
  };
  
  const handleRejectTransaction = (txId: string) => {
    setPendingTransactions(prev => prev.filter(tx => tx.id !== txId));
  };
  
  const handleToggleUserStatus = (userId: string) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, isEnabled: !user.isEnabled } : user
      )
    );
  };

  const handleLogin = (email: string, password: string):boolean => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUserId(user.id);
      if (user.role === 'admin') {
        window.location.hash = 'admin';
      }
      setError(null);
      return true;
    } else {
      setError("Invalid email or password.");
      return false;
    }
  }

  const handleLogout = () => {
    setCurrentUserId(null);
    window.location.hash = '';
  }


  const renderAppContent = () => {
    if (!currentUser) {
        return <LoginPage onLogin={handleLogin} error={error} setError={setError} />;
    }

    if (route === 'admin' && currentUser.role === 'admin') {
      return (
        <AdminDashboard 
          users={users}
          pendingTransactions={pendingTransactions}
          onApproveTransaction={handleApproveTransaction}
          onRejectTransaction={handleRejectTransaction}
          onToggleUserStatus={handleToggleUserStatus}
        />
      );
    }

    return (
      <EditorView 
        currentUser={currentUser}
        checkUserCanGenerate={checkUserCanGenerate}
        updateUserCredits={updateUserCredits}
      />
    );
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${currentUser ? 'items-start' : 'items-center'}`}>
        {renderAppContent()}
      </main>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} onSubmitForReview={handleSubmitForReview} />}
    </div>
  );
};

export default App;