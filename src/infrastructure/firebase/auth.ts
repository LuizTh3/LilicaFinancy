import { onIdTokenChanged, signInWithEmailAndPassword, signOut, validatePassword } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { firebase } from './client'
export const observeAuth = (callback: (user: User | null) => void) => onIdTokenChanged(firebase().auth, callback)
export const login = (email: string, password: string) => signInWithEmailAndPassword(firebase().auth, email.trim(), password)
export const logout = () => signOut(firebase().auth)
export const checkPasswordPolicy = (password: string) => validatePassword(firebase().auth, password)
