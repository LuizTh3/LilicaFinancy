import { useMemo } from 'react'
import { useSession } from '../../app/session/useSession'
import { firebase } from '../../infrastructure/firebase/client'
import { createExternosRepository } from '../../infrastructure/firebase/externosRepository'
export function useExternoRepository(uid:string,generation:number,timezone:string) {
 const {isCurrent}=useSession()
 return useMemo(()=>createExternosRepository(firebase().db,{uid,generation,timezone,atual:()=>firebase().auth.currentUser?.uid===uid&&!!isCurrent?.(generation),token:async()=>{const user=firebase().auth.currentUser;return user?.uid===uid?user.getIdToken():''}}),[uid,generation,timezone,isCurrent])
}
