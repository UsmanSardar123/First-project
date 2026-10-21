import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';

export default function AuthScreen({ onAuthenticated }) {
  const [showSignup, setShowSignup] = useState(false);

  if (showSignup) {
    return (
      <SignupScreen
        onAuthenticated={onAuthenticated}
        onOpenLogin={() => setShowSignup(false)}
      />
    );
  }

  return (
    <LoginScreen
      onAuthenticated={onAuthenticated}
      onOpenSignup={() => setShowSignup(true)}
      
    />
  );
}
