import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { auth, googleProvider, db, handleFirestoreError, OperationType } from "./config";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        // Sync public profile and private info to Firestore
        try {
          const publicProfileRef = doc(db, "users", user.uid, "public", "profile");
          const publicData: Record<string, any> = {
            displayName: user.displayName || "ReceiptSplit User",
            updatedAt: serverTimestamp(),
          };
          if (user.photoURL) {
            publicData.photoURL = user.photoURL;
          }
          await setDoc(publicProfileRef, publicData, { merge: true });
        } catch (err) {
          console.error("Failed to sync public profile:", err);
          // Non-blocking for auth session
        }

        try {
          const privateInfoRef = doc(db, "users", user.uid, "private", "info");
          const privateSnap = await getDoc(privateInfoRef);
          if (!privateSnap.exists()) {
            await setDoc(privateInfoRef, {
              email: user.email || "",
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error("Failed to sync private info:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err?.message || "Gagal masuk dengan Google.");
      throw err;
    }
  };

  const signOutUser = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Sign-out error:", err);
      setError(err?.message || "Gagal logout.");
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        signInWithGoogle,
        signOutUser,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
