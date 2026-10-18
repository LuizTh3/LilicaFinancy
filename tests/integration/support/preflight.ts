import { environmentForGroup } from './environment'
environmentForGroup(process.env)
if (process.env.TEST_RULES_CONFIRMED !== 'yes') throw new Error('Integração bloqueada: confirmar Rules ativas com TEST_RULES_CONFIRMED=yes')
