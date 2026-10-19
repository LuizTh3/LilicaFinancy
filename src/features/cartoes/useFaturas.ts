import { useMemo } from 'react'
import { useSession } from '../../app/session/useSession'
import { firebase } from '../../infrastructure/firebase/client'
import { createFaturasQueries } from '../../infrastructure/firebase/faturasQueries'
import { createFaturasRepository } from '../../infrastructure/firebase/faturasRepository'
export function useFaturas(uid:string,generation:number){const {isCurrent}=useSession();return useMemo(()=>{const ctx={uid,generation,atual:()=>firebase().auth.currentUser?.uid===uid&&!!isCurrent?.(generation)};return {queries:createFaturasQueries(firebase().db,ctx),repo:createFaturasRepository(firebase().db,ctx)}},[uid,generation,isCurrent])}
