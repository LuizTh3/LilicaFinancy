import { useMemo } from 'react'
import { useSession } from '../../app/session/useSession'
import { firebase } from '../../infrastructure/firebase/client'
import { createCartoesRepository } from '../../infrastructure/firebase/cartoesRepository'
export function useCartoesRepository(uid:string,generation:number) {
 const {isCurrent}=useSession()
 return useMemo(()=>createCartoesRepository(firebase().db,{uid,generation,atual:()=>firebase().auth.currentUser?.uid===uid&&!!isCurrent?.(generation)}),[uid,generation,isCurrent])
}
