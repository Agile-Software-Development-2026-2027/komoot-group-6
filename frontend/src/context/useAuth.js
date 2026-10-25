import { useContext } from 'react';
import { AuthContext } from './AuthContext.js';

//Legge lo stato del login da qualsiasi componente.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
