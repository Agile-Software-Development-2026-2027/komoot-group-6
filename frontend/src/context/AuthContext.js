import { createContext } from 'react';

// Il contesto che condivide lo stato del login con tutta l'app.
// Lo riempie AuthProvider e lo si legge con useAuth().
export const AuthContext = createContext(null);
