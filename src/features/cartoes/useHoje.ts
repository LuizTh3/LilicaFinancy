import { useEffect, useState } from 'react'
import { hojeNoFuso } from '../../domain/finance/calendar'
function today(timezone:string){const r=hojeNoFuso(Date.now(),timezone);return r.ok?r.valor:''}
export function useHoje(timezone:string){const [hoje,setHoje]=useState(()=>today(timezone));useEffect(()=>{const tick=()=>setHoje(today(timezone)),timer=setInterval(tick,60000);window.addEventListener('focus',tick);return()=>{clearInterval(timer);window.removeEventListener('focus',tick)}},[timezone]);return hoje}
