import { integrationEnvironment, cadastrosEnvironment } from './environment'
(process.env.TEST_INTEGRATION_GROUP === 'cadastros' ? cadastrosEnvironment : integrationEnvironment)(process.env)
if (process.env.TEST_RULES_CONFIRMED !== 'yes') throw new Error('Integração bloqueada: confirmar Rules ativas com TEST_RULES_CONFIRMED=yes')
